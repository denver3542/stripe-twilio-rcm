<?php

namespace App\Repositories;

use App\Models\Invoice;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class InvoiceRepository implements InvoiceRepositoryInterface
{
    public function allForClient(int $clientId): Collection
    {
        return Invoice::query()
            ->where('client_id', $clientId)
            ->orderByDesc('created_at')
            ->get();
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return Invoice::query()
            ->with('client')
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function find(int $id): Invoice
    {
        return Invoice::query()->findOrFail($id);
    }

    public function create(array $attributes): Invoice
    {
        return Invoice::query()->create($attributes);
    }

    public function update(Invoice $invoice, array $attributes): bool
    {
        return $invoice->fill($attributes)->save();
    }

    public function delete(Invoice $invoice): bool
    {
        return (bool) $invoice->delete();
    }

    public function findByStripeSession(string $sessionId): ?Invoice
    {
        return Invoice::query()
            ->where('stripe_checkout_session_id', $sessionId)
            ->first();
    }

    public function totalOutstanding(): float
    {
        return (float) Invoice::query()
            ->whereIn('status', ['unpaid', 'pending', 'overdue'])
            ->selectRaw('COALESCE(SUM(amount_due - amount_paid), 0) as total')
            ->value('total');
    }

    public function totalCollectedThisMonth(): float
    {
        return (float) Invoice::query()
            ->where('status', 'paid')
            ->whereBetween('updated_at', [
                Carbon::now()->startOfMonth(),
                Carbon::now()->endOfMonth(),
            ])
            ->sum('amount_paid');
    }

    public function recentPayments(int $limit = 5): Collection
    {
        return Invoice::query()
            ->with('client')
            ->where('status', 'paid')
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get();
    }

    public function needsActionCount(): int
    {
        return Invoice::query()
            ->whereIn('status', ['unpaid', 'overdue'])
            ->count();
    }
}
