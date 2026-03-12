import { Head, Link } from '@inertiajs/react';

export default function NoCompanyAccess() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <Head title="No Company Access" />

            <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                    <svg
                        className="h-7 w-7 text-amber-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                    </svg>
                </div>

                <h1 className="text-lg font-semibold text-slate-800">
                    No Company Assigned
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Your account is not currently assigned to any company. Please
                    contact an administrator to get access.
                </p>

                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="mt-6 inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    Sign out
                </Link>
            </div>
        </div>
    );
}
