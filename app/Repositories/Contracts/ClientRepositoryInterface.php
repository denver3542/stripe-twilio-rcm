<?php

namespace App\Repositories\Contracts;

use App\Models\Client;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface ClientRepositoryInterface
{
    public function all(): Collection;

    public function paginate(int $perPage = 15): LengthAwarePaginator;

    public function find(int $id): Client;

    public function create(array $attributes): Client;

    public function update(Client $client, array $attributes): bool;

    public function delete(Client $client): bool;
}
