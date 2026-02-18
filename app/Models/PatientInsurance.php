<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientInsurance extends Model
{
    protected $fillable = [
        'client_id',
        'type',
        'company_name',
        'plan_name',
        'address_line1',
        'address_line2',
        'city',
        'state',
        'country',
        'zip_code',
        'policy_number',
        'group_number',
        'effective_start_date',
        'effective_end_date',
        'insured_relationship',
        'insured_full_name',
        'insured_id_number',
    ];

    protected function casts(): array
    {
        return [
            'effective_start_date' => 'date',
            'effective_end_date'   => 'date',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
