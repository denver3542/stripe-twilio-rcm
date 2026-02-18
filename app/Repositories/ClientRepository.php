<?php

namespace App\Repositories;

use App\Models\Client;
use App\Repositories\Contracts\ClientRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class ClientRepository implements ClientRepositoryInterface
{
    public function all(): Collection
    {
        return Client::query()->orderBy('name')->get();
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return Client::query()->orderBy('name')->paginate($perPage);
    }

    public function find(int $id): Client
    {
        return Client::query()->findOrFail($id);
    }

    public function create(array $attributes): Client
    {
        return Client::query()->create($attributes);
    }

    public function update(Client $client, array $attributes): bool
    {
        return $client->fill($attributes)->save();
    }

    public function delete(Client $client): bool
    {
        return (bool) $client->delete();
    }
}
