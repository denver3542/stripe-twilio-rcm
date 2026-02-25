import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Client, PageProps, PaginatedData, PaymentLink, PaymentSmsStatus, PaymentStatus } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number | string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
}

function fmtDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

function clientName(client: Client | undefined): string {
    if (!client) return '—';
    if (client.name) return client.name;
    const parts = [client.first_name, client.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : `Patient #${client.id}`;
}

// ─── Badge maps ───────────────────────────────────────────────────────────────

const paymentStatusColors: Record<PaymentStatus, string> = {
    pending:  'bg-amber-50  text-amber-700  border border-amber-200',
    paid:     'bg-brand-50  text-brand-700  border border-brand-200',
    failed:   'bg-red-50    text-red-700    border border-red-200',
    expired:  'bg-slate-100 text-slate-500  border border-slate-200',
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
    pending: 'Pending',
    paid:    'Paid',
    failed:  'Failed',
    expired: 'Expired',
};

const smsStatusColors: Record<PaymentSmsStatus, string> = {
    not_sent: 'bg-slate-100 text-slate-500  border border-slate-200',
    sent:     'bg-brand-50  text-brand-700  border border-brand-200',
    failed:   'bg-red-50    text-red-700    border border-red-200',
};

const smsStatusLabels: Record<PaymentSmsStatus, string> = {
    not_sent: 'Not Sent',
    sent:     'Sent',
    failed:   'Failed',
};

// ─── Filters type ─────────────────────────────────────────────────────────────

interface Filters {
    status?: string;
    search?: string;
}

type PaymentLinkWithClient = PaymentLink & { client: Client };

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentLinksIndex({
    links,
    filters,
}: PageProps<{ links: PaginatedData<PaymentLinkWithClient>; filters: Filters }>) {
    const { flash } = usePage<PageProps>().props;

    const [status, setStatus] = useState(filters.status ?? '');
    const [search, setSearch] = useState(filters.search ?? '');
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();

    function applyFilters(newSearch: string, newStatus: string) {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get(
                route('payment-links.index'),
                { search: newSearch || undefined, status: newStatus || undefined },
                { preserveState: true, replace: true },
            );
        }, 300);
    }

    function handleSearch(value: string) {
        setSearch(value);
        applyFilters(value, status);
    }

    function handleStatus(value: string) {
        setStatus(value);
        applyFilters(search, value);
    }

    function handleDelete(link: PaymentLinkWithClient) {
        if (!confirm(`Delete payment link of ${fmt(link.amount)} for ${clientName(link.client)}?`)) return;
        router.delete(route('payment-links.destroy', link.id), {
            preserveScroll: true,
        });
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-slate-900">Payment Links</h2>
                        <p className="mt-0.5 text-sm text-slate-400">
                            {links.total.toLocaleString()} {links.total === 1 ? 'link' : 'links'}
                            {filters.search || filters.status ? ' matching filters' : ' total'}
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Payment Links" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-4 sm:px-6 lg:px-8">

                    {/* Flash */}
                    {flash.success && (
                        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                            {flash.success}
                        </div>
                    )}
                    {flash.error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {flash.error}
                        </div>
                    )}

                    {/* Filter bar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                            </svg>
                            <input
                                type="search"
                                placeholder="Search by patient name or ID…"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            />
                        </div>
                        <select
                            value={status}
                            onChange={(e) => handleStatus(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {links.data.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <p className="text-sm text-slate-500">
                                    {filters.search || filters.status
                                        ? 'No payment links match your filters.'
                                        : 'No payment links yet.'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Patient</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Payment</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">SMS</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Paid At</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {links.data.map((link) => (
                                            <tr key={link.id} className="transition-colors hover:bg-slate-50">

                                                {/* Patient */}
                                                <td className="px-5 py-3.5">
                                                    {link.client ? (
                                                        <>
                                                            <Link
                                                                href={route('clients.show', link.client_id)}
                                                                className="text-sm font-medium text-brand-700 hover:text-brand-900"
                                                            >
                                                                {clientName(link.client)}
                                                            </Link>
                                                            {link.client.external_patient_id && (
                                                                <p className="mt-0.5 text-xs text-slate-400">
                                                                    ID #{link.client.external_patient_id}
                                                                </p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">—</span>
                                                    )}
                                                </td>

                                                {/* Amount */}
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <span className="text-sm font-semibold text-slate-900">
                                                        {fmt(link.amount)}
                                                    </span>
                                                </td>

                                                {/* Description */}
                                                <td className="px-5 py-3.5 text-sm text-slate-500 max-w-[200px]">
                                                    <span className="line-clamp-2" title={link.description ?? undefined}>
                                                        {link.description || <span className="text-slate-300">—</span>}
                                                    </span>
                                                </td>

                                                {/* Payment status */}
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusColors[link.payment_status]}`}>
                                                        {paymentStatusLabels[link.payment_status]}
                                                    </span>
                                                </td>

                                                {/* SMS status */}
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${smsStatusColors[link.sms_status]}`}>
                                                        {smsStatusLabels[link.sms_status]}
                                                    </span>
                                                    {link.sms_sent_at && (
                                                        <p className="mt-0.5 text-xs text-slate-400">{fmtDate(link.sms_sent_at)}</p>
                                                    )}
                                                </td>

                                                {/* Paid at */}
                                                <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-600">
                                                    {fmtDate(link.paid_at)}
                                                </td>

                                                {/* Created at */}
                                                <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-400">
                                                    {fmtDate(link.created_at)}
                                                </td>

                                                {/* Actions */}
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {link.stripe_payment_link_url && (
                                                            <a
                                                                href={link.stripe_payment_link_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-slate-400 hover:text-brand-700"
                                                                title="Open Stripe payment link"
                                                            >
                                                                Open ↗
                                                            </a>
                                                        )}
                                                        {link.payment_status === 'pending' &&
                                                         link.sms_status !== 'sent' && (
                                                            <Link
                                                                href={route('payment-links.send-sms', link.id)}
                                                                method="post"
                                                                as="button"
                                                                preserveScroll
                                                                className="text-slate-400 hover:text-brand-700"
                                                            >
                                                                Send SMS
                                                            </Link>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(link)}
                                                            className="text-slate-400 hover:text-red-600"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {links.last_page > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Showing {links.from}–{links.to} of {links.total.toLocaleString()}
                            </p>
                            <div className="flex gap-1">
                                {links.links.map((pageLink, i) => (
                                    <Link
                                        key={i}
                                        href={pageLink.url ?? '#'}
                                        preserveScroll
                                        className={[
                                            'min-w-[2rem] rounded-md px-2.5 py-1.5 text-center text-xs font-medium transition',
                                            pageLink.active
                                                ? 'bg-brand-600 text-white shadow-sm'
                                                : pageLink.url
                                                    ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                    : 'cursor-default border border-slate-100 bg-white text-slate-300',
                                        ].join(' ')}
                                        dangerouslySetInnerHTML={{ __html: pageLink.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
