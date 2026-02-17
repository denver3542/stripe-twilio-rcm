import BrandMark from '@/Components/BrandMark';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-xs font-medium text-slate-500 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                    >
                        Back to Home
                    </Link>

                    <Link href="/" className="flex justify-center">
                        <BrandMark />
                    </Link>
                </div>

                <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
                    {children}
                </div>
            </div>
        </div>
    );
}
