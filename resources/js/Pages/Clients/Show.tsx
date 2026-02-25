import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    AccountStatus, Client, ClientPayment, Encounter,
    PatientAuthorization, PatientInsurance, PageProps, PaymentLink, PaymentSmsStatus, PaymentStatus,
} from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const accountStatusColors: Record<AccountStatus, string> = {
    active:   'bg-brand-50 text-brand-700 border border-brand-200',
    inactive: 'bg-red-50 text-red-700 border border-red-200',
    pending:  'bg-amber-50 text-amber-700 border border-amber-200',
};

const paymentStatusColors: Record<PaymentStatus, string> = {
    paid:    'bg-brand-50 text-brand-700 border border-brand-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    failed:  'bg-red-50 text-red-700 border border-red-200',
    expired: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const smsStatusColors: Record<PaymentSmsStatus, string> = {
    not_sent: 'bg-slate-100 text-slate-500 border border-slate-200',
    sent:     'bg-brand-50 text-brand-700 border border-brand-200',
    failed:   'bg-red-50 text-red-700 border border-red-200',
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

function fmt(amount: number | string | null | undefined): string {
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

type Tab = 'overview' | 'insurance' | 'authorizations' | 'encounters' | 'payment-links' | 'payments';

type ShowClient = Client & {
    payment_links: PaymentLink[];
    patient_insurances: PatientInsurance[];
    patient_authorizations: PatientAuthorization[];
    encounters: Encounter[];
    client_payments: ClientPayment[];
};

export default function Show({ client }: PageProps<{ client: ShowClient }>) {
    const { flash } = usePage<PageProps>().props;
    const { delete: destroy, processing } = useForm({});
    const [tab, setTab] = useState<Tab>('overview');
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    const insurances     = client.patient_insurances     ?? [];
    const authorizations = client.patient_authorizations ?? [];
    const encounters     = client.encounters             ?? [];
    const paymentLinks   = client.payment_links          ?? [];
    const payments       = client.client_payments        ?? [];
    const hasImportedData = !!client.external_patient_id;

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

    // Default amount for new link = patient_balance if > 0, else outstanding_balance
    const defaultAmount = Number(client.patient_balance) > 0
        ? client.patient_balance
        : client.outstanding_balance;

    const generateForm = useForm({
        amount:      String(Number(defaultAmount ?? 0).toFixed(2)),
        description: '',
    });

    function handleDelete() {
        if (confirm(`Delete "${displayName(client)}"? This will also delete all associated records.`)) {
            destroy(route('clients.destroy', client.id));
        }
    }

    function submitGenerateLink(e: React.FormEvent) {
        e.preventDefault();
        generateForm.post(route('payment-links.store', client.id), {
            onSuccess: () => {
                setShowGenerateModal(false);
                generateForm.reset();
            },
        });
    }

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'overview',       label: 'Overview' },
        { id: 'insurance',      label: 'Insurance',      count: insurances.length     || undefined },
        { id: 'authorizations', label: 'Authorizations', count: authorizations.length || undefined },
        { id: 'encounters',     label: 'Encounters',     count: encounters.length     || undefined },
        { id: 'payment-links',  label: 'Payment Links',  count: paymentLinks.length   || undefined },
        { id: 'payments',       label: 'Payments',       count: payments.length       || undefined },
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

                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {flash.error}
                        </div>
                    )}

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

                            {/* Payment Links */}
                            {tab === 'payment-links' && (
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <p className="text-sm text-slate-500">
                                            {paymentLinks.length} payment link{paymentLinks.length !== 1 ? 's' : ''}
                                        </p>
                                        <button
                                            onClick={() => setShowGenerateModal(true)}
                                            className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700"
                                        >
                                            + Generate New Link
                                        </button>
                                    </div>
                                    {paymentLinks.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-slate-400">No payment links yet. Generate one above.</p>
                                    ) : (
                                        <div className="overflow-x-auto -mx-6 px-6">
                                            <table className="min-w-full divide-y divide-slate-100 text-sm">
                                                <thead>
                                                    <tr>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Description</th>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Payment</th>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">SMS</th>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Paid At</th>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Link</th>
                                                        <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {paymentLinks.map((link: PaymentLink) => (
                                                        <tr key={link.id} className="hover:bg-slate-50">
                                                            <td className="whitespace-nowrap py-2.5 pr-4 font-semibold text-slate-900">
                                                                {fmt(link.amount)}
                                                            </td>
                                                            <td className="py-2.5 pr-4 text-slate-600 max-w-[160px] truncate">
                                                                {link.description ?? <span className="text-slate-300">—</span>}
                                                            </td>
                                                            <td className="whitespace-nowrap py-2.5 pr-4">
                                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentStatusColors[link.payment_status]}`}>
                                                                    {link.payment_status}
                                                                </span>
                                                            </td>
                                                            <td className="whitespace-nowrap py-2.5 pr-4">
                                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${smsStatusColors[link.sms_status]}`}>
                                                                    {link.sms_status === 'not_sent' ? 'not sent' : link.sms_status}
                                                                </span>
                                                            </td>
                                                            <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500 text-xs">
                                                                {fmtDate(link.paid_at)}
                                                            </td>
                                                            <td className="py-2.5 pr-4">
                                                                {link.stripe_payment_link_url ? (
                                                                    <a
                                                                        href={link.stripe_payment_link_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-xs text-stripe-600 hover:underline"
                                                                    >
                                                                        Open ↗
                                                                    </a>
                                                                ) : <span className="text-slate-300">—</span>}
                                                            </td>
                                                            <td className="whitespace-nowrap py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    {link.payment_status === 'pending' && link.sms_status !== 'sent' && (
                                                                        <Link
                                                                            href={route('payment-links.send-sms', link.id)}
                                                                            method="post"
                                                                            as="button"
                                                                            className="text-xs font-medium text-brand-700 hover:text-brand-900"
                                                                        >
                                                                            Send SMS
                                                                        </Link>
                                                                    )}
                                                                    <Link
                                                                        href={route('payment-links.destroy', link.id)}
                                                                        method="delete"
                                                                        as="button"
                                                                        onBefore={() => confirm('Delete this payment link?')}
                                                                        className="text-xs font-medium text-red-600 hover:text-red-800"
                                                                    >
                                                                        Delete
                                                                    </Link>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payments */}
                            {tab === 'payments' && (
                                <div>
                                    {payments.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-slate-400">No payments recorded yet.</p>
                                    ) : (
                                        <>
                                            {/* Summary */}
                                            <div className="mb-5 flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50 px-4 py-3">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wider text-brand-500">Total Paid via Payment Link</p>
                                                    <p className="mt-0.5 text-2xl font-bold text-brand-700">{fmt(totalPaid)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Payments</p>
                                                    <p className="mt-0.5 text-2xl font-bold text-slate-700">{payments.length}</p>
                                                </div>
                                            </div>

                                            {/* Table */}
                                            <div className="overflow-x-auto -mx-6 px-6">
                                                <table className="min-w-full divide-y divide-slate-100 text-sm">
                                                    <thead>
                                                        <tr>
                                                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                                                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Amount Paid</th>
                                                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Stripe Session</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {payments.map((payment) => (
                                                            <tr key={payment.id} className="hover:bg-slate-50">
                                                                <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600">
                                                                    {new Date(payment.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </td>
                                                                <td className="whitespace-nowrap py-2.5 pr-4 font-semibold text-brand-700">
                                                                    {fmt(payment.amount_paid)}
                                                                </td>
                                                                <td className="py-2.5 font-mono text-xs text-slate-400">
                                                                    {payment.stripe_session_id}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Payment Link Modal */}
            <Modal show={showGenerateModal} onClose={() => setShowGenerateModal(false)}>
                <form onSubmit={submitGenerateLink} className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900">Generate Payment Link</h2>
                    <p className="mt-1 text-sm text-slate-500">Create a new Stripe payment link for {displayName(client)}.</p>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label htmlFor="amount" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Amount (USD) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative mt-1">
                                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">$</span>
                                <input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={generateForm.data.amount}
                                    onChange={(e) => generateForm.setData('amount', e.target.value)}
                                    className="block w-full rounded-md border border-slate-300 pl-7 pr-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                            {generateForm.errors.amount && (
                                <p className="mt-1 text-xs text-red-600">{generateForm.errors.amount}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Description (optional)
                            </label>
                            <input
                                id="description"
                                type="text"
                                maxLength={255}
                                value={generateForm.data.description}
                                onChange={(e) => generateForm.setData('description', e.target.value)}
                                placeholder="e.g. Monthly balance, Co-pay..."
                                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
                            />
                            {generateForm.errors.description && (
                                <p className="mt-1 text-xs text-red-600">{generateForm.errors.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowGenerateModal(false)}
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={generateForm.processing}
                            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {generateForm.processing ? 'Generating…' : 'Generate Link'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
