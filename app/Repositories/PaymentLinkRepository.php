<?php

namespace App\Repositories;

use App\Models\PaymentLink;
use App\Repositories\Contracts\PaymentLinkRepositoryInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class PaymentLinkRepository implements PaymentLinkRepositoryInterface
{
    public function create(array $attributes): PaymentLink
    {
        return PaymentLink::create($attributes);
    }

    public function update(PaymentLink $link, array $attributes): bool
    {
        return $link->update($attributes);
    }

    public function delete(PaymentLink $link): bool
    {
        return $link->delete();
    }

    public function findByStripeId(string $stripePaymentLinkId): ?PaymentLink
    {
        return PaymentLink::where('stripe_payment_link_id', $stripePaymentLinkId)->first();
    }

    public function forClient(int $clientId): Collection
    {
        return PaymentLink::where('client_id', $clientId)
            ->latest()
            ->get();
    }

    public function totalOutstanding(): float
    {
        return (float) PaymentLink::where('payment_status', 'pending')
            ->sum('amount');
    }

    public function totalPaidThisMonth(): float
    {
        return (float) PaymentLink::where('payment_status', 'paid')
            ->whereBetween('paid_at', [
                Carbon::now()->startOfMonth(),
                Carbon::now()->endOfMonth(),
            ])
            ->sum('amount');
    }

    public function recentPaid(int $limit): Collection
    {
        return PaymentLink::with('client')
            ->where('payment_status', 'paid')
            ->orderByDesc('paid_at')
            ->limit($limit)
            ->get();
    }

    public function pendingCount(): int
    {
        return PaymentLink::where('payment_status', 'pending')->count();
    }
}
