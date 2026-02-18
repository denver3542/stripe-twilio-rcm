import DangerButton from '@/Components/DangerButton';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Client, Invoice, InvoiceStatus, PageProps, SmsLog, SmsStatus } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

const invoiceStatusColors: Record<InvoiceStatus, string> = {
    paid:    'bg-brand-50 text-brand-700 border border-brand-200',
    unpaid:  'bg-slate-100 text-slate-600 border border-slate-200',
    pending: 'bg-purple-50 text-purple-700 border border-purple-200',
    overdue: 'bg-red-50 text-red-700 border border-red-200',
};

const smsStatusColors: Record<SmsStatus, string> = {
    sent:   'bg-brand-50 text-brand-700 border border-brand-200',
    failed: 'bg-red-50 text-red-700 border border-red-200',
};

function clientName(client: Client): string {
    if (client.name) return client.name;
    const parts = [client.first_name, client.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
}

function formatPhone(phone: string | null | undefined): string {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return phone;
}

type InvoiceShowProps = Invoice & {
    client: Client;
    sms_logs: SmsLog[];
};

export default function Show({
    invoice,
    status,
}: PageProps<{ invoice: InvoiceShowProps; status?: string }>) {
    const paymentLinkForm = useForm({});
    const smsForm         = useForm({});
    const deleteForm      = useForm({});

    function handleDelete() {
        if (confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) {
            deleteForm.delete(route('invoices.destroy', invoice.id));
        }
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={route('invoices.index')} className="text-sm text-slate-500 hover:text-slate-700">
                            ← Invoices
                        </Link>
                        <span className="text-slate-300">/</span>
                        <h2 className="text-xl font-semibold leading-tight text-slate-900">
                            {invoice.invoice_number}
                        </h2>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${invoiceStatusColors[invoice.status]}`}>
                            {invoice.status}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('invoices.edit', invoice.id)}>
                            <SecondaryButton type="button">Edit</SecondaryButton>
                        </Link>
                        <DangerButton onClick={handleDelete} disabled={deleteForm.processing}>
                            Delete
                        </DangerButton>
                    </div>
                </div>
            }
        >
            <Head title={invoice.invoice_number} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">

                    {/* Flash status */}
                    {status && (
                        <div className={`rounded-lg border px-4 py-3 text-sm ${
                            status.toLowerCase().startsWith('sms failed') || status.toLowerCase().startsWith('error')
                                ? 'border-red-200 bg-red-50 text-red-800'
                                : 'border-brand-200 bg-brand-50 text-brand-800'
                        }`}>
                            {status}
                        </div>
                    )}

                    {/* Invoice details + client info */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Invoice details */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Invoice Details</h3>
                            <dl className="space-y-3">
                                <div className="flex justify-between">
                                    <dt className="text-sm text-slate-500">Invoice Number</dt>
                                    <dd className="text-sm font-medium text-slate-900">{invoice.invoice_number}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-slate-500">Service Date</dt>
                                    <dd className="text-sm text-slate-900">{invoice.service_date}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-slate-500">Amount Due</dt>
                                    <dd className="text-sm font-semibold text-slate-900">${Number(invoice.amount_due).toFixed(2)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-slate-500">Amount Paid</dt>
                                    <dd className="text-sm font-semibold text-brand-700">${Number(invoice.amount_paid).toFixed(2)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-slate-500">Balance</dt>
                                    <dd className="text-sm font-semibold text-slate-900">
                                        ${Math.max(0, Number(invoice.amount_due) - Number(invoice.amount_paid)).toFixed(2)}
                                    </dd>
                                </div>
                                {invoice.notes && (
                                    <div>
                                        <dt className="text-sm text-slate-500">Notes</dt>
                                        <dd className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{invoice.notes}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* Client info */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Client</h3>
                                <Link
                                    href={route('clients.show', invoice.client.id)}
                                    className="text-xs text-brand-700 hover:text-brand-900"
                                >
                                    View Client →
                                </Link>
                            </div>
                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-xs text-slate-500">Name</dt>
                                    <dd className="text-sm font-medium text-slate-900">{clientName(invoice.client)}</dd>
                                </div>
                                {invoice.client.contact_name && (
                                    <div>
                                        <dt className="text-xs text-slate-500">Contact</dt>
                                        <dd className="text-sm text-slate-900">{invoice.client.contact_name}</dd>
                                    </div>
                                )}
                                {(invoice.client.mobile_phone || invoice.client.phone) && (
                                    <div>
                                        <dt className="text-xs text-slate-500">Phone</dt>
                                        <dd className="text-sm text-slate-900">
                                            <a href={`tel:${invoice.client.mobile_phone || invoice.client.phone}`} className="hover:text-brand-700">
                                                {formatPhone(invoice.client.mobile_phone || invoice.client.phone)}
                                            </a>
                                        </dd>
                                    </div>
                                )}
                                {invoice.client.email && (
                                    <div>
                                        <dt className="text-xs text-slate-500">Email</dt>
                                        <dd className="text-sm text-slate-900">
                                            <a href={`mailto:${invoice.client.email}`} className="hover:text-brand-700">
                                                {invoice.client.email}
                                            </a>
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>

                    {/* Actions: Payment Link + SMS */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Payment Actions</h3>

                        <div className="flex flex-wrap items-start gap-6">
                            {/* Stripe Payment Link */}
                            <div className="flex-1 min-w-[260px]">
                                <p className="mb-2 text-sm font-medium text-slate-700">Stripe Payment Link</p>
                                {invoice.stripe_payment_link ? (
                                    <div className="space-y-2">
                                        <a
                                            href={invoice.stripe_payment_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block truncate rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-700 hover:bg-purple-100"
                                        >
                                            {invoice.stripe_payment_link}
                                        </a>
                                        <p className="text-xs text-slate-400">Link already generated.</p>
                                    </div>
                                ) : (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            paymentLinkForm.post(route('invoices.payment-link', invoice.id));
                                        }}
                                    >
                                        <PrimaryButton disabled={paymentLinkForm.processing} type="submit">
                                            {paymentLinkForm.processing ? 'Generating…' : 'Generate Payment Link'}
                                        </PrimaryButton>
                                    </form>
                                )}
                            </div>

                            {/* Twilio SMS */}
                            <div className="flex-1 min-w-[260px]">
                                <p className="mb-2 text-sm font-medium text-slate-700">Send Payment SMS</p>
                                {!invoice.stripe_payment_link ? (
                                    <p className="text-xs text-slate-400">Generate a payment link first.</p>
                                ) : (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            smsForm.post(route('invoices.send-sms', invoice.id));
                                        }}
                                    >
                                        <p className="mb-2 text-xs text-slate-500">
                                            Will send to: <span className="font-medium text-slate-700">{formatPhone(invoice.client.mobile_phone || invoice.client.phone)}</span>
                                        </p>
                                        <SecondaryButton
                                            type="submit"
                                            disabled={smsForm.processing}
                                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                        >
                                            {smsForm.processing ? 'Sending…' : 'Send SMS'}
                                        </SecondaryButton>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SMS Log */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-6 py-4">
                            <h3 className="text-sm font-semibold text-slate-900">SMS History</h3>
                        </div>
                        {!invoice.sms_logs || invoice.sms_logs.length === 0 ? (
                            <div className="px-6 py-8 text-center text-sm text-slate-500">
                                No SMS messages sent yet.
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sent At</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Message SID</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Error</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {invoice.sms_logs.map((log: SmsLog) => (
                                        <tr key={log.id}>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{log.sent_at}</td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${smsStatusColors[log.status]}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-xs font-mono text-slate-500">
                                                {log.message_sid ?? '—'}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-red-600">
                                                {log.error_message ?? '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
