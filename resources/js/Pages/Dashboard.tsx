import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Client, DashboardStats, Invoice, InvoiceStatus, PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function fmtDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

function patientName(client: Client): string {
    if (client.name) return client.name;
    const parts = [client.first_name, client.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
}

// ─── Style maps ──────────────────────────────────────────────────────────────

const statusColors: Record<InvoiceStatus, string> = {
    paid:    'bg-brand-50 text-brand-700 border border-brand-200',
    unpaid:  'bg-slate-100 text-slate-600 border border-slate-200',
    pending: 'bg-purple-50 text-purple-700 border border-purple-200',
    overdue: 'bg-red-50 text-red-700 border border-red-200',
};

const statusLabels: Record<InvoiceStatus, string> = {
    paid: 'Paid', unpaid: 'Unpaid', pending: 'Pending', overdue: 'Overdue',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string;
    sub?: string;
    accent: string; // tailwind border-l-* class
    icon: ReactNode;
}

function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
    return (
        <div className={`rounded-xl border border-slate-200 border-l-4 ${accent} bg-white p-5 shadow-sm`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
                    <p className="mt-1.5 text-2xl font-bold text-slate-900 leading-none">{value}</p>
                    {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-slate-400">{icon}</div>
            </div>
        </div>
    );
}

type InvoiceRow = Invoice & { client: Client };

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard({ stats }: PageProps<{ stats: DashboardStats }>) {
    const sc = stats.status_counts;
    const totalInvoicesWithStatus = Object.values(sc).reduce((a, b) => a + (b ?? 0), 0);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-slate-900">Dashboard</h2>
                        <p className="mt-0.5 text-sm text-slate-400">Revenue Cycle Overview</p>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            href={route('clients.create')}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                            + New Patient
                        </Link>
                        <Link
                            href={route('invoices.create')}
                            className="inline-flex items-center rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700"
                        >
                            + New Invoice
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">

                    {/* ── KPI cards ─────────────────────────────────────────── */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Total Outstanding"
                            value={fmt(stats.total_outstanding)}
                            sub="Unpaid + pending + overdue"
                            accent="border-l-red-400"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Collected This Month"
                            value={fmt(stats.total_collected_this_month)}
                            sub={new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                            accent="border-l-brand-500"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Total Patients"
                            value={stats.total_clients.toLocaleString()}
                            sub={`${stats.total_invoices.toLocaleString()} invoice${stats.total_invoices !== 1 ? 's' : ''} total`}
                            accent="border-l-slate-400"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Needs Action"
                            value={stats.needs_action_count.toLocaleString()}
                            sub={stats.overdue_amount > 0 ? `${fmt(stats.overdue_amount)} overdue` : 'Unpaid invoices'}
                            accent="border-l-amber-400"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            }
                        />
                    </div>

                    {/* ── Invoice status breakdown ───────────────────────────── */}
                    {totalInvoicesWithStatus > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Invoice Status Breakdown</h3>
                            <div className="flex flex-wrap gap-4">
                                {(['overdue', 'unpaid', 'pending', 'paid'] as InvoiceStatus[]).map((s) => {
                                    const count = sc[s] ?? 0;
                                    const pct = totalInvoicesWithStatus > 0 ? Math.round((count / totalInvoicesWithStatus) * 100) : 0;
                                    return (
                                        <Link
                                            key={s}
                                            href={route('invoices.index', { status: s })}
                                            className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3 hover:border-slate-200 hover:bg-slate-50 transition-colors"
                                        >
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[s]}`}>
                                                {statusLabels[s]}
                                            </span>
                                            <span className="text-lg font-bold text-slate-800">{count.toLocaleString()}</span>
                                            <span className="text-xs text-slate-400">{pct}%</span>
                                        </Link>
                                    );
                                })}
                            </div>
                            {/* Progress bar */}
                            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                {(['overdue', 'unpaid', 'pending', 'paid'] as InvoiceStatus[]).map((s) => {
                                    const pct = totalInvoicesWithStatus > 0
                                        ? ((sc[s] ?? 0) / totalInvoicesWithStatus) * 100
                                        : 0;
                                    const colors: Record<InvoiceStatus, string> = {
                                        overdue: 'bg-red-400',
                                        unpaid: 'bg-slate-300',
                                        pending: 'bg-purple-400',
                                        paid: 'bg-brand-400',
                                    };
                                    return pct > 0 ? (
                                        <div key={s} className={`${colors[s]} transition-all`} style={{ width: `${pct}%` }} />
                                    ) : null;
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Two-column: Needs Action + Recent Payments ─────────── */}
                    <div className="grid gap-6 lg:grid-cols-2">

                        {/* Needs Action */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">Needs Action</h3>
                                    <p className="text-xs text-slate-400">Unpaid &amp; overdue invoices</p>
                                </div>
                                <Link
                                    href={route('invoices.index', { status: 'overdue' })}
                                    className="text-xs text-brand-700 hover:text-brand-900"
                                >
                                    View all →
                                </Link>
                            </div>
                            {stats.needs_action_invoices.length === 0 ? (
                                <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                                    <svg className="mb-2 h-8 w-8 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm font-medium text-slate-600">All caught up!</p>
                                    <p className="text-xs text-slate-400">No unpaid or overdue invoices.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {stats.needs_action_invoices.map((invoice: InvoiceRow) => (
                                        <li key={invoice.id} className="group flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={route('invoices.show', invoice.id)}
                                                        className="text-sm font-medium text-brand-700 hover:text-brand-900"
                                                    >
                                                        {invoice.invoice_number}
                                                    </Link>
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[invoice.status]}`}>
                                                        {statusLabels[invoice.status]}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                                                    <Link
                                                        href={route('clients.show', invoice.client.id)}
                                                        className="hover:text-brand-700"
                                                    >
                                                        {patientName(invoice.client)}
                                                    </Link>
                                                    {invoice.service_date && (
                                                        <>
                                                            <span>·</span>
                                                            <span>{fmtDate(invoice.service_date)}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-red-600">
                                                    {fmt(Number(invoice.amount_due) - Number(invoice.amount_paid))}
                                                </p>
                                                {!invoice.stripe_payment_link && (
                                                    <Link
                                                        href={route('invoices.show', invoice.id)}
                                                        className="text-xs text-slate-400 hover:text-purple-700"
                                                    >
                                                        Get link →
                                                    </Link>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Recent Payments */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">Recent Payments</h3>
                                    <p className="text-xs text-slate-400">Latest paid invoices</p>
                                </div>
                                <Link
                                    href={route('invoices.index', { status: 'paid' })}
                                    className="text-xs text-brand-700 hover:text-brand-900"
                                >
                                    View all →
                                </Link>
                            </div>
                            {stats.recent_payments.length === 0 ? (
                                <div className="px-6 py-10 text-center text-sm text-slate-500">
                                    No payments recorded yet.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {stats.recent_payments.map((invoice: InvoiceRow) => (
                                        <li key={invoice.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={route('invoices.show', invoice.id)}
                                                        className="text-sm font-medium text-brand-700 hover:text-brand-900"
                                                    >
                                                        {invoice.invoice_number}
                                                    </Link>
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[invoice.status]}`}>
                                                        {statusLabels[invoice.status]}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                                                    <Link
                                                        href={route('clients.show', invoice.client.id)}
                                                        className="hover:text-brand-700"
                                                    >
                                                        {patientName(invoice.client)}
                                                    </Link>
                                                    {invoice.service_date && (
                                                        <>
                                                            <span>·</span>
                                                            <span>{fmtDate(invoice.service_date)}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="shrink-0 text-sm font-semibold text-brand-700">
                                                {fmt(invoice.amount_paid)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* ── Quick actions ─────────────────────────────────────── */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Quick Actions</h3>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href={route('clients.create')}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Add Patient
                            </Link>
                            <Link
                                href={route('clients.import')}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import Patients
                            </Link>
                            <Link
                                href={route('invoices.create')}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                New Invoice
                            </Link>
                            <Link
                                href={route('clients.index')}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                All Patients
                            </Link>
                            <Link
                                href={route('invoices.index')}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                All Invoices
                            </Link>
                            {stats.needs_action_count > 0 && (
                                <Link
                                    href={route('invoices.index', { status: 'overdue' })}
                                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    {stats.needs_action_count} Overdue
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
