import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Client, Invoice, PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

type ClientOption = Pick<
    Client,
    'id' | 'name' | 'first_name' | 'last_name' | 'phone' | 'mobile_phone' | 'email' | 'patient_balance' | 'outstanding_balance' | 'account_status'
>;

function displayName(c: ClientOption): string {
    if (c.name) return c.name;
    const parts = [c.first_name, c.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
}

function formatPhone(phone: string | null | undefined): string {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return phone;
}

const invoiceStatusColors: Record<Invoice['status'], string> = {
    paid:    'bg-brand-50 text-brand-700 border border-brand-200',
    unpaid:  'bg-slate-100 text-slate-600 border border-slate-200',
    pending: 'bg-purple-50 text-purple-700 border border-purple-200',
    overdue: 'bg-red-50 text-red-700 border border-red-200',
};

export default function Edit({
    invoice,
    clients,
}: PageProps<{ invoice: Invoice & { client: Client }; clients: ClientOption[] }>) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
        clients.find((c) => c.id === invoice.client_id) ?? null,
    );
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { data, setData, patch, processing, errors } = useForm({
        client_id: String(invoice.client_id),
        service_date: invoice.service_date,
        amount_due: String(invoice.amount_due),
        amount_paid: String(invoice.amount_paid),
        notes: invoice.notes ?? '',
        status: invoice.status,
    });

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function selectClient(c: ClientOption) {
        setSelectedClient(c);
        setSearch(displayName(c));
        setOpen(false);
        setData('client_id', String(c.id));
    }

    const filtered = search && !selectedClient
        ? clients
            .filter((c) => {
                const name = displayName(c).toLowerCase();
                const email = (c.email ?? '').toLowerCase();
                const phone = (c.mobile_phone || c.phone || '').replace(/\D/g, '');
                const digits = search.replace(/\D/g, '');
                return (
                    name.includes(search.toLowerCase()) ||
                    email.includes(search.toLowerCase()) ||
                    (digits && phone.includes(digits))
                );
            })
            .slice(0, 50)
        : clients.slice(0, 50);

    const bestPhone = selectedClient ? (selectedClient.mobile_phone || selectedClient.phone) : null;
    const balance = selectedClient
        ? (Number(selectedClient.patient_balance) || Number(selectedClient.outstanding_balance))
        : null;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('invoices.update', invoice.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-3">
                    <Link href={route('invoices.show', invoice.id)} className="text-sm text-slate-500 hover:text-slate-700">
                        ← {invoice.invoice_number}
                    </Link>
                    <span className="text-slate-300">/</span>
                    <h2 className="text-xl font-semibold leading-tight text-slate-900">Edit Invoice</h2>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${invoiceStatusColors[invoice.status]}`}>
                        {invoice.status}
                    </span>
                </div>
            }
        >
            <Head title={`Edit ${invoice.invoice_number}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl space-y-5 sm:px-6 lg:px-8">

                    {/* Patient section */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Patient</h3>

                        <div ref={wrapperRef} className="relative">
                            <InputLabel htmlFor="client_search" value="Patient *" />
                            <div className="relative mt-1">
                                <svg
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                </svg>
                                <input
                                    id="client_search"
                                    type="text"
                                    autoComplete="off"
                                    className="block w-full rounded-md border-slate-300 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    placeholder="Search to change patient…"
                                    value={search || (selectedClient ? displayName(selectedClient) : '')}
                                    onFocus={() => setOpen(true)}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setOpen(true);
                                        if (selectedClient && e.target.value !== displayName(selectedClient)) {
                                            // User is typing something different — allow changing
                                        }
                                    }}
                                />
                            </div>

                            {open && (
                                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                                    {filtered.length === 0 ? (
                                        <li className="px-4 py-3 text-sm text-slate-500">No patients found.</li>
                                    ) : (
                                        filtered.map((c) => (
                                            <li
                                                key={c.id}
                                                className={`cursor-pointer border-b border-slate-50 px-4 py-2.5 last:border-0 hover:bg-brand-50 ${c.id === selectedClient?.id ? 'bg-brand-50' : ''}`}
                                                onMouseDown={() => selectClient(c)}
                                            >
                                                <div className="text-sm font-medium text-slate-800">{displayName(c)}</div>
                                                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                                                    {(c.mobile_phone || c.phone) && (
                                                        <span>{formatPhone(c.mobile_phone || c.phone)}</span>
                                                    )}
                                                    {c.email && <span>{c.email}</span>}
                                                </div>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>

                        <InputError message={errors.client_id} className="mt-2" />

                        {/* Selected client info */}
                        {selectedClient && (
                            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800">{displayName(selectedClient)}</p>
                                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                                            {bestPhone && (
                                                <a href={`tel:${bestPhone}`} className="hover:text-brand-700">
                                                    {formatPhone(bestPhone)}
                                                </a>
                                            )}
                                            {selectedClient.email && (
                                                <a href={`mailto:${selectedClient.email}`} className="truncate hover:text-brand-700">
                                                    {selectedClient.email}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    {balance !== null && balance > 0 && (
                                        <div className="shrink-0 text-right">
                                            <p className="text-xs text-slate-500">Outstanding</p>
                                            <p className="text-lg font-bold text-red-600">${balance.toFixed(2)}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <Link
                                        href={route('clients.show', selectedClient.id)}
                                        className="text-xs text-brand-700 hover:text-brand-900"
                                    >
                                        View patient profile →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Invoice details */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Invoice Details</h3>

                        <form onSubmit={submit} className="space-y-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="service_date" value="Service Date *" />
                                    <TextInput
                                        id="service_date"
                                        type="date"
                                        className="mt-1 block w-full"
                                        value={data.service_date}
                                        onChange={(e) => setData('service_date', e.target.value)}
                                    />
                                    <InputError message={errors.service_date} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="status" value="Status" />
                                    <select
                                        id="status"
                                        className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value as Invoice['status'])}
                                    >
                                        <option value="unpaid">Unpaid</option>
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="overdue">Overdue</option>
                                    </select>
                                    <InputError message={errors.status} className="mt-2" />
                                </div>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="amount_due" value="Amount Due ($) *" />
                                    <TextInput
                                        id="amount_due"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        className="mt-1 block w-full"
                                        value={data.amount_due}
                                        onChange={(e) => setData('amount_due', e.target.value)}
                                    />
                                    <InputError message={errors.amount_due} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="amount_paid" value="Amount Paid ($)" />
                                    <TextInput
                                        id="amount_paid"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="mt-1 block w-full"
                                        value={data.amount_paid}
                                        onChange={(e) => setData('amount_paid', e.target.value)}
                                    />
                                    <InputError message={errors.amount_paid} className="mt-2" />
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="notes" value="Notes" />
                                <textarea
                                    id="notes"
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                />
                                <InputError message={errors.notes} className="mt-2" />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Link href={route('invoices.show', invoice.id)}>
                                    <SecondaryButton type="button">Cancel</SecondaryButton>
                                </Link>
                                <PrimaryButton disabled={processing}>
                                    {processing ? 'Saving…' : 'Save Changes'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
