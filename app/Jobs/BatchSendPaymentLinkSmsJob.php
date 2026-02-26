<?php

namespace App\Jobs;

use App\Models\PaymentLink;
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
    ) {}

    public function handle(PaymentLinkService $paymentLinkService): void
    {
        $links = PaymentLink::with('client')
            ->whereIn('id', $this->linkIds)
            ->where('payment_status', 'pending')
            ->where('sms_status', 'not_sent')
            ->get();

        $total = $links->count();

        Cache::put('batch_sms_sending', [
            'total'      => $total,
            'processed'  => 0,
            'started_at' => now()->toISOString(),
        ], 3600);

        if ($total === 0) {
            Cache::forget('batch_sms_sending');
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

            Cache::put('batch_sms_sending', [
                'total'      => $total,
                'processed'  => $processed,
                'started_at' => Cache::get('batch_sms_sending')['started_at'] ?? now()->toISOString(),
            ], 3600);
        }

        Cache::forget('batch_sms_sending');
        Log::info("BatchSendPaymentLinkSmsJob: processed {$processed} of {$total} links");
    }
}
