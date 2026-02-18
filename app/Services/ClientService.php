<?php

namespace App\Services;

use App\Models\Client;
use App\Repositories\Contracts\ClientRepositoryInterface;

class ClientService
{
    public function __construct(
        private readonly ClientRepositoryInterface $clients,
    ) {}

    public function store(array $validated): Client
    {
        $validated['outstanding_balance'] ??= 0;

        return $this->clients->create($validated);
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
