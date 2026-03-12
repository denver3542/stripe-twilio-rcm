<?php

namespace App\Jobs;

use App\Models\Client;
use App\Models\Company;
use App\Models\PaymentLink;
use App\Services\CompanyContext;
use App\Services\CompanyServiceFactory;
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
        private readonly int $companyId,
    ) {}

    public function handle(
        PaymentLinkService $paymentLinkService,
        CompanyContext $companyContext,
        CompanyServiceFactory $factory,
    ): void {
        $company = Company::findOrFail($this->companyId);
        $companyContext->set($company);

        $client = Client::where('company_id', $this->companyId)->find($this->clientId);

        if (! $client) {
            Log::warning("SendPaymentLinkSmsJob: client #{$this->clientId} not found for company #{$this->companyId}.");
            return;
        }

        $link = PaymentLink::where('client_id', $client->id)
            ->where('company_id', $this->companyId)
            ->where('payment_status', 'pending')
            ->latest()
            ->first();

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

        $normalizedPhone = $this->normalizePhone($this->phone);
        $firstName   = $client->first_name ?? '';
        $lastName    = $client->last_name  ?? '';
        $name        = trim($client->name ?? "{$firstName} {$lastName}") ?: 'there';
        $companyName = $company->name;

        $body = "{$companyName}: Hi {$name}, you have an outstanding balance of \${$link->amount}. "
            . "Please make your payment here: {$link->stripe_payment_link_url}\n\nReply STOP to opt out.";

        $result = $factory->makeTwilio($company)->sendSms($normalizedPhone, $body);

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
