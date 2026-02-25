<?php

namespace App\Services;

use App\Models\Client;
use App\Models\PaymentLink;
use App\Repositories\Contracts\PaymentLinkRepositoryInterface;
use Illuminate\Support\Carbon;
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

        $firstName = $client->first_name ?? '';
        $lastName  = $client->last_name  ?? '';
        $name      = trim($client->name ?? "{$firstName} {$lastName}") ?: "Patient #{$client->id}";

        $body = "Hi {$name}, you have an outstanding balance of \${$link->amount}. "
            . "Please make your payment here: {$link->stripe_payment_link_url}\n\nReply STOP to opt out.";

        $result = $this->twilio->sendSms($phone, $body);

        $this->paymentLinks->update($link, [
            'sms_status' => $result['status'] === 'sent' ? 'sent' : 'failed',
            'sms_sent_at' => Carbon::now(),
        ]);

        if ($result['status'] !== 'sent') {
            Log::warning("SMS failed for PaymentLink #{$link->id}: " . ($result['error'] ?? 'unknown error'));
        }
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
