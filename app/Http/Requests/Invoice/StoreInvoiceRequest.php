<?php

namespace App\Http\Requests\Invoice;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id'    => ['required', 'exists:clients,id'],
            'service_date' => ['required', 'date'],
            'amount_due'   => ['required', 'numeric', 'min:0.01'],
            'notes'        => ['nullable', 'string'],
            'status'       => ['nullable', 'in:unpaid,pending,paid,overdue'],
        ];
    }
}
