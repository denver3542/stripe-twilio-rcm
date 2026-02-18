<?php

namespace App\Repositories\Contracts;

use App\Models\Invoice;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface InvoiceRepositoryInterface
{
    public function allForClient(int $clientId): Collection;

    public function paginate(int $perPage = 15): LengthAwarePaginator;

    public function find(int $id): Invoice;

    public function create(array $attributes): Invoice;

    public function update(Invoice $invoice, array $attributes): bool;

    public function delete(Invoice $invoice): bool;

    public function findByStripeSession(string $sessionId): ?Invoice;

    public function totalOutstanding(): float;

    public function totalCollectedThisMonth(): float;

    public function recentPayments(int $limit = 5): Collection;

    public function needsActionCount(): int;
}
