import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Client, Invoice, InvoiceStatus, PageProps, PaginatedData } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

const statusColors: Record<InvoiceStatus, string> = {
    paid:    'bg-brand-50 text-brand-700 border border-brand-200',
    unpaid:  'bg-slate-100 text-slate-600 border border-slate-200',
    pending: 'bg-purple-50 text-purple-700 border border-purple-200',
    overdue: 'bg-red-50 text-red-700 border border-red-200',
};

const statusLabels: Record<InvoiceStatus, string> = {
    paid:    'Paid',
    unpaid:  'Unpaid',
    pending: 'Pending',
    overdue: 'Overdue',
};

interface Filters {
    search?: string;
    status?: string;
}

type InvoiceWithClient = Invoice & { client: Client };

function clientName(client: Client): string {
    if (client.name) return client.name;
    const parts = [client.first_name, client.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
}

export default function Index({
    invoices,
    filters,
}: PageProps<{ invoices: PaginatedData<InvoiceWithClient>; filters: Filters }>) {
    const { delete: destroy, processing } = useForm({});
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();

    function applyFilters(newSearch: string, newStatus: string) {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get(
                route('invoices.index'),
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

    function handleDelete(invoice: InvoiceWithClient) {
        if (confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) {
            destroy(route('invoices.destroy', invoice.id));
        }
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-slate-900">Invoices</h2>
                        <p className="mt-0.5 text-sm text-slate-400">
                            {invoices.total.toLocaleString()} {invoices.total === 1 ? 'invoice' : 'invoices'}
                            {filters.search || filters.status ? ' matching filters' : ' total'}
                        </p>
                    </div>
                    <Link
                        href={route('invoices.create')}
                        className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700"
                    >
                        + New Invoice
                    </Link>
                </div>
            }
        >
            <Head title="Invoices" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-4 sm:px-6 lg:px-8">

                    {/* Search + Filter bar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                            </svg>
                            <input
                                type="search"
                                placeholder="Search by invoice # or patient name…"
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
                            <option value="unpaid">Unpaid</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {invoices.data.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm text-slate-500">
                                    {filters.search || filters.status
                                        ? 'No invoices match your filters.'
                                        : <><Link href={route('invoices.create')} className="text-brand-700 underline">Create your first invoice.</Link></>
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice #</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Patient</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Service Date</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount Due</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount Paid</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Balance</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {invoices.data.map((invoice) => {
                                            const balance = Math.max(0, Number(invoice.amount_due) - Number(invoice.amount_paid));
                                            return (
                                                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-sm">
                                                        <Link
                                                            href={route('invoices.show', invoice.id)}
                                                            className="font-medium text-brand-700 hover:text-brand-900"
                                                        >
                                                            {invoice.invoice_number}
                                                        </Link>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-sm">
                                                        <Link
                                                            href={route('clients.show', invoice.client.id)}
                                                            className="text-slate-700 hover:text-brand-700"
                                                        >
                                                            {clientName(invoice.client)}
                                                        </Link>
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-600">
                                                        {invoice.service_date
                                                            ? new Date(invoice.service_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : '—'
                                                        }
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-900">
                                                        ${Number(invoice.amount_due).toFixed(2)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-brand-700">
                                                        ${Number(invoice.amount_paid).toFixed(2)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-sm">
                                                        <span className={balance > 0 ? 'font-semibold text-red-600' : 'text-slate-400'}>
                                                            ${balance.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-3.5">
                                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[invoice.status]}`}>
                                                            {statusLabels[invoice.status]}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <Link href={route('invoices.show', invoice.id)}
                                                                  className="text-slate-400 hover:text-brand-700">View</Link>
                                                            <Link href={route('invoices.edit', invoice.id)}
                                                                  className="text-slate-400 hover:text-brand-700">Edit</Link>
                                                            <button
                                                                onClick={() => handleDelete(invoice)}
                                                                disabled={processing}
                                                                className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                                                            >Delete</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {invoices.last_page > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Showing {invoices.from}–{invoices.to} of {invoices.total.toLocaleString()}
                            </p>
                            <div className="flex gap-1">
                                {invoices.links.map((link, i) => (
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            className={`rounded px-3 py-1 text-sm ${link.active ? 'bg-brand-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="rounded border border-slate-100 px-3 py-1 text-sm text-slate-300"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
