import BrandMark from '@/Components/BrandMark';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-4 py-12">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
                <div className="absolute -bottom-24 right-0 h-72 w-72 translate-x-1/3 rounded-full bg-brand-100/60 blur-3xl" />
            </div>

            <div className="w-full max-w-md">
                <Link href="/" className="flex justify-center">
                    <BrandMark compact />
                </Link>

                <div className="mt-8 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
                    {children}
                </div>
            </div>
        </div>
    );
}
