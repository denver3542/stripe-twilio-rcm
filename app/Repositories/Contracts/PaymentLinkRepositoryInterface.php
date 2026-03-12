<?php

namespace App\Repositories\Contracts;

use App\Models\PaymentLink;
use Illuminate\Support\Collection;

interface PaymentLinkRepositoryInterface
{
    public function create(array $attributes): PaymentLink;

    public function update(PaymentLink $link, array $attributes): bool;

    public function delete(PaymentLink $link): bool;

    /** Unscoped — webhook already verified company via URL slug before calling this. */
    public function findByStripeId(string $stripePaymentLinkId): ?PaymentLink;

    public function forClient(int $clientId): Collection;

    public function totalOutstanding(int $companyId): float;

    public function totalPaidThisMonth(int $companyId): float;

    public function recentPaid(int $limit, int $companyId): Collection;

    public function pendingCount(int $companyId): int;
}
