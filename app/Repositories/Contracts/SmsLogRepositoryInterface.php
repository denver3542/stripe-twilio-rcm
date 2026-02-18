<?php

namespace App\Repositories\Contracts;

use App\Models\SmsLog;
use Illuminate\Database\Eloquent\Collection;

interface SmsLogRepositoryInterface
{
    public function create(array $attributes): SmsLog;

    public function logsForInvoice(int $invoiceId): Collection;
}
