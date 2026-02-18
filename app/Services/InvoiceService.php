<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\SmsLog;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use App\Repositories\Contracts\SmsLogRepositoryInterface;
use Illuminate\Support\Carbon;

class InvoiceService
{
    public function __construct(
        private readonly InvoiceRepositoryInterface $invoices,
        private readonly SmsLogRepositoryInterface $smsLogs,
        private readonly StripeService $stripe,
        private readonly TwilioService $twilio,
    ) {}

    public function store(array $validated): Invoice
    {
        $validated['invoice_number'] = Invoice::generateNumber();
        $validated['status'] ??= 'unpaid';

        return $this->invoices->create($validated);
    }

    public function update(Invoice $invoice, array $validated): bool
    {
        return $this->invoices->update($invoice, $validated);
    }

    public function destroy(Invoice $invoice): bool
    {
        return $this->invoices->delete($invoice);
    }

    public function createPaymentLink(Invoice $invoice, string $appUrl): Invoice
    {
        $session = $this->stripe->createCheckoutSession(
            $invoice,
            $appUrl . '/invoices/' . $invoice->id . '?payment=success',
            $appUrl . '/invoices/' . $invoice->id . '?payment=cancelled',
        );

        $this->invoices->update($invoice, [
            'stripe_payment_link'        => $session->url,
            'stripe_checkout_session_id' => $session->id,
            'status'                     => $invoice->status === 'unpaid' ? 'pending' : $invoice->status,
        ]);

        $invoice->refresh();

        return $invoice;
    }

    public function sendPaymentSms(Invoice $invoice): SmsLog
    {
        $body = "Invoice {$invoice->invoice_number} | \${$invoice->amount_due} due. Pay here: {$invoice->stripe_payment_link}";

        $result = $this->twilio->sendSms($invoice->client->phone, $body);

        return $this->smsLogs->create([
            'invoice_id'    => $invoice->id,
            'sent_at'       => Carbon::now(),
            'status'        => $result['status'],
            'message_sid'   => $result['sid'] ?? null,
            'error_message' => $result['error'] ?? null,
        ]);
    }

    public function markPaid(string $sessionId): void
    {
        $invoice = $this->invoices->findByStripeSession($sessionId);

        if ($invoice) {
            $this->invoices->update($invoice, [
                'status'      => 'paid',
                'amount_paid' => $invoice->amount_due,
            ]);
        }
    }

    public function dashboardStats(): array
    {
        return [
            'total_outstanding'         => $this->invoices->totalOutstanding(),
            'total_collected_this_month' => $this->invoices->totalCollectedThisMonth(),
            'recent_payments'           => $this->invoices->recentPayments(5),
            'needs_action_count'        => $this->invoices->needsActionCount(),
        ];
    }
}
