<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientPayment;
use App\Services\PaymentLinkService;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;

class StripeWebhookController extends Controller
{
    public function __construct(
        private readonly StripeService $stripeService,
        private readonly PaymentLinkService $paymentLinkService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $payload   = $request->getContent();
        $signature = $request->header('Stripe-Signature', '');

        try {
            $event = $this->stripeService->constructWebhookEvent($payload, $signature);
        } catch (SignatureVerificationException $e) {
            Log::error('Stripe webhook signature verification failed: ' . $e->getMessage());
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $session = $event->data->object;

        Log::info("Stripe webhook received: {$event->type}");

        match ($event->type) {
            'checkout.session.completed' => $this->handleSessionCompleted($session),
            default                      => null,
        };

        return response()->json(['received' => true]);
    }

    private function handleSessionCompleted(object $session): void
    {
        // Mark the PaymentLink record as paid (matched by Stripe payment link ID)
        $stripePaymentLinkId = is_string($session->payment_link)
            ? $session->payment_link
            : ($session->payment_link->id ?? null);

        if ($stripePaymentLinkId) {
            Log::info("Webhook: marking PaymentLink paid", ['stripe_id' => $stripePaymentLinkId]);
            $this->paymentLinkService->markPaid($stripePaymentLinkId);
        } else {
            Log::warning("Webhook: checkout.session.completed has no payment_link", ['session' => $session->id]);
        }

        // Record client payment and reduce balance
        $metadata = $session->metadata ?? null;
        if ($metadata && isset($metadata->client_id)) {
            $this->recordClientPayment($session, (int) $metadata->client_id);
        } else {
            Log::warning("Webhook: no client_id in session metadata", ['session' => $session->id]);
        }
    }

    private function recordClientPayment(object $session, int $clientId): void
    {
        $client = Client::find($clientId);

        if (! $client) {
            return;
        }

        // Guard against duplicate webhook deliveries
        if (ClientPayment::where('stripe_session_id', $session->id)->exists()) {
            return;
        }

        $amountPaid = $session->amount_total / 100;
        $paidAt     = Carbon::createFromTimestamp($session->created);

        DB::transaction(function () use ($client, $session, $amountPaid, $paidAt) {
            ClientPayment::create([
                'client_id'              => $client->id,
                'amount_paid'            => $amountPaid,
                'stripe_session_id'      => $session->id,
                'stripe_payment_link_id' => $session->payment_link ?? null,
                'paid_at'                => $paidAt,
            ]);

            // Reduce the client's balance by the amount paid
            $patientBal = (float) $client->patient_balance;
            if ($patientBal > 0) {
                $client->update(['patient_balance' => max(0, $patientBal - $amountPaid)]);
            } else {
                $outstandingBal = (float) $client->outstanding_balance;
                $client->update(['outstanding_balance' => max(0, $outstandingBal - $amountPaid)]);
            }

            // Refresh to get updated balances, then mark account as paid if fully cleared
            $client->refresh();
            if ((float) $client->patient_balance <= 0 && (float) $client->outstanding_balance <= 0) {
                $client->update(['account_status' => 'paid']);
                Log::info("Webhook: client #{$client->id} balance fully cleared — status set to 'paid'");
            }

            Log::info("Webhook: recorded payment for client #{$client->id}", ['amount' => $amountPaid]);
        });
    }
}
