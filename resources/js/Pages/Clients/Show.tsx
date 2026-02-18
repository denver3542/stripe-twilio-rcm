import DangerButton from '@/Components/DangerButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    AccountStatus, Client, Encounter, Invoice, InvoiceStatus,
    PatientAuthorization, PatientInsurance, PageProps,
} from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const accountStatusColors: Record<AccountStatus, string> = {
    active:   'bg-brand-50 text-brand-700 border border-brand-200',
    inactive: 'bg-red-50 text-red-700 border border-red-200',
    pending:  'bg-amber-50 text-amber-700 border border-amber-200',
};

const invoiceStatusColors: Record<InvoiceStatus, string> = {
    paid:    'bg-brand-50 text-brand-700 border border-brand-200',
    unpaid:  'bg-slate-100 text-slate-600 border border-slate-200',
    pending: 'bg-purple-50 text-purple-700 border border-purple-200',
    overdue: 'bg-red-50 text-red-700 border border-red-200',
};

function displayName(client: Client): string {
    if (client.name) return client.name;
    const parts = [client.prefix, client.first_name, client.middle_name, client.last_name, client.suffix].filter(Boolean);
    return parts.length ? parts.join(' ') : 'Unknown Patient';
}

function formatPhone(phone: string | null | undefined): string {
    if (!phone) return '—';
    const d = phone.replace(/\D/g, '');
    return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone;
}

function fmt(amount: number | null | undefined): string {
    return `$${Number(amount ?? 0).toFixed(2)}`;
}

