<?php

namespace App\Http\Controllers;

use App\Http\Requests\Client\StoreClientRequest;
use App\Http\Requests\Client\UpdateClientRequest;
use App\Jobs\GenerateClientPaymentLinksJob;
use App\Jobs\SendPaymentLinkSmsJob;
use App\Models\Client;
use App\Models\PaymentLink;
use App\Services\ClientService;
use App\Services\PaymentLinkService;
use App\Services\TwilioService;
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
    ) {}

    public function index(Request $request): Response
    {
        $query = Client::query();

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

        $query->orderByRaw("COALESCE(last_name, name, '') ASC")
              ->orderByRaw("COALESCE(first_name, '') ASC");

        return Inertia::render('Clients/Index', [
            'clients'    => $query->withCount(['paymentLinks as pending_links_count' => fn ($q) => $q->where('payment_status', 'pending')])->paginate(20)->withQueryString(),
            'filters'    => $request->only(['search', 'status']),
            'generating' => Cache::get('payment_links_generating'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Clients/Create');
    }

    public function store(StoreClientRequest $request): RedirectResponse
    {
        $client = $this->clientService->store($request->validated());

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
        $clientIds = Client::whereDoesntHave('paymentLinks', function ($q) {
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

        // Set initial progress so the UI can show it immediately
        Cache::put('payment_links_generating', [
            'total'      => $count,
            'processed'  => 0,
            'started_at' => now()->toISOString(),
        ], 3600);

        GenerateClientPaymentLinksJob::dispatch($clientIds);
        return redirect()->back()->with(
            'success',
            "Queued payment link generation for {$count} " . ($count === 1 ? 'client' : 'clients') . '.'
        );
    }

    public function cancelPaymentLinkGeneration(): RedirectResponse
    {
        // Remove any queued (not yet reserved) jobs for this class
        $deleted = DB::table('jobs')
            ->where('payload', 'like', '%GenerateClientPaymentLinksJob%')
            ->delete();

        Cache::forget('payment_links_generating');

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

        $clients = Client::whereIn('id', $request->client_ids)
            ->whereNotNull('phone')
            ->orWhereNotNull('mobile_phone')
            ->get();

        $dispatched = 0;
        foreach ($clients as $client) {
            $phone = $client->mobile_phone ?? $client->phone;
            if ($phone) {
                SendPaymentLinkSmsJob::dispatch($client->id, $phone);
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

        // Find most recent pending payment link, or generate one
        $link = PaymentLink::where('client_id', $client->id)
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

        $firstName = $client->first_name ?? '';
        $lastName  = $client->last_name  ?? '';
        $name      = trim($client->name ?? "{$firstName} {$lastName}") ?: 'there';

        $phone = $this->normalizePhone($request->phone);
        $body  = "Hi {$name}, you have an outstanding balance of \${$link->amount}. "
            . "Please make your payment here: {$link->stripe_payment_link_url}\n\nReply STOP to opt out.";

        app(TwilioService::class)->sendSms($phone, $body);

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
