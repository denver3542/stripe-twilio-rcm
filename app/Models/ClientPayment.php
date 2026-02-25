<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientPayment extends Model
{
    protected $fillable = [
        'client_id',
        'amount_paid',
        'stripe_session_id',
        'stripe_payment_link_id',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_paid' => 'decimal:2',
            'paid_at'     => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
