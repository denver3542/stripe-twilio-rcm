<?php

namespace App\Repositories\Contracts;

use App\Models\PaymentLink;
use Illuminate\Support\Collection;

interface PaymentLinkRepositoryInterface
{
    public function create(array $attributes): PaymentLink;

    public function update(PaymentLink $link, array $attributes): bool;

    public function delete(PaymentLink $link): bool;

    public function findByStripeId(string $stripePaymentLinkId): ?PaymentLink;

    public function forClient(int $clientId): Collection;

    public function totalOutstanding(): float;

    public function totalPaidThisMonth(): float;

    public function recentPaid(int $limit): Collection;

    public function pendingCount(): int;
}
