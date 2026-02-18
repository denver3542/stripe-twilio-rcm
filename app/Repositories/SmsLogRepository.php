<?php

namespace App\Repositories;

use App\Models\SmsLog;
use App\Repositories\Contracts\SmsLogRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class SmsLogRepository implements SmsLogRepositoryInterface
{
    public function create(array $attributes): SmsLog
    {
        return SmsLog::query()->create($attributes);
    }

    public function logsForInvoice(int $invoiceId): Collection
    {
        return SmsLog::query()
            ->where('invoice_id', $invoiceId)
            ->orderByDesc('sent_at')
            ->get();
    }
}
