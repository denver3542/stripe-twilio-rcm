import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps, PaginatedData, RcmLogEvent, RcmLogStats, RcmLogStatus, RcmUpdateLog } from "@/types";
import { Head, Link, router } from "@inertiajs/react";
import { useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-US", {
        month:  "short",
        day:    "numeric",
        year:   "numeric",
        hour:   "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function clientName(log: RcmUpdateLog): string {
    if (!log.client) return "—";
    if (log.client.name) return log.client.name;
    const parts = [log.client.first_name, log.client.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : "—";
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RcmLogStatus, string> = {
    success:         "bg-brand-50 text-brand-700 ring-brand-200",
    retried_success: "bg-blue-50 text-blue-700 ring-blue-200",
    failed:          "bg-red-50 text-red-700 ring-red-200",
    retried_failed:  "bg-orange-50 text-orange-700 ring-orange-200",
    skipped:         "bg-slate-100 text-slate-500 ring-slate-200",
};

const STATUS_LABELS: Record<RcmLogStatus, string> = {
    success:         "Success",
    retried_success: "Success (retried)",
    failed:          "Failed",
    retried_failed:  "Failed (retried)",
    skipped:         "Skipped",
};

const EVENT_STYLES: Record<RcmLogEvent, string> = {
    auth_token_fetch:      "bg-stripe/10 text-stripe ring-stripe/20",
    patient_status_update: "bg-twilio/10 text-twilio ring-twilio/20",
};

const EVENT_LABELS: Record<RcmLogEvent, string> = {
    auth_token_fetch:      "Token Fetch",
    patient_status_update: "Status Update",
};

function StatusBadge({ status }: { status: RcmLogStatus }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
        </span>
    );
}

function EventBadge({ event }: { event: RcmLogEvent }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${EVENT_STYLES[event]}`}>
            {EVENT_LABELS[event]}
        </span>
    );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ log }: { log: RcmUpdateLog }) {
    return (
        <div className="space-y-4 px-6 py-4 bg-slate-50 border-t border-slate-100">
            {/* Error */}
            {log.error_message && (
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-red-500">Error</p>
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-inset ring-red-200">
                        {log.error_message}
                    </p>
                </div>
            )}

            {/* HTTP Details */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">HTTP Status</p>
                    <p className={`mt-1 text-sm font-mono font-bold ${
                        log.http_status && log.http_status >= 200 && log.http_status < 300
                            ? "text-brand-700"
                            : log.http_status
                            ? "text-red-600"
                            : "text-slate-400"
                    }`}>
                        {log.http_status ?? "—"}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Triggered By</p>
                    <p className="mt-1 text-sm capitalize text-slate-700">{log.triggered_by}</p>
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Retried</p>
                    <p className={`mt-1 text-sm font-medium ${log.retried ? "text-orange-600" : "text-slate-400"}`}>
                        {log.retried ? "Yes" : "No"}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Log ID</p>
                    <p className="mt-1 font-mono text-sm text-slate-500">#{log.id}</p>
                </div>
            </div>

            {/* Request Payload */}
            {log.request_payload && (
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Request Payload</p>
                    <pre className="overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs text-slate-100 ring-1 ring-inset ring-slate-700">
                        {JSON.stringify(log.request_payload, null, 2)}
                    </pre>
                </div>
            )}

            {/* Response Body */}
            {log.response_body && (
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Response Body</p>
                    <pre className="overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs text-slate-100 ring-1 ring-inset ring-slate-700 whitespace-pre-wrap break-all">
                        {(() => {
                            try {
                                return JSON.stringify(JSON.parse(log.response_body!), null, 2);
                            } catch {
                                return log.response_body;
                            }
                        })()}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

interface Filters {
    status: string;
    event: string;
    from: string;
    to: string;
    patient_id: string;
}

function FilterBar({ filters }: { filters: Filters }) {
    const [local, setLocal] = useState<Filters>(filters);

    function apply() {
        router.get(route("rcm-logs.index"), local as Record<string, string>, { preserveScroll: true });
    }

    function clear() {
        const empty: Filters = { status: "", event: "", from: "", to: "", patient_id: "" };
        setLocal(empty);
        router.get(route("rcm-logs.index"), {}, { preserveScroll: true });
    }

    const hasActive = Object.values(local).some(Boolean);

    return (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            {/* Status */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Status</label>
                <select
                    value={local.status}
                    onChange={e => setLocal(p => ({ ...p, status: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                    <option value="">All</option>
                    <option value="success">Success</option>
                    <option value="retried_success">Success (retried)</option>
                    <option value="failed">Failed</option>
                    <option value="retried_failed">Failed (retried)</option>
                    <option value="skipped">Skipped</option>
                </select>
            </div>

            {/* Event */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Event</label>
                <select
                    value={local.event}
                    onChange={e => setLocal(p => ({ ...p, event: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                    <option value="">All</option>
                    <option value="patient_status_update">Status Update</option>
                    <option value="auth_token_fetch">Token Fetch</option>
                </select>
            </div>

            {/* Patient ID */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Patient ID</label>
                <input
                    type="text"
                    value={local.patient_id}
                    onChange={e => setLocal(p => ({ ...p, patient_id: e.target.value }))}
                    placeholder="Search…"
                    className="w-36 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
            </div>

            {/* From */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">From</label>
                <input
                    type="date"
                    value={local.from}
                    onChange={e => setLocal(p => ({ ...p, from: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
            </div>

            {/* To */}
            <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">To</label>
                <input
                    type="date"
                    value={local.to}
                    onChange={e => setLocal(p => ({ ...p, to: e.target.value }))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={apply}
                    className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                    Apply
                </button>
                {hasActive && (
                    <button
                        onClick={clear}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 focus:outline-none"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    color = "slate",
    sub,
}: {
    label: string;
    value: number;
    color?: "green" | "red" | "orange" | "blue" | "slate" | "purple";
    sub?: string;
}) {
    const colors: Record<string, string> = {
        green:  "text-brand-700",
        red:    "text-red-600",
        orange: "text-orange-600",
        blue:   "text-blue-600",
        slate:  "text-slate-600",
        purple: "text-stripe",
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value.toLocaleString()}</p>
            {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Props = PageProps<{
    logs: PaginatedData<RcmUpdateLog>;
    stats: RcmLogStats;
    filters: Filters;
}>;

export default function RcmLogsIndex({ logs, stats, filters }: Props) {
    const [expanded, setExpanded] = useState<number | null>(null);

    function toggle(id: number) {
        setExpanded(prev => (prev === id ? null : id));
    }

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">RCM Portal Logs</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Track every attempt to update patient status in the RCM portal.
                    </p>
                </div>
            }
        >
            <Head title="RCM Portal Logs" />

            <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">

                {/* ── Stats ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <StatCard label="Total" value={stats.total} color="slate" />
                    <StatCard label="Success" value={stats.success} color="green" sub="incl. retried" />
                    <StatCard label="Failed" value={stats.failed} color="red" sub="incl. retried" />
                    <StatCard label="Skipped" value={stats.skipped} color="slate" sub="no token" />
                    <StatCard label="Retried" value={stats.retried} color="orange" sub="any outcome" />
                    <StatCard label="Token Failures" value={stats.token_failures} color="purple" sub="auth errors" />
                </div>

                {/* ── Filters ── */}
                <FilterBar filters={filters} />

                {/* ── Table ── */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {logs.data.length === 0 ? (
                        <div className="py-20 text-center">
                            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-3 text-sm font-medium text-slate-400">No logs found</p>
                            <p className="mt-1 text-xs text-slate-300">RCM update attempts will appear here once triggered.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 sm:pl-6">
                                        Time
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Event
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Patient
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Client
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Status
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        HTTP
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Error
                                    </th>
                                    <th className="py-3 pl-3 pr-4 sm:pr-6" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {logs.data.map(log => (
                                    <>
                                        <tr
                                            key={log.id}
                                            onClick={() => toggle(log.id)}
                                            className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                                                expanded === log.id ? "bg-slate-50" : ""
                                            }`}
                                        >
                                            {/* Time */}
                                            <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                                                <p className="text-xs font-medium text-slate-700">{fmtDateTime(log.created_at)}</p>
                                            </td>

                                            {/* Event */}
                                            <td className="whitespace-nowrap px-3 py-3">
                                                <EventBadge event={log.event} />
                                            </td>

                                            {/* Patient ID */}
                                            <td className="px-3 py-3">
                                                <span className="font-mono text-xs text-slate-600">
                                                    {log.patient_id ?? <span className="text-slate-300">—</span>}
                                                </span>
                                            </td>

                                            {/* Client */}
                                            <td className="px-3 py-3">
                                                {log.client ? (
                                                    <Link
                                                        href={route("clients.show", log.client.id)}
                                                        onClick={e => e.stopPropagation()}
                                                        className="text-xs font-medium text-brand-700 hover:text-brand-900 hover:underline"
                                                    >
                                                        {clientName(log)}
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="whitespace-nowrap px-3 py-3">
                                                <StatusBadge status={log.status} />
                                            </td>

                                            {/* HTTP status */}
                                            <td className="whitespace-nowrap px-3 py-3">
                                                {log.http_status ? (
                                                    <span className={`font-mono text-xs font-bold ${
                                                        log.http_status >= 200 && log.http_status < 300
                                                            ? "text-brand-600"
                                                            : "text-red-600"
                                                    }`}>
                                                        {log.http_status}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>

                                            {/* Error (truncated) */}
                                            <td className="max-w-xs px-3 py-3">
                                                {log.error_message ? (
                                                    <p className="truncate text-xs text-red-600" title={log.error_message}>
                                                        {log.error_message}
                                                    </p>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </td>

                                            {/* Expand chevron */}
                                            <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right sm:pr-6">
                                                <svg
                                                    className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${
                                                        expanded === log.id ? "rotate-180" : ""
                                                    }`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </td>
                                        </tr>

                                        {/* Expanded detail row */}
                                        {expanded === log.id && (
                                            <tr key={`detail-${log.id}`}>
                                                <td colSpan={8} className="p-0">
                                                    <DetailPanel log={log} />
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Pagination ── */}
                {logs.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing {logs.from}–{logs.to} of {logs.total.toLocaleString()} entries
                        </p>
                        <div className="flex gap-1">
                            {logs.links.map((link, i) => (
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        preserveScroll
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                            link.active
                                                ? "bg-brand-600 text-white"
                                                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        }`}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300"
                                    />
                                )
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
