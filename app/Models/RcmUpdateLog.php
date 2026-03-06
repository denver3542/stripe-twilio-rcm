<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RcmUpdateLog extends Model
{
    protected $fillable = [
        'client_id',
        'patient_id',
        'event',
        'status',
        'triggered_by',
        'http_status',
        'request_payload',
        'response_body',
        'error_message',
        'retried',
    ];

    protected $casts = [
        'request_payload' => 'array',
        'retried'         => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
