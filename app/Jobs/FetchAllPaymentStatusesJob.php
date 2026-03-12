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
use Illuminate\Support\Facades\Log;

class FetchAllPaymentStatusesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 1;
    public int $timeout = 600;

    public function __construct(
        private readonly int $companyId,
    ) {}

    public function handle(PaymentLinkService $paymentLinkService, CompanyContext $companyContext): void
    {
        $company = Company::findOrFail($this->companyId);
        $companyContext->set($company);

        $links = PaymentLink::where('company_id', $this->companyId)
            ->where('payment_status', 'pending')
            ->whereNotNull('stripe_payment_link_id')
            ->get();

        $paid    = 0;
        $expired = 0;

        foreach ($links as $link) {
            $result = $paymentLinkService->fetchStatus($link);

            if ($result['status'] === 'paid')    $paid++;
            if ($result['status'] === 'expired') $expired++;

            usleep(100_000); // 0.1s — stay within Stripe's rate limits
        }

        Log::info("FetchAllPaymentStatusesJob [company #{$this->companyId}]: checked {$links->count()} links — {$paid} paid, {$expired} expired");
    }
}
