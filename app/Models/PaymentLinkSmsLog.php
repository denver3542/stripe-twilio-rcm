<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentLinkSmsLog extends Model
{
    protected $fillable = [
        'payment_link_id',
        'client_id',
        'batch_id',
        'phone_number',
        'sms_body',
        'status',
        'message_sid',
        'error_message',
        'triggered_by',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function paymentLink(): BelongsTo
    {
        return $this->belongsTo(PaymentLink::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
