<?php

namespace App\Http\Controllers;

use App\Http\Requests\Client\StoreClientRequest;
use App\Http\Requests\Client\UpdateClientRequest;
use App\Jobs\GenerateClientPaymentLinksJob;
use App\Jobs\SendPaymentLinkSmsJob;
use App\Models\Client;
use App\Models\PaymentLink;
use App\Services\ClientService;
use App\Services\CompanyContext;
use App\Services\CompanyServiceFactory;
use App\Services\PaymentLinkService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function __construct(
        private readonly ClientService $clientService,
        private readonly CompanyContext $companyContext,
    ) {}

    public function index(Request $request): Response
    {
        $companyId = $this->companyContext->getId();
        $cacheKey  = "payment_links_generating_{$companyId}";

        $query = Client::query()->where('company_id', $companyId);

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('mobile_phone', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('external_patient_id', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('account_status', $status);
        }

        if ($linkStatus = $request->input('link_status')) {
            $query->whereHas('paymentLinks', fn ($q) => $q->where('payment_status', $linkStatus));
        }

        if ($linkSmsStatus = $request->input('link_sms_status')) {
            $query->whereHas('paymentLinks', fn ($q) => $q->where('sms_status', $linkSmsStatus));
        }

        if ($amountRange = $request->input('amount_range')) {
            $effectiveBal = DB::raw('CASE WHEN patient_balance > 0 THEN patient_balance ELSE outstanding_balance END');
            if (str_ends_with($amountRange, '+')) {
                $min = (float) rtrim($amountRange, '+');
                $query->where($effectiveBal, '>=', $min);
            } else {
                [$min, $max] = explode('-', $amountRange);
                $query->whereBetween($effectiveBal, [(float) $min, (float) $max]);
            }
        }

        $query->orderByRaw("COALESCE(last_name, name, '') ASC")
              ->orderByRaw("COALESCE(first_name, '') ASC");

        return Inertia::render('Clients/Index', [
            'clients'    => $query->withCount(['paymentLinks as pending_links_count' => fn ($q) => $q->where('payment_status', 'pending')])->paginate(20)->withQueryString(),
            'filters'    => (object) array_filter($request->only(['search', 'status', 'link_status', 'link_sms_status', 'amount_range', 'sort', 'direction']), fn ($v) => $v !== null),
            'generating' => Cache::get($cacheKey),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Clients/Create');
    }

    public function store(StoreClientRequest $request): RedirectResponse
    {
        $client = $this->clientService->store(
            array_merge($request->validated(), ['company_id' => $this->companyContext->getId()])
        );

        return redirect()->route('clients.show', $client);
    }

    public function show(Client $client): Response
    {
        $client->load([
            'paymentLinks',
            'patientInsurances',
            'patientAuthorizations',
            'encounters'            => fn ($q) => $q->orderByDesc('encounter_date'),
            'clientPayments',
        ]);

        return Inertia::render('Clients/Show', [
            'client' => $client,
        ]);
    }

    public function edit(Client $client): Response
    {
        return Inertia::render('Clients/Edit', [
            'client' => $client,
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client): RedirectResponse
    {
        $this->clientService->update($client, $request->validated());

        return redirect()->route('clients.show', $client);
    }

    public function destroy(Client $client): RedirectResponse
    {
        $this->clientService->destroy($client);

        return redirect()->route('clients.index');
    }

    public function generateAllPaymentLinks(): RedirectResponse
    {
        $companyId = $this->companyContext->getId();
        $cacheKey  = "payment_links_generating_{$companyId}";

        $clientIds = Client::where('company_id', $companyId)
            ->whereDoesntHave('paymentLinks', function ($q) {
                $q->where('payment_status', 'pending');
            })
            ->where(function ($q) {
                $q->where('patient_balance', '>=', 0.50)
                  ->orWhere('outstanding_balance', '>=', 0.50);
            })
            ->pluck('id')
            ->toArray();

        if (empty($clientIds)) {
            return redirect()->back()->with('success', 'All eligible clients already have pending payment links.');
        }

        $count = count($clientIds);

        Cache::put($cacheKey, [
            'total'      => $count,
            'processed'  => 0,
            'started_at' => now()->toISOString(),
        ], 3600);

        GenerateClientPaymentLinksJob::dispatch($clientIds, $companyId);

        return redirect()->back()->with(
            'success',
            "Queued payment link generation for {$count} " . ($count === 1 ? 'client' : 'clients') . '.'
        );
    }

    public function cancelPaymentLinkGeneration(): RedirectResponse
    {
        $companyId = $this->companyContext->getId();
        $cacheKey  = "payment_links_generating_{$companyId}";

        $deleted = DB::table('jobs')
            ->where('payload', 'like', '%GenerateClientPaymentLinksJob%')
            ->delete();

        Cache::forget($cacheKey);

        $msg = $deleted > 0
            ? 'Payment link generation cancelled.'
            : 'Generation was already finishing — progress cleared.';

        return redirect()->back()->with('success', $msg);
    }

    public function batchSendSms(Request $request): RedirectResponse
    {
        $request->validate([
            'client_ids'   => ['required', 'array', 'min:1'],
            'client_ids.*' => ['integer', 'exists:clients,id'],
        ]);

        $companyId = $this->companyContext->getId();

        $clients = Client::where('company_id', $companyId)
            ->whereIn('id', $request->client_ids)
            ->where(function ($q) {
                $q->whereNotNull('phone')->orWhereNotNull('mobile_phone');
            })
            ->get();

        $dispatched = 0;
        foreach ($clients as $client) {
            $phone = $client->mobile_phone ?? $client->phone;
            if ($phone) {
                SendPaymentLinkSmsJob::dispatch($client->id, $phone, $companyId);
                $dispatched++;
            }
        }

        return redirect()->back()->with(
            'success',
            "Queued SMS for {$dispatched} " . ($dispatched === 1 ? 'client' : 'clients') . '.'
        );
    }

    public function sendToPhone(Request $request, Client $client): RedirectResponse
    {
        $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+?[\d\s\-().]{7,20}$/'],
        ]);

        $companyId = $this->companyContext->getId();

        $link = PaymentLink::where('client_id', $client->id)
            ->where('company_id', $companyId)
            ->where('payment_status', 'pending')
            ->latest()
            ->first();

        if (! $link) {
            $patientBal = (float) $client->patient_balance;
            $amount = $patientBal > 0 ? $patientBal : (float) $client->outstanding_balance;
            if ($amount < 0.50) {
                return redirect()->back()->with('error', 'No payment link available for this client.');
            }
            try {
                $link = app(PaymentLinkService::class)->store($client, ['amount' => $amount]);
            } catch (\Throwable $e) {
                return redirect()->back()->with('error', 'Failed to generate payment link.');
            }
        }

        $firstName   = $client->first_name ?? '';
        $lastName    = $client->last_name  ?? '';
        $name        = trim($client->name ?? "{$firstName} {$lastName}") ?: 'there';
        $companyName = $this->companyContext->getName();

        $phone = $this->normalizePhone($request->phone);
        $body  = "{$companyName}: Hi {$name}, you have an outstanding balance of \${$link->amount}. "
            . "Please make your payment here: {$link->stripe_payment_link_url}\n\nReply STOP to opt out.";

        app(CompanyServiceFactory::class)
            ->makeTwilio($this->companyContext->get())
            ->sendSms($phone, $body);

        return redirect()->back()->with('success', "Payment link sent to {$request->phone}.");
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if (strlen($digits) === 10) {
            return '+1' . $digits;
        }

        if (strlen($digits) === 11 && str_starts_with($digits, '1')) {
            return '+' . $digits;
        }

        return '+' . $digits;
    }
}