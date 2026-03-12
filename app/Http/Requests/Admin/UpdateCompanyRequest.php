<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin ?? false;
    }

    public function rules(): array
    {
        $companyId = $this->route('company')?->id;

        return [
            'name'              => ['required', 'string', 'max:120'],
            'address'           => ['nullable', 'string', 'max:500'],
            'phone'             => ['nullable', 'string', 'max:30'],
            'email'             => ['nullable', 'email', 'max:120'],
            'website'           => ['nullable', 'url', 'max:255'],
            'stripe_config_key' => [
                'required', 'string', 'max:60', 'alpha_dash', 'uppercase',
                Rule::unique('companies', 'stripe_config_key')->ignore($companyId),
            ],
            'twilio_config_key' => ['required', 'string', 'max:60', 'alpha_dash', 'uppercase'],
            'is_active'         => ['boolean'],
        ];
    }
}
