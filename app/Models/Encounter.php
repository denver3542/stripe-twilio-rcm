<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Encounter extends Model
{
    protected $fillable = [
        'client_id',
        'external_encounter_id',
        'procedure_code',
        'procedure_category',
        'diagnosis_code',
        'encounter_date',
    ];

    protected function casts(): array
    {
        return [
            'encounter_date' => 'date',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
