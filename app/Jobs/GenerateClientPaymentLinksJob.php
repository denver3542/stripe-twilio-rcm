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

class GenerateClientPaymentLinksJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 300;

    public function __construct(
        private readonly array $clientIds,
    ) {}

    public function handle(PaymentLinkService $paymentLinkService): void
    {
        // Load clients with a balance that don't yet have a pending PaymentLink
        $clientsWithPendingLink = PaymentLink::whereIn('client_id', $this->clientIds)
            ->where('payment_status', 'pending')
            ->pluck('client_id')
            ->toArray();

        Client::whereIn('id', $this->clientIds)
            ->whereNotIn('id', $clientsWithPendingLink)
            ->where(function ($q) {
                $q->where('patient_balance', '>=', 0.50)
                  ->orWhere('outstanding_balance', '>=', 0.50);
            })
            ->each(function (Client $client) use ($paymentLinkService) {
                try {
                    $patientBal = (float) $client->patient_balance;
                    $amount = $patientBal > 0 ? $patientBal : (float) $client->outstanding_balance;
                    $paymentLinkService->store($client, ['amount' => $amount]);
                } catch (\Throwable $e) {
                    Log::warning("GenerateClientPaymentLinksJob: client #{$client->id} — " . $e->getMessage());
                }
            });

        Cache::forget('payment_links_generating');
    }
}
