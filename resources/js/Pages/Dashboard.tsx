import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Client, DashboardStats, PageProps, PaymentLink } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number | string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
}

function fmtDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

function patientName(client: Client): string {
    if (client.name) return client.name;
    const parts = [client.first_name, client.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string;
    sub?: string;
    accent: string;
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

type RecentPaymentRow = PaymentLink & { client: Client };

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard({ stats }: PageProps<{ stats: DashboardStats }>) {
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
                            href={route('clients.index')}
                            className="inline-flex items-center rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700"
                        >
                            View Patients
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
                            sub="Sum of pending payment links"
                            accent="border-l-red-400"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Paid This Month"
                            value={fmt(stats.total_paid_this_month)}
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
                            sub="Registered patients"
                            accent="border-l-slate-400"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="Active Links"
                            value={stats.pending_count.toLocaleString()}
                            sub="Pending payment links"
                            accent="border-l-amber-400"
                            icon={
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            }
                        />
                    </div>

                    {/* ── Recent Payments ───────────────────────────────────── */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">Recent Payments</h3>
                                <p className="text-xs text-slate-400">Latest paid payment links</p>
                            </div>
                            <Link
                                href={route('clients.index')}
                                className="text-xs text-brand-700 hover:text-brand-900"
                            >
                                View all patients →
                            </Link>
                        </div>
                        {stats.recent_paid.length === 0 ? (
                            <div className="px-6 py-10 text-center text-sm text-slate-500">
                                No payments recorded yet.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {stats.recent_paid.map((link: RecentPaymentRow) => (
                                    <li key={link.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={route('clients.show', link.client_id)}
                                                    className="text-sm font-medium text-brand-700 hover:text-brand-900"
                                                >
                                                    {patientName(link.client)}
                                                </Link>
                                                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
                                                    Paid
                                                </span>
                                            </div>
                                            {link.description && (
                                                <p className="mt-0.5 text-xs text-slate-400">{link.description}</p>
                                            )}
                                            <p className="mt-0.5 text-xs text-slate-400">{fmtDate(link.paid_at)}</p>
                                        </div>
                                        <p className="shrink-0 text-sm font-semibold text-brand-700">
                                            {fmt(link.amount)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
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
                                href={route('clients.index')}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                All Patients
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
