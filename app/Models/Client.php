<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        // Original fields
        'name',
        'contact_name',
        'phone',
        'email',
        'outstanding_balance',
        'insurance_info',
        'account_status',

        // Imported demographics
        'external_patient_id',
        'prefix',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'ssn',
        'date_of_birth',
        'gender',
        'medical_record_number',
        'marital_status',
        'employment_status',
        'employer_name',
        'referral_source',
        'insurance_type_name',

        // Address
        'address_line1',
        'address_line2',
        'city',
        'state',
        'country',
        'zip_code',

        // Phone breakdown
        'home_phone',
        'work_phone',
        'mobile_phone',

        // Care team & location
        'rendering_provider',
        'primary_care_physician',
        'referring_provider',
        'service_location',
        'payer_scenario',

        // Financial summary
        'collection_category',
        'charges',
        'adjustments',
        'insurance_payments',
        'patient_payments',
        'insurance_balance',
        'patient_balance',
    ];

    protected function casts(): array
    {
        return [
            'outstanding_balance' => 'decimal:2',
            'charges'             => 'decimal:2',
            'adjustments'         => 'decimal:2',
            'insurance_payments'  => 'decimal:2',
            'patient_payments'    => 'decimal:2',
            'insurance_balance'   => 'decimal:2',
            'patient_balance'     => 'decimal:2',
            'date_of_birth'       => 'date',
        ];
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function patientInsurances(): HasMany
    {
        return $this->hasMany(PatientInsurance::class);
    }

    public function patientAuthorizations(): HasMany
    {
        return $this->hasMany(PatientAuthorization::class);
    }

    public function encounters(): HasMany
    {
        return $this->hasMany(Encounter::class);
    }
}
