<?php

namespace App\Http\Requests\PaymentLink;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount'      => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
