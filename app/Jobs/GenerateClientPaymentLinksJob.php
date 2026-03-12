<?php

namespace App\Jobs;

use App\Models\Client;
use App\Models\Company;
use App\Models\PaymentLink;
use App\Services\CompanyContext;
use App\Services\PaymentLinkService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GenerateClientPaymentLinksJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 3600;

    public function __construct(
        private readonly array $clientIds,
        private readonly int $companyId,
    ) {}

    public function handle(PaymentLinkService $paymentLinkService, CompanyContext $companyContext): void
    {
        $company  = Company::findOrFail($this->companyId);
        $companyContext->set($company);

        $cacheKey = "payment_links_generating_{$this->companyId}";

        $clientsWithPendingLink = PaymentLink::where('company_id', $this->companyId)
            ->whereIn('client_id', $this->clientIds)
            ->where('payment_status', 'pending')
            ->pluck('client_id')
            ->toArray();

        $eligibleClients = Client::where('company_id', $this->companyId)
            ->whereIn('id', $this->clientIds)
            ->whereNotIn('id', $clientsWithPendingLink)
            ->where(function ($q) {
                $q->where('patient_balance', '>=', 0.50)
                  ->orWhere('outstanding_balance', '>=', 0.50);
            })
            ->pluck('id')
            ->toArray();

        $total = count($eligibleClients);

        Cache::put($cacheKey, [
            'total'      => $total,
            'processed'  => 0,
            'started_at' => now()->toISOString(),
        ], 3600);

        if ($total === 0) {
            Cache::forget($cacheKey);
            return;
        }

        $processed = 0;

        foreach ($eligibleClients as $clientId) {
            $client = Client::where('company_id', $this->companyId)->find($clientId);
            if (! $client) {
                $processed++;
                continue;
            }

            try {
                $patientBal = (float) $client->patient_balance;
                $amount     = $patientBal > 0 ? $patientBal : (float) $client->outstanding_balance;
                $paymentLinkService->store($client, ['amount' => $amount]);
            } catch (\Throwable $e) {
                Log::warning("GenerateClientPaymentLinksJob: client #{$client->id} — " . $e->getMessage());
            }

            $processed++;

            if ($processed % 5 === 0 || $processed === $total) {
                Cache::put($cacheKey, [
                    'total'      => $total,
                    'processed'  => $processed,
                    'started_at' => Cache::get($cacheKey)['started_at'] ?? now()->toISOString(),
                ], 3600);
            }
        }

        Cache::forget($cacheKey);
    }
}
