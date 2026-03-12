import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create(_props: PageProps) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        stripe_config_key: '',
        twilio_config_key: '',
        is_active: true as boolean,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('admin.companies.store'));
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-slate-800">
                    New Company
                </h2>
            }
        >
            <Head title="New Company" />

            <div className="py-8">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <form onSubmit={submit} className="divide-y divide-slate-100">
                            <div className="space-y-5 p-6">
                                <div>
                                    <InputLabel htmlFor="name" value="Company Name *" />
                                    <TextInput
                                        id="name"
                                        className="mt-1 block w-full"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        required
                                        autoFocus
                                    />
                                    <InputError message={errors.name} className="mt-1" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel
                                            htmlFor="stripe_config_key"
                                            value="Stripe Config Key *"
                                        />
                                        <TextInput
                                            id="stripe_config_key"
                                            className="mt-1 block w-full font-mono uppercase"
                                            value={data.stripe_config_key}
                                            onChange={(e) =>
                                                setData(
                                                    'stripe_config_key',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            placeholder="e.g. TSPT"
                                            required
                                        />
                                        <p className="mt-1 text-xs text-slate-400">
                                            Used as prefix in .env (STRIPE_TSPT_KEY)
                                        </p>
                                        <InputError
                                            message={errors.stripe_config_key}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="twilio_config_key"
                                            value="Twilio Config Key *"
                                        />
                                        <TextInput
                                            id="twilio_config_key"
                                            className="mt-1 block w-full font-mono uppercase"
                                            value={data.twilio_config_key}
                                            onChange={(e) =>
                                                setData(
                                                    'twilio_config_key',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            placeholder="e.g. TSPT"
                                            required
                                        />
                                        <p className="mt-1 text-xs text-slate-400">
                                            Used as prefix in .env (TWILIO_TSPT_SID)
                                        </p>
                                        <InputError
                                            message={errors.twilio_config_key}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <InputLabel htmlFor="address" value="Address" />
                                    <TextInput
                                        id="address"
                                        className="mt-1 block w-full"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                    />
                                    <InputError message={errors.address} className="mt-1" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="phone" value="Phone" />
                                        <TextInput
                                            id="phone"
                                            className="mt-1 block w-full"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                        />
                                        <InputError message={errors.phone} className="mt-1" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="email" value="Email" />
                                        <TextInput
                                            id="email"
                                            type="email"
                                            className="mt-1 block w-full"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                        />
                                        <InputError message={errors.email} className="mt-1" />
                                    </div>
                                </div>

                                <div>
                                    <InputLabel htmlFor="website" value="Website" />
                                    <TextInput
                                        id="website"
                                        className="mt-1 block w-full"
                                        value={data.website}
                                        onChange={(e) => setData('website', e.target.value)}
                                        placeholder="https://"
                                    />
                                    <InputError message={errors.website} className="mt-1" />
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <InputLabel htmlFor="is_active" value="Active" />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4">
                                <Link href={route('admin.companies.index')}>
                                    <SecondaryButton type="button">Cancel</SecondaryButton>
                                </Link>
                                <PrimaryButton disabled={processing}>
                                    Create Company
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