function fmtDate(date: string | null | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Detail({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
    return (
        <div className={wide ? 'sm:col-span-2 lg:col-span-3' : ''}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 text-sm text-slate-800">{value || <span className="text-slate-300">—</span>}</dd>
        </div>
    );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
    return <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{children}</h4>;
}

function InsuranceCard({ ins }: { ins: PatientInsurance }) {
    const isPrimary = ins.type === 'primary';
    return (
        <div className={`rounded-lg border p-4 ${isPrimary ? 'border-brand-200 bg-brand-50' : 'border-purple-200 bg-purple-50'}`}>
            <div className="mb-3 flex items-center justify-between">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${isPrimary ? 'bg-brand-100 text-brand-700' : 'bg-purple-100 text-purple-700'}`}>
                    {isPrimary ? 'Primary' : 'Secondary'}
                </span>
                {ins.policy_number && <span className="text-xs text-slate-500">Policy: {ins.policy_number}</span>}
            </div>
            <p className="font-medium text-slate-900">{ins.company_name ?? '—'}</p>
            {ins.plan_name && <p className="text-sm text-slate-600">{ins.plan_name}</p>}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {ins.group_number    && <div><dt className="text-xs text-slate-400">Group #</dt><dd className="text-slate-700">{ins.group_number}</dd></div>}
                {ins.insured_full_name && <div><dt className="text-xs text-slate-400">Insured</dt><dd className="text-slate-700">{ins.insured_full_name}</dd></div>}
                {ins.insured_relationship && <div><dt className="text-xs text-slate-400">Relationship</dt><dd className="text-slate-700">{ins.insured_relationship}</dd></div>}
                {ins.insured_id_number   && <div><dt className="text-xs text-slate-400">Insured ID</dt><dd className="text-slate-700">{ins.insured_id_number}</dd></div>}
                {ins.effective_start_date && (
                    <div className="col-span-2">
                        <dt className="text-xs text-slate-400">Effective</dt>
                        <dd className="text-slate-700">{fmtDate(ins.effective_start_date)}{ins.effective_end_date ? ` – ${fmtDate(ins.effective_end_date)}` : ''}</dd>
                    </div>
                )}
                {(ins.city || ins.state) && (
                    <div><dt className="text-xs text-slate-400">Plan Location</dt><dd className="text-slate-700">{[ins.city, ins.state].filter(Boolean).join(', ')}</dd></div>
                )}
            </dl>
        </div>
    );
}

function AuthCard({ auth }: { auth: PatientAuthorization }) {
    const used  = auth.number_of_visits_used ?? 0;
    const total = auth.number_of_visits      ?? 0;
    const pct   = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    const bar   = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-500';

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-medium text-slate-900">{auth.auth_number ?? 'No Auth #'}</p>
                    {auth.insurance_plan_name && <p className="text-xs text-slate-500">{auth.insurance_plan_name}</p>}
                </div>
                {total > 0 && (
                    <span className={`text-xs font-semibold ${pct >= 90 ? 'text-red-600' : 'text-slate-500'}`}>
                        {used}/{total} visits
                    </span>
                )}
            </div>
            {total > 0 && (
                <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
                    <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                </div>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {auth.start_date && <div><dt className="text-slate-400">Start</dt><dd className="text-slate-700">{fmtDate(auth.start_date)}</dd></div>}
                {auth.end_date   && <div><dt className="text-slate-400">End</dt><dd className="text-slate-700">{fmtDate(auth.end_date)}</dd></div>}
                {auth.contact_fullname && (
                    <div className="col-span-2">
                        <dt className="text-slate-400">Contact</dt>
                        <dd className="text-slate-700">{auth.contact_fullname}{auth.contact_phone ? ` · ${formatPhone(auth.contact_phone)}` : ''}</dd>
                    </div>
                )}
                {auth.notes && (
                    <div className="col-span-2"><dt className="text-slate-400">Notes</dt><dd className="whitespace-pre-wrap text-slate-700">{auth.notes}</dd></div>
                )}
            </dl>
        </div>
    );
}

type Tab = 'overview' | 'insurance' | 'authorizations' | 'encounters' | 'invoices';

type ShowClient = Client & {
    invoices: Invoice[];
    patient_insurances: PatientInsurance[];
    patient_authorizations: PatientAuthorization[];
    encounters: Encounter[];
};

export default function Show({ client }: PageProps<{ client: ShowClient }>) {
    const { delete: destroy, processing } = useForm({});
    const [tab, setTab] = useState<Tab>('overview');

    const insurances     = client.patient_insurances     ?? [];
    const authorizations = client.patient_authorizations ?? [];
    const encounters     = client.encounters             ?? [];
    const invoices       = client.invoices               ?? [];
    const hasImportedData = !!client.external_patient_id;

    function handleDelete() {
        if (confirm(`Delete "${displayName(client)}"? This will also delete all associated records.`)) {
            destroy(route('clients.destroy', client.id));
        }
    }

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'overview',       label: 'Overview' },
        { id: 'insurance',      label: 'Insurance',      count: insurances.length     || undefined },
        { id: 'authorizations', label: 'Authorizations', count: authorizations.length || undefined },
        { id: 'encounters',     label: 'Encounters',     count: encounters.length     || undefined },
        { id: 'invoices',       label: 'Invoices',       count: invoices.length       || undefined },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Link href={route('clients.index')} className="hover:text-slate-600">Clients</Link>
                            <span>/</span>
                        </div>
                        <h2 className="mt-0.5 text-xl font-semibold leading-tight text-slate-900">{displayName(client)}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${accountStatusColors[client.account_status]}`}>
                                {client.account_status}
                            </span>
                            {client.external_patient_id && <span className="text-xs text-slate-400">ID #{client.external_patient_id}</span>}
                            {client.date_of_birth       && <span className="text-xs text-slate-400">DOB {fmtDate(client.date_of_birth)}</span>}
                            {client.gender              && <span className="text-xs text-slate-400">{client.gender}</span>}
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Link href={route('clients.edit', client.id)}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700 shadow-sm transition hover:bg-slate-50">
                            Edit
                        </Link>
                        <DangerButton onClick={handleDelete} disabled={processing}>Delete</DangerButton>
                    </div>
                </div>
            }
        >
            <Head title={displayName(client)} />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 sm:px-6 lg:px-8">

                    {/* Financial summary bar */}
                    {hasImportedData && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="grid divide-x divide-slate-100 grid-cols-3 sm:grid-cols-6">
                                {([
                                    { label: 'Charges',        value: client.charges,           color: 'text-slate-700' },
                                    { label: 'Adjustments',    value: client.adjustments,        color: 'text-slate-700' },
                                    { label: 'Ins. Payments',  value: client.insurance_payments, color: 'text-brand-700' },
                                    { label: 'Pat. Payments',  value: client.patient_payments,   color: 'text-brand-700' },
                                    { label: 'Ins. Balance',   value: client.insurance_balance,  color: Number(client.insurance_balance) > 0 ? 'text-amber-600' : 'text-slate-400' },
                                    { label: 'Pat. Balance',   value: client.patient_balance,    color: Number(client.patient_balance)   > 0 ? 'text-red-600'   : 'text-slate-400' },
                                ] as const).map(({ label, value, color }) => (
                                    <div key={label} className="px-4 py-3 text-center">
                                        <p className={`text-lg font-semibold ${color}`}>{fmt(value)}</p>
                                        <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-400">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabbed card */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {/* Tab nav */}
                        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50">
                            {tabs.map(({ id, label, count }) => (
                                <button key={id} onClick={() => setTab(id)}
                                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-5 py-3 text-sm font-medium transition ${
                                        tab === id
                                            ? 'border-brand-600 bg-white text-brand-700'
                                            : 'border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-700'
                                    }`}>
                                    {label}
                                    {count !== undefined && (
                                        <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${tab === id ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500'}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">

                            {/* Overview */}
                            {tab === 'overview' && (
                                <div className="space-y-8">
                                    <section>
                                        <SectionHeader>Demographics</SectionHeader>
                                        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <Detail label="Full Name"       value={displayName(client)} />
                                            <Detail label="Date of Birth"   value={fmtDate(client.date_of_birth)} />
                                            <Detail label="Gender"          value={client.gender} />
                                            <Detail label="Marital Status"  value={client.marital_status} />
                                            <Detail label="Employment"      value={client.employment_status} />
                                            <Detail label="Employer"        value={client.employer_name} />
                                            {client.ssn && <Detail label="SSN" value={`***-**-${client.ssn.slice(-4)}`} />}
                                            {client.medical_record_number && <Detail label="Medical Record #" value={client.medical_record_number} />}
                                            {client.referral_source && <Detail label="Referral Source" value={client.referral_source} />}
                                        </dl>
                                    </section>

                                    <section>
                                        <SectionHeader>Contact</SectionHeader>
                                        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <Detail label="Mobile"
                                                value={client.mobile_phone ? <a href={`tel:${client.mobile_phone}`} className="text-brand-700 hover:underline">{formatPhone(client.mobile_phone)}</a> : null} />
                                            <Detail label="Home Phone"
                                                value={client.home_phone ? <a href={`tel:${client.home_phone}`} className="text-brand-700 hover:underline">{formatPhone(client.home_phone)}</a> : null} />
                                            <Detail label="Work Phone"
                                                value={client.work_phone ? <a href={`tel:${client.work_phone}`} className="text-brand-700 hover:underline">{formatPhone(client.work_phone)}</a> : null} />
                                            <Detail label="Email"
                                                value={client.email ? <a href={`mailto:${client.email}`} className="text-brand-700 hover:underline">{client.email}</a> : null} />
                                            {client.contact_name && <Detail label="Responsible Party" value={client.contact_name} />}
                                        </dl>
                                    </section>

                                    {(client.address_line1 || client.city) && (
                                        <section>
                                            <SectionHeader>Address</SectionHeader>
                                            <address className="not-italic text-sm leading-relaxed text-slate-800">
                                                {client.address_line1 && <div>{client.address_line1}</div>}
                                                {client.address_line2 && <div>{client.address_line2}</div>}
                                                <div>{[client.city, client.state, client.zip_code].filter(Boolean).join(' ')}</div>
                                                {client.country && client.country !== 'US' && <div>{client.country}</div>}
                                            </address>
                                        </section>
                                    )}

                                    {(client.rendering_provider || client.primary_care_physician || client.referring_provider || client.service_location) && (
                                        <section>
                                            <SectionHeader>Care Team &amp; Location</SectionHeader>
                                            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                                <Detail label="Rendering Provider"     value={client.rendering_provider} />
                                                <Detail label="Primary Care Physician" value={client.primary_care_physician} />
                                                <Detail label="Referring Provider"     value={client.referring_provider} />
                                                <Detail label="Service Location"       value={client.service_location} />
                                                <Detail label="Payer Scenario"         value={client.payer_scenario} />
                                                <Detail label="Insurance Type"         value={client.insurance_type_name} />
                                            </dl>
                                        </section>
                                    )}

                                    {client.insurance_info && !hasImportedData && (
                                        <section>
                                            <SectionHeader>Insurance Info</SectionHeader>
                                            <p className="whitespace-pre-wrap text-sm text-slate-800">{client.insurance_info}</p>
                                        </section>
                                    )}
                                </div>
                            )}

                            {/* Insurance */}
                            {tab === 'insurance' && (
                                insurances.length === 0
                                    ? <p className="py-8 text-center text-sm text-slate-400">No insurance records on file.</p>
                                    : <div className="grid gap-4 sm:grid-cols-2">{insurances.map((ins) => <InsuranceCard key={ins.id} ins={ins} />)}</div>
                            )}

                            {/* Authorizations */}
                            {tab === 'authorizations' && (
                                authorizations.length === 0
                                    ? <p className="py-8 text-center text-sm text-slate-400">No authorizations on file.</p>
                                    : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{authorizations.map((auth) => <AuthCard key={auth.id} auth={auth} />)}</div>
                            )}

                            {/* Encounters */}
                            {tab === 'encounters' && (
                                encounters.length === 0
                                    ? <p className="py-8 text-center text-sm text-slate-400">No encounter records on file.</p>
                                    : (
                                        <div className="overflow-x-auto -mx-6 px-6">
                                            <table className="min-w-full divide-y divide-slate-100 text-sm">
                                                <thead>
                                                    <tr>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Enc. ID</th>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Procedure</th>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Diagnosis</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {encounters.map((enc: Encounter) => {
                                                        const [procCode, ...procDesc] = (enc.procedure_code ?? '').split(' - ');
                                                        const [diagCode, ...diagDesc] = (enc.diagnosis_code ?? '').split(' - ');
                                                        return (
                                                            <tr key={enc.id} className="hover:bg-slate-50">
                                                                <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600">{fmtDate(enc.encounter_date)}</td>
                                                                <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-slate-400">{enc.external_encounter_id ?? '—'}</td>
                                                                <td className="py-2.5 pr-4 max-w-xs">
                                                                    {enc.procedure_code
                                                                        ? <><span className="font-medium text-slate-700">{procCode}</span>{procDesc.length > 0 && <span className="text-slate-400"> — {procDesc.join(' - ')}</span>}</>
                                                                        : <span className="text-slate-300">—</span>}
                                                                </td>
                                                                <td className="py-2.5 max-w-xs">
                                                                    {enc.diagnosis_code
                                                                        ? <><span className="font-medium text-slate-500">{diagCode}</span>{diagDesc.length > 0 && <span className="text-slate-400"> — {diagDesc.join(' - ')}</span>}</>
                                                                        : <span className="text-slate-300">—</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                            )}

                            {/* Invoices */}
                            {tab === 'invoices' && (
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <p className="text-sm text-slate-500">
                                            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                                            {invoices.length === 20 ? ' (most recent 20)' : ''}
                                        </p>
                                        <Link href={`${route('invoices.create')}?client_id=${client.id}`}
                                            className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700">
                                            + New Invoice
                                        </Link>
                                    </div>
                                    {invoices.length === 0
                                        ? <p className="py-8 text-center text-sm text-slate-400">No invoices for this client yet.</p>
                                        : (
                                            <div className="overflow-x-auto -mx-6 px-6">
                                                <table className="min-w-full divide-y divide-slate-100 text-sm">
                                                    <thead>
                                                        <tr>
                                                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice #</th>
                                                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                                                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Amount Due</th>
                                                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Paid</th>
                                                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {invoices.map((invoice) => (
                                                            <tr key={invoice.id} className="hover:bg-slate-50">
                                                                <td className="whitespace-nowrap py-2.5 pr-4">
                                                                    <Link href={route('invoices.show', invoice.id)} className="font-medium text-brand-700 hover:text-brand-900">{invoice.invoice_number}</Link>
                                                                </td>
                                                                <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600">{invoice.service_date}</td>
                                                                <td className="whitespace-nowrap py-2.5 pr-4 text-slate-900">{fmt(invoice.amount_due)}</td>
                                                                <td className="whitespace-nowrap py-2.5 pr-4 text-slate-900">{fmt(invoice.amount_paid)}</td>
                                                                <td className="whitespace-nowrap py-2.5">
                                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${invoiceStatusColors[invoice.status]}`}>{invoice.status}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
