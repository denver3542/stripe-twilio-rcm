<?php

namespace App\Http\Controllers;

use App\Http\Requests\PaymentLink\StorePaymentLinkRequest;
use App\Jobs\BatchSendPaymentLinkSmsJob;
use App\Jobs\FetchAllPaymentStatusesJob;
use App\Models\Client;
use App\Models\PaymentLink;
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
    ) {}

    public function index(Request $request): Response
    {
        $query = PaymentLink::with('client')->latest();

        if ($status = $request->input('status')) {
            $query->where('payment_status', $status);
        }

        if ($smsStatus = $request->input('sms_status')) {
            $query->where('sms_status', $smsStatus);
        }

        if ($search = trim((string) $request->input('search'))) {
            $query->whereHas('client', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('external_patient_id', 'like', "%{$search}%");
            });
        }

        $unsentCount  = PaymentLink::where('sms_status', 'not_sent')->where('payment_status', 'pending')->count();
        $nextBatchIds = PaymentLink::where('sms_status', 'not_sent')->where('payment_status', 'pending')
            ->orderBy('id')->limit(160)->pluck('id')->toArray();

        return Inertia::render('PaymentLinks/Index', [
            'links'          => $query->paginate(25)->withQueryString(),
            'filters'        => $request->only(['status', 'sms_status', 'search']),
            'unsent_count'   => $unsentCount,
            'next_batch_ids' => $nextBatchIds,
            'sending'        => Cache::get('batch_sms_sending'),
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

        $eligible = PaymentLink::whereIn('id', $request->link_ids)
            ->where('payment_status', 'pending')
            ->where('sms_status', 'not_sent')
            ->count();

        if ($eligible === 0) {
            return redirect()->back()->with('error', 'No eligible payment links in the selected batch.');
        }

        BatchSendPaymentLinkSmsJob::dispatch($request->link_ids);

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
        $pending = PaymentLink::where('payment_status', 'pending')
            ->whereNotNull('stripe_payment_link_id')
            ->count();

        if ($pending === 0) {
            return redirect()->back()->with('info', 'No pending payment links to check.');
        }

        FetchAllPaymentStatusesJob::dispatch();

        return redirect()->back()->with('success', "Queued status check for {$pending} pending payment links. Refresh in a moment.");
    }

    public function destroy(PaymentLink $paymentLink): RedirectResponse
    {
        $this->paymentLinkService->destroy($paymentLink);
        return redirect()->back()->with('success', 'Payment link deleted.');
    }
}
