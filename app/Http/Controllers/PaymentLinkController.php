<?php

namespace App\Http\Controllers;

use App\Http\Requests\PaymentLink\StorePaymentLinkRequest;
use App\Jobs\BatchSendPaymentLinkSmsJob;
use App\Jobs\FetchAllPaymentStatusesJob;
use App\Models\Client;
use App\Models\PaymentLink;
use App\Services\CompanyContext;
use App\Services\PaymentLinkService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PaymentLinkController extends Controller
{
    public function __construct(
        private readonly PaymentLinkService $paymentLinkService,
        private readonly CompanyContext $companyContext,
    ) {}

    public function index(Request $request): Response
    {
        $companyId     = $this->companyContext->getId();
        $batchCacheKey = "batch_sms_sending_{$companyId}";

        $search       = trim((string) $request->input('search'));
        $status       = $request->input('status');
        $smsStatus    = $request->input('sms_status');
        $amountRange  = $request->input('amount_range');
        $smsSentFrom  = $request->input('sms_sent_from');
        $smsSentTo    = $request->input('sms_sent_to');

        $allowedSorts = ['created_at', 'amount', 'payment_status', 'sms_status', 'sms_sent_at', 'paid_at', 'client_name'];
        $sort = in_array($request->input('sort'), $allowedSorts) ? $request->input('sort') : 'created_at';
        $dir  = $request->input('direction') === 'asc' ? 'asc' : 'desc';

        if ($sort === 'client_name') {
            $query = PaymentLink::with('client')
                ->join('clients', 'clients.id', '=', 'payment_links.client_id')
                ->select('payment_links.*')
                ->where('payment_links.company_id', $companyId)
                ->orderByRaw("COALESCE(clients.last_name, clients.name, '') {$dir}")
                ->orderByRaw("COALESCE(clients.first_name, '') {$dir}");
        } else {
            $query = PaymentLink::with('client')
                ->where('payment_links.company_id', $companyId)
                ->orderBy($sort, $dir);
        }

        if ($status) {
            $query->where('payment_links.payment_status', $status);
        }

        if ($smsStatus) {
            $query->where('payment_links.sms_status', $smsStatus);
        }

        $displayTz = config('app.display_timezone');

        if ($smsSentFrom) {
            $query->where('payment_links.sms_sent_at', '>=', \Carbon\Carbon::parse($smsSentFrom, $displayTz)->startOfDay()->utc());
        }

        if ($smsSentTo) {
            $query->where('payment_links.sms_sent_at', '<=', \Carbon\Carbon::parse($smsSentTo, $displayTz)->endOfDay()->utc());
        }

        if ($search) {
            $query->whereHas('client', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('external_patient_id', 'like', "%{$search}%");
            });
        }

        if ($amountRange) {
            if (str_ends_with($amountRange, '+')) {
                $query->where('payment_links.amount', '>=', (float) rtrim($amountRange, '+'));
            } else {
                [$min, $max] = explode('-', $amountRange);
                $query->whereBetween('payment_links.amount', [(float) $min, (float) $max]);
            }
        }

        // Batch computation — always unsent+pending for this company
        $batchBase = PaymentLink::where('company_id', $companyId)
            ->where('sms_status', 'not_sent')
            ->where('payment_status', 'pending')
            ->whereHas('client', fn ($q) => $q->where('exclude_from_payment_links', false));

        if ($search) {
            $batchBase->whereHas('client', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('external_patient_id', 'like', "%{$search}%");
            });
        }

        if ($amountRange) {
            if (str_ends_with($amountRange, '+')) {
                $batchBase->where('amount', '>=', (float) rtrim($amountRange, '+'));
            } else {
                [$min, $max] = explode('-', $amountRange);
                $batchBase->whereBetween('amount', [(float) $min, (float) $max]);
            }
        }

        $unsentCount  = (clone $batchBase)->count();
        $totalBatches = max(1, (int) ceil($unsentCount / 160));
        $currentBatch = max(1, min((int) $request->input('batch', 1), $totalBatches));
        $batchOffset  = ($currentBatch - 1) * 160;

        $nextBatchIds = (clone $batchBase)
            ->orderBy('id')->skip($batchOffset)->take(160)->pluck('id')->toArray();

        $batchExplicit = $request->has('batch');

        if ($batchExplicit && !empty($nextBatchIds)) {
            $query->whereIn('payment_links.id', $nextBatchIds);
        }

        // Stats scoped to active company
        $stats = [
            'total'                => PaymentLink::where('company_id', $companyId)->count(),
            'paid'                 => PaymentLink::where('company_id', $companyId)->where('payment_status', 'paid')->count(),
            'pending'              => PaymentLink::where('company_id', $companyId)->where('payment_status', 'pending')->count(),
            'expired'              => PaymentLink::where('company_id', $companyId)->where('payment_status', 'expired')->count(),
            'failed'               => PaymentLink::where('company_id', $companyId)->where('payment_status', 'failed')->count(),
            'sms_sent'             => PaymentLink::where('company_id', $companyId)->where('sms_status', 'sent')->count(),
            'sms_not_sent'         => PaymentLink::where('company_id', $companyId)->where('sms_status', 'not_sent')->count(),
            'sms_failed'           => PaymentLink::where('company_id', $companyId)->where('sms_status', 'failed')->count(),
            'total_paid_amount'    => (float) PaymentLink::where('company_id', $companyId)->where('payment_status', 'paid')->sum('amount'),
            'total_pending_amount' => (float) PaymentLink::where('company_id', $companyId)->where('payment_status', 'pending')->sum('amount'),
        ];

        return Inertia::render('PaymentLinks/Index', [
            'links'          => $query->paginate(25)->withQueryString(),
            'filters'        => $request->only(['status', 'sms_status', 'search', 'amount_range']),
            'unsent_count'   => $unsentCount,
            'total_batches'  => $totalBatches,
            'current_batch'  => $currentBatch,
            'batch_explicit' => $batchExplicit,
            'next_batch_ids' => $nextBatchIds,
            'sending'        => Cache::get($batchCacheKey),
            'stats'          => $stats,
        ]);
    }

    public function store(StorePaymentLinkRequest $request, Client $client): RedirectResponse
    {
        try {
            $this->paymentLinkService->store($client, $request->validated());
            return redirect()->back()->with('success', 'Payment link created successfully.');
        } catch (\Throwable $e) {
            Log::error("Failed to create payment link for client #{$client->id}: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to create payment link. Please try again.');
        }
    }

    public function sendSms(PaymentLink $paymentLink): RedirectResponse
    {
        try {
            $this->paymentLinkService->sendSms($paymentLink);
            return redirect()->back()->with('success', 'SMS sent successfully.');
        } catch (\Throwable $e) {
            Log::error("Failed to send SMS for PaymentLink #{$paymentLink->id}: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to send SMS. Please try again.');
        }
    }

    public function batchSendSms(Request $request): RedirectResponse
    {
        $request->validate([
            'link_ids'   => ['required', 'array', 'min:1', 'max:160'],
            'link_ids.*' => ['integer', 'exists:payment_links,id'],
        ]);

        $companyId = $this->companyContext->getId();

        $eligible = PaymentLink::where('company_id', $companyId)
            ->whereIn('id', $request->link_ids)
            ->where('payment_status', 'pending')
            ->where('sms_status', 'not_sent')
            ->count();

        if ($eligible === 0) {
            return redirect()->back()->with('error', 'No eligible payment links in the selected batch.');
        }

        BatchSendPaymentLinkSmsJob::dispatch($request->link_ids, $companyId);

        return redirect()->back()->with('success', "Queued SMS for up to {$eligible} payment links.");
    }

    public function fetchStatus(PaymentLink $paymentLink): RedirectResponse
    {
        try {
            $result = $this->paymentLinkService->fetchStatus($paymentLink);

            $message = match ($result['status']) {
                'paid'    => 'Payment confirmed — marked as paid.',
                'expired' => 'Payment link has expired.',
                'pending' => 'No payment found yet — still pending.',
                'skipped' => 'Skipped: no Stripe link ID.',
                default   => $result['message'],
            };

            $flashKey = in_array($result['status'], ['paid', 'expired']) ? 'success' : 'info';

            return redirect()->back()->with($flashKey, $message);
        } catch (\Throwable $e) {
            Log::error("fetchStatus controller error for link #{$paymentLink->id}: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to fetch status from Stripe.');
        }
    }

    public function fetchAllStatuses(): RedirectResponse
    {
        $companyId = $this->companyContext->getId();

        $pending = PaymentLink::where('company_id', $companyId)
            ->where('payment_status', 'pending')
            ->whereNotNull('stripe_payment_link_id')
            ->count();

        if ($pending === 0) {
            return redirect()->back()->with('info', 'No pending payment links to check.');
        }

        FetchAllPaymentStatusesJob::dispatch($companyId);

        return redirect()->back()->with('success', "Queued status check for {$pending} pending payment links. Refresh in a moment.");
    }

    public function destroy(PaymentLink $paymentLink): RedirectResponse
    {
        $this->paymentLinkService->destroy($paymentLink);
        return redirect()->back()->with('success', 'Payment link deleted.');
    }
}