import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Client, PageProps, PaginatedData, PaymentLink, PaymentSmsStatus, PaymentStatus } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// ─── Spinner icon ─────────────────────────────────────────────────────────────
function Spinner({ className = 'h-3.5 w-3.5' }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    );
}

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
    sms_status?: string;
    search?: string;
    amount_range?: string;
}

const AMOUNT_RANGES = [
    { value: '',        label: 'All Amounts' },
    { value: '0-150',   label: '$0 – $150'   },
    { value: '151-300', label: '$151 – $300'  },
    { value: '301-500', label: '$301 – $500'  },
    { value: '501+',    label: '$501+'        },
] as const;

interface SendingStatus {
    total: number;
    processed: number;
    started_at: string;
}

type PaymentLinkWithClient = PaymentLink & { client: Client };

const BATCH_SIZE = 160;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentLinksIndex({
    links,
    filters,
    unsent_count,
    next_batch_ids,
    sending,
}: PageProps<{
    links: PaginatedData<PaymentLinkWithClient>;
    filters: Filters;
    unsent_count: number;
    next_batch_ids: number[];
    sending: SendingStatus | null;
}>) {
    const { flash } = usePage<PageProps>().props;

    const [status, setStatus] = useState(filters.status ?? '');
    const [smsStatus, setSmsStatus] = useState(filters.sms_status ?? '');
    const [search, setSearch] = useState(filters.search ?? '');
    const [amountRange, setAmountRange] = useState(filters.amount_range ?? '');
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();

    // Batch selection state
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isSending, setIsSending] = useState(false);

    // Fetch status state
    const [fetchingId, setFetchingId] = useState<number | null>(null);
    const [fetchingAll, setFetchingAll] = useState(false);

    const totalBatches = Math.ceil(unsent_count / BATCH_SIZE);

    // ─── Poll while batch SMS job is running ───────────────────────────────────
    const isSendingBatch = !!sending;
    useEffect(() => {
        if (!isSendingBatch) return;
        const id = setInterval(() => {
            router.reload({ only: ['sending', 'links', 'unsent_count', 'next_batch_ids'] });
        }, 3000);
        return () => clearInterval(id);
    }, [isSendingBatch]);

    // ─── Filter handlers ───────────────────────────────────────────────────────

    function applyFilters(newSearch: string, newStatus: string, newSmsStatus: string, newAmountRange: string) {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get(
                route('payment-links.index'),
                {
                    search:       newSearch       || undefined,
                    status:       newStatus       || undefined,
                    sms_status:   newSmsStatus    || undefined,
                    amount_range: newAmountRange  || undefined,
                },
                { preserveState: true, replace: true },
            );
        }, 300);
    }

    function handleSearch(value: string) {
        setSearch(value);
        applyFilters(value, status, smsStatus, amountRange);
    }

    function handleStatus(value: string) {
        setStatus(value);
        applyFilters(search, value, smsStatus, amountRange);
    }

    function handleSmsStatus(value: string) {
        setSmsStatus(value);
        applyFilters(search, status, value, amountRange);
    }

    function handleAmountRange(value: string) {
        setAmountRange(value);
        applyFilters(search, status, smsStatus, value);
    }

    const hasActiveFilters = !!(search || status || smsStatus || amountRange);

    // ─── Row actions ───────────────────────────────────────────────────────────

    function handleDelete(link: PaymentLinkWithClient) {
        if (!confirm(`Delete payment link of ${fmt(link.amount)} for ${clientName(link.client)}?`)) return;
        router.delete(route('payment-links.destroy', link.id), {
            preserveScroll: true,
        });
    }

    // ─── Batch handlers ────────────────────────────────────────────────────────

    function handleSelectBatch() {
        setSelectedIds(new Set(next_batch_ids));
    }

    function handleClearSelection() {
        setSelectedIds(new Set());
    }

    function handleToggleRow(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function handleTogglePage() {
        const pageIds = links.data
            .filter((l) => l.sms_status === 'not_sent' && l.payment_status === 'pending')
            .map((l) => l.id);

        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                pageIds.forEach((id) => next.delete(id));
            } else {
                pageIds.forEach((id) => next.add(id));
            }
            return next;
        });
    }

    function handleFetchStatus(link: PaymentLinkWithClient) {
        setFetchingId(link.id);
        router.post(
            route('payment-links.fetch-status', link.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setFetchingId(null),
            },
        );
    }

    function handleFetchAllStatuses() {
        setFetchingAll(true);
        router.post(
            route('payment-links.fetch-all-statuses'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setFetchingAll(false),
            },
        );
    }

    function handleBatchSend() {
        if (selectedIds.size === 0) return;
        setIsSending(true);
        router.post(
            route('payment-links.batch-send-sms'),
            { link_ids: [...selectedIds] },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedIds(new Set());
                    // Reload batch data so next_batch_ids + unsent_count refresh
                    router.reload({ only: ['sending', 'unsent_count', 'next_batch_ids', 'links'] });
                },
                onFinish: () => setIsSending(false),
            },
        );
    }

    // Eligible (unsent+pending) ids on the current page
    const pageEligibleIds = links.data
        .filter((l) => l.sms_status === 'not_sent' && l.payment_status === 'pending')
        .map((l) => l.id);
    const allPageSelected =
        pageEligibleIds.length > 0 && pageEligibleIds.every((id) => selectedIds.has(id));
    const somePageSelected = pageEligibleIds.some((id) => selectedIds.has(id));

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
                    <button
                        type="button"
                        onClick={handleFetchAllStatuses}
                        disabled={fetchingAll}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Query Stripe for the latest status of all pending payment links"
                    >
                        {fetchingAll ? <Spinner /> : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                        Fetch All Statuses
                    </button>
                </div>
            }
        >
            <Head title="Payment Links" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-4 sm:px-6 lg:px-8">

                    {/* Batch SMS progress banner */}
                    {sending && (() => {
                        const pct = sending.total > 0
                            ? Math.min(100, Math.round((sending.processed / sending.total) * 100))
                            : 0;
                        return (
                            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3.5">
                                <div className="flex items-start gap-3">
                                    <svg className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-500"
                                        fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10"
                                            stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-brand-800">
                                                Sending SMS messages…
                                            </p>
                                            <span className="shrink-0 text-sm font-semibold text-brand-700">
                                                {pct}%
                                            </span>
                                        </div>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-brand-200">
                                            <div
                                                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <p className="mt-1.5 text-xs text-brand-600">
                                            {sending.processed} of {sending.total} {sending.total === 1 ? 'message' : 'messages'} sent
                                            &nbsp;·&nbsp; refreshing automatically
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

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
                    {(flash as Record<string, string>).info && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                            {(flash as Record<string, string>).info}
                        </div>
                    )}

                    {/* Batch bar */}
                    {unsent_count > 0 && (
                        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-amber-800">
                                <span className="font-semibold">{unsent_count.toLocaleString()}</span> unsent payment{' '}
                                {unsent_count === 1 ? 'link' : 'links'} —{' '}
                                {totalBatches} {totalBatches === 1 ? 'batch' : 'batches'} of {BATCH_SIZE}
                            </p>
                            <button
                                type="button"
                                onClick={handleSelectBatch}
                                disabled={next_batch_ids.length === 0}
                                className="whitespace-nowrap rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Select Batch 1 of {totalBatches} ({next_batch_ids.length} links)
                            </button>
                        </div>
                    )}

                    {/* Selection toolbar */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                            <p className="text-sm font-medium text-brand-800">
                                {selectedIds.size} {selectedIds.size === 1 ? 'link' : 'links'} selected
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleClearSelection}
                                    className="text-sm text-slate-500 hover:text-slate-700"
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBatchSend}
                                    disabled={isSending}
                                    className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSending ? (
                                        <>
                                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Sending…
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            Send Payment Links
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Filter bar */}
                    <div className="space-y-2">
                        {/* Search */}
                        <div className="relative">
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

                        {/* Pill filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Payment status pills */}
                            {(['', 'pending', 'paid', 'failed', 'expired'] as const).map((s) => (
                                <button
                                    key={s || 'all'}
                                    type="button"
                                    onClick={() => handleStatus(s)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                        status === s
                                            ? 'bg-brand-600 text-white shadow-sm'
                                            : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}

                            <span className="text-slate-200">|</span>

                            {/* SMS status pills */}
                            {([
                                { value: '',         label: 'All SMS' },
                                { value: 'not_sent', label: 'Not Sent' },
                                { value: 'sent',     label: 'Sent' },
                                { value: 'failed',   label: 'SMS Failed' },
                            ] as const).map(({ value, label }) => (
                                <button
                                    key={value || 'all-sms'}
                                    type="button"
                                    onClick={() => handleSmsStatus(value)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                        smsStatus === value
                                            ? 'bg-slate-700 text-white shadow-sm'
                                            : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch(''); setStatus(''); setSmsStatus(''); setAmountRange('');
                                        applyFilters('', '', '', '');
                                    }}
                                    className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>

                        {/* Amount range pills */}
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

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {links.data.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <p className="text-sm text-slate-500">
                                    {hasActiveFilters
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
                                            {/* Checkbox header */}
                                            <th className="w-10 px-4 py-3">
                                                {pageEligibleIds.length > 0 && (
                                                    <input
                                                        type="checkbox"
                                                        checked={allPageSelected}
                                                        ref={(el) => {
                                                            if (el) el.indeterminate = !allPageSelected && somePageSelected;
                                                        }}
                                                        onChange={handleTogglePage}
                                                        title="Toggle all eligible on this page"
                                                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                    />
                                                )}
                                            </th>
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
                                        {links.data.map((link) => {
                                            const isEligible = link.sms_status === 'not_sent' && link.payment_status === 'pending';
                                            const isChecked  = selectedIds.has(link.id);

                                            return (
                                                <tr
                                                    key={link.id}
                                                    className={`transition-colors hover:bg-slate-50 ${isChecked ? 'bg-brand-50' : ''}`}
                                                >
                                                    {/* Checkbox */}
                                                    <td className="w-10 px-4 py-3.5">
                                                        {isEligible && (
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => handleToggleRow(link.id)}
                                                                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                            />
                                                        )}
                                                    </td>

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
                                                                    className="inline-flex items-center gap-1 rounded-md bg-stripe px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
                                                                    title="Open Stripe payment page"
                                                                >
                                                                    Click here →
                                                                </a>
                                                            )}
                                                            {link.payment_status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleFetchStatus(link)}
                                                                    disabled={fetchingId === link.id}
                                                                    title="Query Stripe for latest payment status"
                                                                    className="flex items-center gap-1 text-slate-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    {fetchingId === link.id
                                                                        ? <Spinner />
                                                                        : (
                                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                            </svg>
                                                                        )
                                                                    }
                                                                    {fetchingId === link.id ? 'Checking…' : 'Fetch Status'}
                                                                </button>
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
                                            );
                                        })}
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
