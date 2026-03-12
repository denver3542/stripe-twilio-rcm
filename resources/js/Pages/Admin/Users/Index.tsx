import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { CompanySummary, PageProps, User } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';

interface UserWithCompanies extends User {
    companies: CompanySummary[];
}

interface Props extends PageProps {
    users: UserWithCompanies[];
    companies: CompanySummary[];
}

export default function Index({ users, companies }: Props) {
    const { auth } = usePage<PageProps>().props;

    function toggleAdmin(user: UserWithCompanies) {
        const action = user.is_admin ? 'revoke admin from' : 'grant admin to';
        if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) return;
        router.patch(route('admin.users.toggle-admin', user.id));
    }

    function attachCompany(userId: number, companyId: number) {
        router.post(route('admin.users.companies.attach', { user: userId, company: companyId }));
    }

    function detachCompany(userId: number, companyId: number) {
        router.delete(
            route('admin.users.companies.detach', { user: userId, company: companyId }),
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-slate-800">Users</h2>
            }
        >
            <Head title="Users" />

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
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Companies
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Assign Company
                                    </th>
                                    <th className="relative px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                                            {user.name}
                                            {user.id === auth.user.id && (
                                                <span className="ml-2 text-xs text-slate-400">
                                                    (you)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    user.is_admin
                                                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                }`}
                                            >
                                                {user.is_admin ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.companies.length === 0 && (
                                                    <span className="text-xs text-slate-400">
                                                        None
                                                    </span>
                                                )}
                                                {user.companies.map((co) => (
                                                    <span
                                                        key={co.id}
                                                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 border border-brand-200"
                                                    >
                                                        {co.name}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                detachCompany(user.id, co.id)
                                                            }
                                                            className="ml-0.5 text-brand-400 hover:text-red-600"
                                                            title="Remove"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                defaultValue=""
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (val) {
                                                        attachCompany(user.id, val);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            >
                                                <option value="">Add company…</option>
                                                {companies
                                                    .filter(
                                                        (co) =>
                                                            !user.companies.some(
                                                                (uc) => uc.id === co.id,
                                                            ),
                                                    )
                                                    .map((co) => (
                                                        <option key={co.id} value={co.id}>
                                                            {co.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm">
                                            <button
                                                type="button"
                                                onClick={() => toggleAdmin(user)}
                                                disabled={
                                                    user.id === auth.user.id && user.is_admin
                                                }
                                                className="font-medium text-purple-600 hover:text-purple-800 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {user.is_admin ? 'Revoke Admin' : 'Make Admin'}
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
