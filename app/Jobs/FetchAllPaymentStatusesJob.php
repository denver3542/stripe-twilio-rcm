<?php

namespace App\Jobs;

use App\Models\PaymentLink;
use App\Services\PaymentLinkService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FetchAllPaymentStatusesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 1;
    public int $timeout = 600;

    public function handle(PaymentLinkService $paymentLinkService): void
    {
        $links = PaymentLink::where('payment_status', 'pending')
            ->whereNotNull('stripe_payment_link_id')
            ->get();

        $paid    = 0;
        $expired = 0;

        foreach ($links as $link) {
            $result = $paymentLinkService->fetchStatus($link);

            if ($result['status'] === 'paid')    $paid++;
            if ($result['status'] === 'expired') $expired++;

            // Small delay to stay well within Stripe's rate limits (100 req/s)
            usleep(100_000); // 0.1s
        }

        Log::info("FetchAllPaymentStatusesJob: checked {$links->count()} links — {$paid} paid, {$expired} expired");
    }
}
