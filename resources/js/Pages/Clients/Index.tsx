import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { AccountStatus, Client, PageProps, PaginatedData, PaymentSmsStatus, PaymentStatus } from '@/types';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusColors: Record<AccountStatus, string> = {
    active:   'bg-brand-50 text-brand-700 border border-brand-200',
    inactive: 'bg-red-50 text-red-700 border border-red-200',
    pending:  'bg-amber-50 text-amber-700 border border-amber-200',
    paid:     'bg-teal-50 text-teal-700 border border-teal-200',
};

const statusLabels: Record<AccountStatus, string> = {
    active:   'Active',
    inactive: 'Inactive',
    pending:  'Pending',
    paid:     'Paid',
};

interface Filters {
    search?: string;
    status?: string;
    link_status?: string;
    link_sms_status?: string;
    amount_range?: string;
}

const AMOUNT_RANGES = [
    { value: '',        label: 'All Amounts' },
    { value: '0-100',   label: '$0 – $100'   },
    { value: '101-200', label: '$101 – $200'  },
    { value: '201-300', label: '$201 – $300'  },
    { value: '301+',    label: '$301+'        },
] as const;

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

interface GeneratingStatus {
    total: number;
    processed: number;
    started_at: string;
}

export default function Index({
    clients,
    filters,
    generating,
}: PageProps<{ clients: PaginatedData<Client>; filters: Filters; generating: GeneratingStatus | null }>) {
    const { flash } = usePage<PageProps>().props;
    const { delete: destroy, processing } = useForm({});
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [linkStatus, setLinkStatus] = useState<PaymentStatus | ''>(
        (filters.link_status as PaymentStatus) ?? ''
    );
    const [linkSmsStatus, setLinkSmsStatus] = useState<PaymentSmsStatus | ''>(
        (filters.link_sms_status as PaymentSmsStatus) ?? ''
    );
    const [amountRange, setAmountRange] = useState(filters.amount_range ?? '');
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();

    // ── Batch selection ───────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const allPageIds = clients.data.map((c) => c.id);
    const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));

    function toggleAll() {
        if (allSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                allPageIds.forEach((id) => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                allPageIds.forEach((id) => next.add(id));
                return next;
            });
        }
    }

    function toggleOne(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    // ── Poll while generation job is running ──────────────────────────────────
    const isGenerating = !!generating;
    useEffect(() => {
        if (!isGenerating) return;
        const id = setInterval(() => {
            router.reload({ only: ['generating', 'clients'] });
        }, 3000);
        return () => clearInterval(id);
    }, [isGenerating]);

    // ── Generate all payment links ────────────────────────────────────────────
    const [generatingAll, setGeneratingAll] = useState(false);

    function handleGenerateAll() {
        if (!confirm('Generate payment links for all eligible clients without a pending link?')) return;
        setGeneratingAll(true);
        router.post(
            route('clients.generate-all-payment-links'),
            {},
            { onFinish: () => setGeneratingAll(false) },
        );
    }

    // ── Batch SMS ─────────────────────────────────────────────────────────────
    const [batchSending, setBatchSending] = useState(false);

    function handleBatchSendSms() {
        if (selectedIds.size === 0) return;
        setBatchSending(true);
        router.post(
            route('clients.batch-send-sms'),
            { client_ids: [...selectedIds] },
            {
                onFinish: () => {
                    setBatchSending(false);
                    setSelectedIds(new Set());
                },
            },
        );
    }

    // ── Alternate-phone modal ─────────────────────────────────────────────────
    const [altModal, setAltModal] = useState<{ open: boolean; client: Client | null }>({
        open: false,
        client: null,
    });
    const [altPhone, setAltPhone] = useState('');
    const [altSending, setAltSending] = useState(false);

    function openAltModal(client: Client) {
        setAltModal({ open: true, client });
        setAltPhone('');
    }

    function closeAltModal() {
        setAltModal({ open: false, client: null });
        setAltPhone('');
    }

    function handleSendToPhone() {
        if (!altModal.client || !altPhone.trim()) return;
        setAltSending(true);
        router.post(
            route('clients.send-to-phone', altModal.client.id),
            { phone: altPhone.trim() },
            {
                onFinish: () => {
                    setAltSending(false);
                    closeAltModal();
                },
            },
        );
    }

    // ── Filters ───────────────────────────────────────────────────────────────
    function applyFilters(
        newSearch: string,
        newStatus: string,
        newLinkStatus: string,
        newLinkSmsStatus: string,
        newAmountRange: string,
    ) {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get(
                route('clients.index'),
                {
                    search:          newSearch        || undefined,
                    status:          newStatus        || undefined,
                    link_status:     newLinkStatus    || undefined,
                    link_sms_status: newLinkSmsStatus || undefined,
                    amount_range:    newAmountRange   || undefined,
                },
                { preserveState: true, replace: true },
            );
        }, 300);
    }

    function handleSearch(value: string) {
        setSearch(value);
        applyFilters(value, status, linkStatus, linkSmsStatus, amountRange);
    }

    function handleStatus(value: string) {
        setStatus(value);
        applyFilters(search, value, linkStatus, linkSmsStatus, amountRange);
    }

    function handleLinkStatus(value: PaymentStatus | '') {
        setLinkStatus(value);
        applyFilters(search, status, value, linkSmsStatus, amountRange);
    }

    function handleLinkSmsStatus(value: PaymentSmsStatus | '') {
        setLinkSmsStatus(value);
        applyFilters(search, status, linkStatus, value, amountRange);
    }

    function handleAmountRange(value: string) {
        setAmountRange(value);
        applyFilters(search, status, linkStatus, linkSmsStatus, value);
    }

    const hasActiveFilters = !!(search || status || linkStatus || linkSmsStatus || amountRange);

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
                        <button
                            onClick={handleGenerateAll}
                            disabled={generatingAll}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            {generatingAll ? 'Queuing…' : 'Generate All Links'}
                        </button>
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

                    {/* Generation progress banner */}
                    {generating && (() => {
                        const pct = generating.total > 0
                            ? Math.min(100, Math.round((generating.processed / generating.total) * 100))
                            : 0;
                        return (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5">
                                <div className="flex items-start gap-3">
                                    <svg className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-500"
                                        fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10"
                                            stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-amber-800">
                                                Generating payment links…
                                            </p>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-sm font-semibold text-amber-700">
                                                    {pct}%
                                                </span>
                                                <Link
                                                    href={route('clients.cancel-payment-link-generation')}
                                                    method="post"
                                                    as="button"
                                                    className="rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
                                                >
                                                    Stop
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
                                            <div
                                                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <p className="mt-1.5 text-xs text-amber-600">
                                            {generating.processed} of {generating.total} {generating.total === 1 ? 'client' : 'clients'} processed
                                            &nbsp;·&nbsp; refreshing automatically
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Flash messages */}
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

                    {/* Search + Filter bar */}
                    <div className="space-y-2">
                        {/* Row 1: search + account status */}
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
                                <option value="">All Account Statuses</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Row 2: payment link status pills + SMS status pills */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Payment link status */}
                            {(['', 'pending', 'paid', 'failed', 'expired'] as const).map((s) => (
                                <button
                                    key={s || 'all'}
                                    type="button"
                                    onClick={() => handleLinkStatus(s)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                        linkStatus === s
                                            ? 'bg-brand-600 text-white shadow-sm'
                                            : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {s === '' ? 'All Payment Links' : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}

                            <span className="text-slate-200">|</span>

                            {/* SMS status */}
                            <select
                                value={linkSmsStatus}
                                onChange={(e) => handleLinkSmsStatus(e.target.value as PaymentSmsStatus | '')}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            >
                                <option value="">All SMS Statuses</option>
                                <option value="not_sent">Not Sent</option>
                                <option value="sent">Sent</option>
                                <option value="failed">SMS Failed</option>
                            </select>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch(''); setStatus('');
                                        setLinkStatus(''); setLinkSmsStatus('');
                                        setAmountRange('');
                                        applyFilters('', '', '', '', '');
                                    }}
                                    className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>

                        {/* Row 3: amount due range */}
                        <div className="flex flex-wrap items-center gap-2">
                            {AMOUNT_RANGES.map(({ value, label }) => (
                                <button
                                    key={value || 'all-amt'}
                                    type="button"
                                    onClick={() => handleAmountRange(value)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                        amountRange === value
                                            ? 'bg-slate-700 text-white shadow-sm'
                                            : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Batch action toolbar */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
                            <span className="text-sm font-medium text-brand-700">
                                {selectedIds.size} {selectedIds.size === 1 ? 'client' : 'clients'} selected
                            </span>
                            <button
                                onClick={handleBatchSendSms}
                                disabled={batchSending}
                                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                                </svg>
                                {batchSending ? 'Queuing…' : 'Send Payment Links via SMS'}
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="ml-auto text-xs text-brand-500 hover:text-brand-700"
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {clients.data.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p className="text-sm text-slate-500">
                                    {hasActiveFilters
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
                                            <th className="w-10 px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={toggleAll}
                                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                />
                                            </th>
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
                                            const isSelected = selectedIds.has(client.id);
                                            return (
                                                <tr key={client.id} className={`transition-colors ${isSelected ? 'bg-brand-50/40' : 'hover:bg-slate-50'}`}>
                                                    {/* Checkbox */}
                                                    <td className="w-10 px-4 py-3.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleOne(client.id)}
                                                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                        />
                                                    </td>

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
                                                        {(client.pending_links_count ?? 0) > 0 && (
                                                            <span className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-700">
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                </svg>
                                                                {client.pending_links_count} pending {(client.pending_links_count ?? 0) === 1 ? 'link' : 'links'}
                                                            </span>
                                                        )}
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
                                                                onClick={() => openAltModal(client)}
                                                                className="text-slate-400 hover:text-brand-700"
                                                                title="Send payment link to alternate number"
                                                            >
                                                                SMS
                                                            </button>
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

            {/* Alternate-phone modal */}
            <Modal show={altModal.open} maxWidth="sm" onClose={closeAltModal}>
                <div className="p-6">
                    <h3 className="text-base font-semibold text-slate-900">Send Payment Link via SMS</h3>
                    {altModal.client && (
                        <p className="mt-1 text-sm text-slate-500">
                            Send <span className="font-medium text-slate-700">{displayName(altModal.client)}</span>'s
                            payment link to a different phone number.
                        </p>
                    )}

                    <div className="mt-4">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            Phone number
                        </label>
                        <input
                            type="tel"
                            placeholder="(555) 000-0000"
                            value={altPhone}
                            onChange={(e) => setAltPhone(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendToPhone()}
                            autoFocus
                            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        />
                        <p className="mt-1 text-xs text-slate-400">
                            This will not change the client's stored phone number.
                        </p>
                    </div>

                    <div className="mt-5 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeAltModal}
                            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSendToPhone}
                            disabled={altSending || !altPhone.trim()}
                            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {altSending ? 'Sending…' : 'Send SMS'}
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
