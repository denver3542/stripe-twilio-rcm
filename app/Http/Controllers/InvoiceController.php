<?php

namespace App\Http\Controllers;

use App\Http\Requests\Invoice\StoreInvoiceRequest;
use App\Http\Requests\Invoice\UpdateInvoiceRequest;
use App\Models\Client;
use App\Models\Invoice;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use App\Services\InvoiceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
        private readonly InvoiceRepositoryInterface $invoices,
    ) {}

    public function index(Request $request): Response
    {
        $query = Invoice::with('client');

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                         ->orWhere('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $query->orderByDesc('created_at');

        return Inertia::render('Invoices/Index', [
            'invoices' => $query->paginate(20)->withQueryString(),
            'filters'  => $request->only(['search', 'status']),
        ]);
    }

    public function create(Request $request): Response
    {
        $clients = Client::query()
            ->select('id', 'name', 'first_name', 'last_name', 'phone', 'mobile_phone', 'email', 'patient_balance', 'outstanding_balance', 'account_status')
            ->orderByRaw("COALESCE(last_name, name, '') ASC")
            ->orderByRaw("COALESCE(first_name, '') ASC")
            ->get();

        return Inertia::render('Invoices/Create', [
            'clients'   => $clients,
            'preselect' => $request->integer('client_id') ?: null,
        ]);
    }

    public function store(StoreInvoiceRequest $request): RedirectResponse
    {
        $invoice = $this->invoiceService->store($request->validated());

        return redirect()->route('invoices.show', $invoice);
    }

    public function show(Invoice $invoice): Response
    {
        $invoice->load(['client', 'smsLogs' => function ($query) {
            $query->orderByDesc('sent_at');
        }]);

        return Inertia::render('Invoices/Show', [
            'invoice' => $invoice,
            'status'  => session('status'),
        ]);
    }

    public function edit(Invoice $invoice): Response
    {
        $clients = Client::query()
            ->select('id', 'name', 'first_name', 'last_name', 'phone', 'mobile_phone', 'email', 'patient_balance', 'outstanding_balance', 'account_status')
            ->orderByRaw("COALESCE(last_name, name, '') ASC")
            ->orderByRaw("COALESCE(first_name, '') ASC")
            ->get();

        return Inertia::render('Invoices/Edit', [
            'invoice' => $invoice->load('client'),
            'clients' => $clients,
        ]);
    }

    public function update(UpdateInvoiceRequest $request, Invoice $invoice): RedirectResponse
    {
        $this->invoiceService->update($invoice, $request->validated());

        return redirect()->route('invoices.show', $invoice);
    }

    public function destroy(Invoice $invoice): RedirectResponse
    {
        $this->invoiceService->destroy($invoice);

        return redirect()->route('invoices.index');
    }

    public function createPaymentLink(Invoice $invoice): RedirectResponse
    {
        $this->invoiceService->createPaymentLink($invoice, config('app.url'));

        return back()->with('status', 'Payment link generated successfully.');
    }

    public function sendSms(Invoice $invoice): RedirectResponse
    {
        $invoice->load('client');
        $log = $this->invoiceService->sendPaymentSms($invoice);

        $message = $log->status === 'sent'
            ? 'SMS sent successfully.'
            : 'SMS failed: ' . $log->error_message;

        return back()->with('status', $message);
    }
}
