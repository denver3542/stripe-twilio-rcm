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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class GenerateClientPaymentLinksJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 3600; // 1 hour — large imports can take a while

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

        $eligibleClients = Client::whereIn('id', $this->clientIds)
            ->whereNotIn('id', $clientsWithPendingLink)
            ->where(function ($q) {
                $q->where('patient_balance', '>=', 0.50)
                  ->orWhere('outstanding_balance', '>=', 0.50);
            })
            ->pluck('id')
            ->toArray();

        $total = count($eligibleClients);

        // Initialise the progress cache so the frontend can track it
        Cache::put('payment_links_generating', [
            'total'      => $total,
            'processed'  => 0,
            'started_at' => now()->toISOString(),
        ], 3600);

        if ($total === 0) {
            Cache::forget('payment_links_generating');
            return;
        }

        $processed = 0;

        foreach ($eligibleClients as $clientId) {
            $client = Client::find($clientId);
            if (! $client) {
                $processed++;
                continue;
            }

            try {
                $patientBal = (float) $client->patient_balance;
                $amount = $patientBal > 0 ? $patientBal : (float) $client->outstanding_balance;
                $paymentLinkService->store($client, ['amount' => $amount]);
            } catch (\Throwable $e) {
                Log::warning("GenerateClientPaymentLinksJob: client #{$client->id} — " . $e->getMessage());
            }

            $processed++;

            // Update progress every 5 clients to avoid excessive cache writes
            if ($processed % 5 === 0 || $processed === $total) {
                Cache::put('payment_links_generating', [
                    'total'      => $total,
                    'processed'  => $processed,
                    'started_at' => Cache::get('payment_links_generating')['started_at'] ?? now()->toISOString(),
                ], 3600);
            }
        }

        Cache::forget('payment_links_generating');
    }
}
