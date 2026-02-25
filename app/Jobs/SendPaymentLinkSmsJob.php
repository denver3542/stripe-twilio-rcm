<?php

namespace App\Jobs;

use App\Models\Client;
use App\Models\PaymentLink;
use App\Services\PaymentLinkService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendPaymentLinkSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 30;

    public function __construct(
        private readonly int $clientId,
        private readonly string $phone,
    ) {}

    public function handle(PaymentLinkService $paymentLinkService): void
    {
        $client = Client::find($this->clientId);

        if (! $client) {
            Log::warning("SendPaymentLinkSmsJob: client #{$this->clientId} not found.");
            return;
        }

        // Find the most recent pending payment link for this client
        $link = PaymentLink::where('client_id', $client->id)
            ->where('payment_status', 'pending')
            ->latest()
            ->first();

        // Generate one on-the-fly if none exists
        if (! $link) {
            $patientBal = (float) $client->patient_balance;
            $amount = $patientBal > 0 ? $patientBal : (float) $client->outstanding_balance;
            if ($amount < 0.50) {
                Log::warning("SendPaymentLinkSmsJob: no balance for client #{$this->clientId}, skipping.");
                return;
            }
            try {
                $link = $paymentLinkService->store($client, ['amount' => $amount]);
            } catch (\Throwable $e) {
                Log::warning("SendPaymentLinkSmsJob: could not generate link for client #{$this->clientId}: " . $e->getMessage());
                return;
            }
        }

        // Override the phone on the link's client temporarily so sendSms uses the correct number
        $client->setRelation('_smsPhone', $this->phone);

        // Build and send SMS directly (reuse normalized phone from this job)
        $normalizedPhone = $this->normalizePhone($this->phone);
        $firstName = $client->first_name ?? '';
        $lastName  = $client->last_name  ?? '';
        $name      = trim($client->name ?? "{$firstName} {$lastName}") ?: 'there';
        $body      = "Hi {$name}, you have an outstanding balance of \${$link->amount}. "
            . "Please make your payment here: {$link->stripe_payment_link_url}\n\nReply STOP to opt out.";

        // Resolve TwilioService directly since we need a custom phone
        $twilio = app(\App\Services\TwilioService::class);
        $result = $twilio->sendSms($normalizedPhone, $body);

        if ($result['status'] === 'failed') {
            Log::warning("SendPaymentLinkSmsJob: SMS failed for client #{$this->clientId}: " . ($result['error'] ?? ''));
        }
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
