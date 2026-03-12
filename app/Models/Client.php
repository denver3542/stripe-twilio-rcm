<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        // Multi-tenant
        'company_id',

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

        // Stripe payment link
        'payment_link',
        'stripe_payment_link_id',

        // Payment link exclusion
        'exclude_from_payment_links',
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
            'patient_balance'             => 'decimal:2',
            'date_of_birth'               => 'date',
            'exclude_from_payment_links'  => 'boolean',
        ];
    }

    public function paymentLinks(): HasMany
    {
        return $this->hasMany(PaymentLink::class)->latest();
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

    public function clientPayments(): HasMany
    {
        return $this->hasMany(ClientPayment::class)->orderByDesc('paid_at');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function scopeForCompany(Builder $query, int $companyId): Builder
    {
        return $query->where('clients.company_id', $companyId);
    }
}
