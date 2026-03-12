import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Company, PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';

interface Props extends PageProps {
    companies: Company[];
}

export default function Index({ companies }: Props) {
    const { delete: destroy, processing } = useForm();

    function handleDelete(company: Company) {
        if (!confirm(`Delete "${company.name}"? This cannot be undone.`)) return;
        router.delete(route('admin.companies.destroy', company.id));
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">
                        Companies
                    </h2>
                    <Link
                        href={route('admin.companies.create')}
                        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
                    >
                        + New Company
                    </Link>
                </div>
            }
        >
            <Head title="Companies" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Stripe Key
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Twilio Key
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Status
                                    </th>
                                    <th className="relative px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {companies.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-6 py-10 text-center text-sm text-slate-400"
                                        >
                                            No companies yet.
                                        </td>
                                    </tr>
                                )}
                                {companies.map((company) => (
                                    <tr key={company.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                                            {company.name}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {company.stripe_config_key}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {company.twilio_config_key}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    company.is_active
                                                        ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                }`}
                                            >
                                                {company.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm">
                                            <Link
                                                href={route('admin.companies.edit', company.id)}
                                                className="mr-4 font-medium text-brand-600 hover:text-brand-800"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(company)}
                                                className="font-medium text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
