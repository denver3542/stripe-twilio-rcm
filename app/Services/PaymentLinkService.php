<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\PaymentLink;
use App\Repositories\Contracts\PaymentLinkRepositoryInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentLinkService
{
    public function __construct(
        private readonly PaymentLinkRepositoryInterface $paymentLinks,
        private readonly StripeService $stripe,
        private readonly TwilioService $twilio,
    ) {}

    public function store(Client $client, array $validated): PaymentLink
    {
        $amountCents = (int) round((float) $validated['amount'] * 100);
        $description = $validated['description'] ?? null;

        $stripeLink = $this->stripe->createPaymentLink($client, $amountCents, $description);

        return $this->paymentLinks->create([
            'client_id'               => $client->id,
            'stripe_payment_link_url' => $stripeLink->url,
            'stripe_payment_link_id'  => $stripeLink->id,
            'amount'                  => $validated['amount'],
            'description'             => $description,
            'payment_status'          => 'pending',
            'sms_status'              => 'not_sent',
        ]);
    }

    public function markPaid(string $stripePaymentLinkId): void
    {
        $link = $this->paymentLinks->findByStripeId($stripePaymentLinkId);

        if ($link && $link->payment_status !== 'paid') {
            $this->paymentLinks->update($link, [
                'payment_status' => 'paid',
                'paid_at'        => Carbon::now(),
            ]);
        }
    }

    public function sendSms(PaymentLink $link): void
    {
        $client = $link->client;
        $phone  = $this->normalizePhone(
            $client->mobile_phone ?? $client->phone ?? ''
        );

        $firstName = trim($client->first_name ?? '') ?: trim($client->name ?? '') ?: "Patient #{$client->id}";

        $body = "True Sport PT: Hi {$firstName}, you have a \${$link->amount} balance due. "
            . "Pay here: {$link->stripe_payment_link_url}. "
            . "Questions? Call 443 249 2990. Thank you!";

        $result = $this->twilio->sendSms($phone, $body);

        $this->paymentLinks->update($link, [
            'sms_status' => $result['status'] === 'sent' ? 'sent' : 'failed',
            'sms_sent_at' => Carbon::now(),
        ]);

        if ($result['status'] !== 'sent') {
            Log::warning("SMS failed for PaymentLink #{$link->id}: " . ($result['error'] ?? 'unknown error'));
        }
    }

    /**
     * Query Stripe for the real-time status of a payment link and sync it locally.
     *
     * Returns an array with 'status' (paid|expired|pending|skipped|error) and 'message'.
     */
    public function fetchStatus(PaymentLink $link): array
    {
        if (! $link->stripe_payment_link_id) {
            return ['status' => 'skipped', 'message' => 'No Stripe payment link ID.'];
        }

        if ($link->payment_status === 'paid') {
            return ['status' => 'paid', 'message' => 'Already marked as paid.'];
        }

        try {
            $sessions = $this->stripe->getCheckoutSessionsForPaymentLink($link->stripe_payment_link_id);
        } catch (\Throwable $e) {
            Log::error("fetchStatus: Stripe API error for link #{$link->id}: " . $e->getMessage());
            return ['status' => 'error', 'message' => 'Stripe API error: ' . $e->getMessage()];
        }

        foreach ($sessions as $session) {
            if ($session->payment_status === 'paid') {
                $this->paymentLinks->update($link, [
                    'payment_status' => 'paid',
                    'paid_at'        => Carbon::now(),
                ]);

                $this->maybeRecordClientPayment($link, $session);

                return ['status' => 'paid', 'message' => 'Payment confirmed and marked as paid.'];
            }
        }

        // If any session has status=expired and no paid session was found
        foreach ($sessions as $session) {
            if ($session->status === 'expired') {
                $this->paymentLinks->update($link, ['payment_status' => 'expired']);
                return ['status' => 'expired', 'message' => 'Payment link has expired.'];
            }
        }

        return ['status' => 'pending', 'message' => 'No completed payment found.'];
    }

    private function maybeRecordClientPayment(PaymentLink $link, object $session): void
    {
        // Guard against duplicate records
        if (ClientPayment::where('stripe_session_id', $session->id)->exists()) {
            return;
        }

        $client = $link->client;
        if (! $client) {
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

            $patientBal = (float) $client->patient_balance;
            if ($patientBal > 0) {
                $newPatientBal = max(0, $patientBal - $amountPaid);
                $client->update(['patient_balance' => $newPatientBal]);
            } else {
                $outstandingBal = (float) $client->outstanding_balance;
                $client->update(['outstanding_balance' => max(0, $outstandingBal - $amountPaid)]);
            }

            // Refresh to get updated balances, then mark account as paid if fully cleared
            $client->refresh();
            if ((float) $client->patient_balance <= 0 && (float) $client->outstanding_balance <= 0) {
                $client->update(['account_status' => 'paid']);
                Log::info("fetchStatus: client #{$client->id} balance fully cleared — status set to 'paid'");
            }

            Log::info("fetchStatus: recorded payment for client #{$client->id}", ['amount' => $amountPaid]);
        });
    }

    public function destroy(PaymentLink $link): bool
    {
        return $this->paymentLinks->delete($link);
    }

    public function dashboardStats(): array
    {
        return [
            'total_outstanding'      => $this->paymentLinks->totalOutstanding(),
            'total_paid_this_month'  => $this->paymentLinks->totalPaidThisMonth(),
            'recent_paid'            => $this->paymentLinks->recentPaid(5),
            'pending_count'          => $this->paymentLinks->pendingCount(),
        ];
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) === 10) return '+1' . $digits;
        if (strlen($digits) === 11 && str_starts_with($digits, '1')) return '+' . $digits;
        return '+' . $digits;
    }
}
