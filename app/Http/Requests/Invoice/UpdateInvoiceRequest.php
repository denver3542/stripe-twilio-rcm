<?php

namespace App\Http\Requests\Invoice;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id'    => ['sometimes', 'required', 'exists:clients,id'],
            'service_date' => ['sometimes', 'required', 'date'],
            'amount_due'   => ['sometimes', 'required', 'numeric', 'min:0.01'],
            'amount_paid'  => ['nullable', 'numeric', 'min:0'],
            'notes'        => ['nullable', 'string'],
            'status'       => ['nullable', 'in:unpaid,pending,paid,overdue'],
        ];
    }
}
