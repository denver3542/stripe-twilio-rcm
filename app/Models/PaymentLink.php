<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentLink extends Model
{
    protected $fillable = [
        'client_id',
        'stripe_payment_link_url',
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

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
