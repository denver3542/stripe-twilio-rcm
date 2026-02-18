<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientAuthorization extends Model
{
    protected $fillable = [
        'client_id',
        'auth_number',
        'insurance_plan_name',
        'number_of_visits',
        'number_of_visits_used',
        'contact_fullname',
        'contact_phone',
        'notes',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'start_date'            => 'date',
            'end_date'              => 'date',
            'number_of_visits'      => 'integer',
            'number_of_visits_used' => 'integer',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
