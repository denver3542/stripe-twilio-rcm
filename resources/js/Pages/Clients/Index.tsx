import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { AccountStatus, Client, PageProps, PaginatedData } from '@/types';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useRef, useState } from 'react';

const statusColors: Record<AccountStatus, string> = {
    active:   'bg-brand-50 text-brand-700 border border-brand-200',
    inactive: 'bg-red-50 text-red-700 border border-red-200',
    pending:  'bg-amber-50 text-amber-700 border border-amber-200',
};

const statusLabels: Record<AccountStatus, string> = {
    active:   'Active',
    inactive: 'Inactive',
    pending:  'Pending',
};

interface Filters {
    search?: string;
    status?: string;
}

function displayName(client: Client): string {
    if (client.name) return client.name;
    const parts = [client.first_name, client.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
}

function formatPhone(phone: string | null): string {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
}

function formatBalance(amount: number): string {
    return `$${Number(amount).toFixed(2)}`;
}

export default function Index({
    clients,
    filters,
}: PageProps<{ clients: PaginatedData<Client>; filters: Filters }>) {
    const { delete: destroy, processing } = useForm({});
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();

    function applyFilters(newSearch: string, newStatus: string) {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get(
                route('clients.index'),
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

    function handleDelete(client: Client) {
        const label = displayName(client);
        if (confirm(`Delete "${label}"? This cannot be undone.`)) {
            destroy(route('clients.destroy', client.id));
        }
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-slate-900">Clients</h2>
                        <p className="mt-0.5 text-sm text-slate-400">
                            {clients.total.toLocaleString()} {clients.total === 1 ? 'patient' : 'patients'}
                            {filters.search || filters.status ? ' matching filters' : ' total'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('clients.import')}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                            Import
                        </Link>
                        <Link
                            href={route('clients.create')}
                            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700"
                        >
                            + New Client
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Clients" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-4">

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
                                placeholder="Search by name, email, phone, or patient ID…"
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
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {clients.data.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-sm text-slate-500">
                                    {filters.search || filters.status
                                        ? 'No clients match your filters.'
                                        : <>No clients yet. <Link href={route('clients.create')} className="text-brand-700 underline">Add your first client.</Link></>
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Patient</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">DOB</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Location</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Balance</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {clients.data.map((client) => {
                                            const balance = Number(client.patient_balance) || Number(client.outstanding_balance);
                                            return (
                                                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                                    {/* Patient */}
                                                    <td className="px-5 py-3.5">
                                                        <Link
                                                            href={route('clients.show', client.id)}
                                                            className="font-medium text-brand-700 hover:text-brand-900 text-sm"
                                                        >
                                                            {displayName(client)}
                                                        </Link>
                                                        <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                                                            {client.external_patient_id && (
                                                                <span className="text-xs text-slate-400">ID #{client.external_patient_id}</span>
                                                            )}
                                                            {client.gender && (
                                                                <span className="text-xs text-slate-400">{client.gender}</span>
                                                            )}
                                                            {client.insurance_type_name && (
                                                                <span className="text-xs text-slate-400">{client.insurance_type_name}</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* DOB */}
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-600">
                                                        {client.date_of_birth
                                                            ? new Date(client.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : <span className="text-slate-300">—</span>
                                                        }
                                                    </td>

                                                    {/* Contact */}
                                                    <td className="px-5 py-3.5 text-sm">
                                                        {(client.mobile_phone || client.phone) ? (
                                                            <a href={`tel:${client.mobile_phone || client.phone}`}
                                                               className="text-slate-700 hover:text-brand-700">
                                                                {formatPhone(client.mobile_phone || client.phone)}
                                                            </a>
                                                        ) : <span className="text-slate-300">—</span>}
                                                        {client.email && (
                                                            <p className="text-xs text-slate-400 truncate max-w-[180px]" title={client.email}>
                                                                {client.email}
                                                            </p>
                                                        )}
                                                    </td>

                                                    {/* Location */}
                                                    <td className="px-5 py-3.5 text-sm text-slate-600">
                                                        {(client.city || client.state)
                                                            ? <>{client.city}{client.city && client.state ? ', ' : ''}{client.state}</>
                                                            : <span className="text-slate-300">—</span>
                                                        }
                                                        {client.service_location && (
                                                            <p className="text-xs text-slate-400 truncate max-w-[150px]" title={client.service_location}>
                                                                {client.service_location}
                                                            </p>
                                                        )}
                                                    </td>

                                                    {/* Balance */}
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-sm">
                                                        <span className={balance > 0 ? 'font-semibold text-red-600' : 'text-slate-400'}>
                                                            {formatBalance(balance)}
                                                        </span>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="whitespace-nowrap px-5 py-3.5">
                                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[client.account_status]}`}>
                                                            {statusLabels[client.account_status]}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <Link href={route('clients.show', client.id)}
                                                                  className="text-slate-400 hover:text-brand-700">View</Link>
                                                            <Link href={route('clients.edit', client.id)}
                                                                  className="text-slate-400 hover:text-brand-700">Edit</Link>
                                                            <button
                                                                onClick={() => handleDelete(client)}
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
                    {clients.last_page > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Showing {clients.from}–{clients.to} of {clients.total.toLocaleString()}
                            </p>
                            <div className="flex gap-1">
                                {clients.links.map((link, i) => (
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
