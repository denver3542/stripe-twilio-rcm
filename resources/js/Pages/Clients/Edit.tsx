import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Client, PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Edit({ client }: PageProps<{ client: Client }>) {
    const { data, setData, patch, processing, errors } = useForm({
        name: client.name ?? '',
        contact_name: client.contact_name ?? '',
        phone: client.phone ?? '',
        email: client.email ?? '',
        outstanding_balance: String(client.outstanding_balance),
        insurance_info: client.insurance_info ?? '',
        account_status: client.account_status,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('clients.update', client.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-slate-900">
                    Edit Client — {client.name}
                </h2>
            }
        >
            <Head title={`Edit ${client.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <InputLabel htmlFor="name" value="Name *" />
                                <TextInput
                                    id="name"
                                    className="mt-1 block w-full"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    isFocused
                                    required
                                />
                                <InputError message={errors.name} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="contact_name" value="Contact Name" />
                                <TextInput
                                    id="contact_name"
                                    className="mt-1 block w-full"
                                    value={data.contact_name}
                                    onChange={(e) => setData('contact_name', e.target.value)}
                                />
                                <InputError message={errors.contact_name} className="mt-2" />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="phone" value="Phone *" />
                                    <TextInput
                                        id="phone"
                                        type="tel"
                                        className="mt-1 block w-full"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.phone} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="email" value="Email *" />
                                    <TextInput
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.email} className="mt-2" />
                                </div>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="outstanding_balance" value="Outstanding Balance ($)" />
                                    <TextInput
                                        id="outstanding_balance"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="mt-1 block w-full"
                                        value={data.outstanding_balance}
                                        onChange={(e) => setData('outstanding_balance', e.target.value)}
                                    />
                                    <InputError message={errors.outstanding_balance} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="account_status" value="Account Status *" />
                                    <select
                                        id="account_status"
                                        className="mt-1 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                        value={data.account_status}
                                        onChange={(e) => setData('account_status', e.target.value as 'active' | 'inactive' | 'pending' | 'paid')}
                                    >
                                        <option value="active">Active</option>
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                    <InputError message={errors.account_status} className="mt-2" />
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="insurance_info" value="Insurance Info" />
                                <textarea
                                    id="insurance_info"
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
                                    value={data.insurance_info}
                                    onChange={(e) => setData('insurance_info', e.target.value)}
                                />
                                <InputError message={errors.insurance_info} className="mt-2" />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Link href={route('clients.show', client.id)}>
                                    <SecondaryButton type="button">Cancel</SecondaryButton>
                                </Link>
                                <PrimaryButton disabled={processing}>Save Changes</PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
