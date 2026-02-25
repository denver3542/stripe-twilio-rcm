<?php

namespace App\Services;

use App\Models\Client;
use App\Repositories\Contracts\ClientRepositoryInterface;
use Illuminate\Support\Facades\Log;

class ClientService
{
    public function __construct(
        private readonly ClientRepositoryInterface $clients,
        private readonly PaymentLinkService $paymentLinks,
    ) {}

    public function store(array $validated): Client
    {
        $validated['outstanding_balance'] ??= 0;

        $client = $this->clients->create($validated);

        $this->generatePaymentLink($client);

        return $client;
    }

    public function generatePaymentLink(Client $client): void
    {
        $patientBal = (float) $client->patient_balance;
        $amount = $patientBal > 0 ? $patientBal : (float) $client->outstanding_balance;

        if ($amount < 0.50) {
            return;
        }

        try {
            $this->paymentLinks->store($client, ['amount' => $amount]);
        } catch (\Throwable $e) {
            Log::warning("Failed to generate payment link for client #{$client->id}: " . $e->getMessage());
        }
    }

    public function update(Client $client, array $validated): bool
    {
        return $this->clients->update($client, $validated);
    }

    public function destroy(Client $client): bool
    {
        return $this->clients->delete($client);
    }
}
