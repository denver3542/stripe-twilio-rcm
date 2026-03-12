<?php

namespace App\Jobs;

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

class BatchSendPaymentLinkSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 1;
    public int $timeout = 600;

    public function __construct(
        private readonly array $linkIds,
        private readonly int $companyId,
    ) {}

    public function handle(PaymentLinkService $paymentLinkService, CompanyContext $companyContext): void
    {
        $company = Company::findOrFail($this->companyId);
        $companyContext->set($company);

        $cacheKey = "batch_sms_sending_{$this->companyId}";

        $links = PaymentLink::with('client')
            ->where('company_id', $this->companyId)
            ->whereIn('id', $this->linkIds)
            ->where('payment_status', 'pending')
            ->where('sms_status', 'not_sent')
            ->get();

        $total = $links->count();

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

        foreach ($links as $link) {
            try {
                $paymentLinkService->sendSms($link);
            } catch (\Throwable $e) {
                Log::warning("BatchSendPaymentLinkSmsJob: link #{$link->id} — " . $e->getMessage());
            }

            $processed++;

            Cache::put($cacheKey, [
                'total'      => $total,
                'processed'  => $processed,
                'started_at' => Cache::get($cacheKey)['started_at'] ?? now()->toISOString(),
            ], 3600);
        }

        Cache::forget($cacheKey);
        Log::info("BatchSendPaymentLinkSmsJob: processed {$processed} of {$total} links for company #{$this->companyId}");
    }
}
