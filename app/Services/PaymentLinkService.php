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
        private readonly CompanyServiceFactory $factory,
        private readonly CompanyContext $companyContext,
    ) {}

    private function stripe(): StripeService
    {
        return $this->factory->makeStripe($this->companyContext->get());
    }

    private function twilio(): TwilioService
    {
        return $this->factory->makeTwilio($this->companyContext->get());
    }

    public function store(Client $client, array $validated): PaymentLink
    {
        $amountCents = (int) round((float) $validated['amount'] * 100);
        $description = $validated['description'] ?? null;

        $stripeLink = $this->stripe()->createPaymentLink($client, $amountCents, $description);

        return $this->paymentLinks->create([
            'company_id'              => $this->companyContext->getId(),
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

        $firstName   = trim($client->first_name ?? '') ?: trim($client->name ?? '') ?: "Patient #{$client->id}";
        $companyName = $this->companyContext->getName();
        $companyPhone = $this->companyContext->get()->phone ?? '';

        $body = "{$companyName}: Hi {$firstName}, you have a \${$link->amount} balance due. "
            . "Pay here: {$link->stripe_payment_link_url}. "
            . ($companyPhone ? "Questions? Call {$companyPhone}. " : '')
            . "Thank you!";

        $sentAt = Carbon::now();

        if (! $phone) {
            $this->paymentLinks->update($link, [
                'sms_status'  => 'failed',
                'sms_sent_at' => $sentAt,
            ]);

            PaymentLinkSmsLog::create([
                'company_id'      => $this->companyContext->getId(),
                'payment_link_id' => $link->id,
                'client_id'       => $client->id,
                'batch_id'        => $batchId,
                'phone_number'    => null,
                'sms_body'        => $body,
                'status'          => 'skipped',
                'error_message'   => 'Client has no phone number on file.',
                'triggered_by'    => $triggeredBy,
                'sent_at'         => $sentAt,
            ]);

            Log::warning("SMS skipped for PaymentLink #{$link->id}: no phone number.");
            return;
        }

        $result = $this->twilio()->sendSms($phone, $body);
        $status = $result['status'] === 'sent' ? 'sent' : 'failed';

        $this->paymentLinks->update($link, [
            'sms_status' => $result['status'] === 'sent' ? 'sent' : 'failed',
            'sms_sent_at' => Carbon::now(),
        ]);

        PaymentLinkSmsLog::create([
            'company_id'      => $this->companyContext->getId(),
            'payment_link_id' => $link->id,
            'client_id'       => $client->id,
            'batch_id'        => $batchId,
            'phone_number'    => $phone,
            'sms_body'        => $body,
            'status'          => $status,
            'message_sid'     => $result['sid'] ?? null,
            'error_message'   => $result['error'] ?? null,
            'triggered_by'    => $triggeredBy,
            'sent_at'         => $sentAt,
        ]);

        if ($status !== 'sent') {
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
            $sessions = $this->stripe()->getCheckoutSessionsForPaymentLink($link->stripe_payment_link_id);
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
        if (ClientPayment::where('stripe_session_id', $session->id)->exists()) {
            return;
        }

        $client = $link->client;
        if (! $client) {
            return;
        }

        $amountPaid = $session->amount_total / 100;
        $paidAt     = Carbon::createFromTimestamp($session->created);
        $companyId  = $this->companyContext->getId();

        DB::transaction(function () use ($client, $session, $amountPaid, $paidAt, $companyId) {
            ClientPayment::create([
                'company_id'             => $companyId,
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
        $companyId = $this->companyContext->getId();

        return [
            'total_outstanding'     => $this->paymentLinks->totalOutstanding($companyId),
            'total_paid_this_month' => $this->paymentLinks->totalPaidThisMonth($companyId),
            'recent_paid'           => $this->paymentLinks->recentPaid(5, $companyId),
            'pending_count'         => $this->paymentLinks->pendingCount($companyId),
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