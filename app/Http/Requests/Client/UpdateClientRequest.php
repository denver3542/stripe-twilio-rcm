<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                => ['required', 'string', 'max:255'],
            'contact_name'        => ['nullable', 'string', 'max:255'],
            'phone'               => ['required', 'string', 'max:30'],
            'email'               => ['required', 'email', 'max:255', Rule::unique('clients')->ignore($this->route('client'))],
            'outstanding_balance' => ['nullable', 'numeric', 'min:0'],
            'insurance_info'      => ['nullable', 'string'],
            'account_status'      => ['required', 'in:active,inactive,pending,paid'],
        ];
    }
}
