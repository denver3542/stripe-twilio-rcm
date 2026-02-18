<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'invoice_number',
        'service_date',
        'amount_due',
        'amount_paid',
        'status',
        'notes',
        'stripe_payment_link',
        'stripe_checkout_session_id',
    ];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
            'amount_due'   => 'decimal:2',
            'amount_paid'  => 'decimal:2',
        ];
    }

    public static function generateNumber(): string
    {
        return 'INV-' . now()->format('Ymd') . '-' . str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function smsLogs(): HasMany
    {
        return $this->hasMany(SmsLog::class);
    }
}
