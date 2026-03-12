<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentLink extends Model
{
    protected $fillable = [
        'company_id',
        'client_id',
        'stripe_payment_link_url',
        'short_url',
        'stripe_payment_link_id',
        'amount',
        'description',
        'payment_status',
        'sms_status',
        'sms_sent_at',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'      => 'decimal:2',
            'paid_at'     => 'datetime',
            'sms_sent_at' => 'datetime',
        ];
    }

    protected function serializeDate(\DateTimeInterface $date): string
    {
        return \Carbon\Carbon::instance($date)
            ->setTimezone(config('app.display_timezone'))
            ->toIso8601String();
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function scopeForCompany(Builder $query, int $companyId): Builder
    {
        return $query->where('payment_links.company_id', $companyId);
    }
}
