import BrandMark from '@/Components/BrandMark';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

const pillars = [
    {
        title: 'Payments',
        detail: 'Stripe-first settlement visibility with clean audit trails.',
    },
    {
        title: 'Messaging',
        detail: 'Twilio touchpoints for reminders, updates, and follow-ups.',
    },
    {
        title: 'RCM Ops',
        detail: 'Claims, posting, and exceptions tracked in one place.',
    },
];

const workflow = [
    {
        label: 'Stripe',
        description: 'Charges, invoices, and payout reconciliation.',
        accent: 'bg-stripe-500',
    },
    {
        label: 'RCM',
        description: 'Claims lifecycle with exceptions and audit notes.',
        accent: 'bg-brand-600',
    },
    {
        label: 'Twilio',
        description: 'Outbound comms, reminders, and re-engagement.',
        accent: 'bg-twilio-500',
    },
];

export default function Welcome({ auth }: PageProps) {
    return (
        <>
            <Head title="Welcome" />
            <div className="relative min-h-screen bg-slate-50 text-slate-900">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
                    <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-brand-100/60 blur-3xl" />
                </div>

                <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6 pb-20 pt-10">
                    <header className="flex flex-wrap items-center justify-between gap-6">
                        <BrandMark />

                        <nav className="flex items-center gap-2">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex items-center rounded-full bg-brand-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="inline-flex items-center rounded-full bg-brand-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </header>

                    <main className="mt-16 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                                Green-first revenue ops
                            </div>

                            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                                Unified revenue flow for{' '}
                                <span className="text-brand-700">
                                    Stripe + Twilio + RCM
                                </span>
                            </h1>

                            <p className="mt-6 max-w-xl text-base text-slate-600">
                                A minimalist operational layer that keeps
                                payments, messaging, and claims aligned without
                                the noise. Built to stay calm, clean, and
                                actionable.
                            </p>

                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                {auth.user ? (
                                    <>
                                        <Link
                                            href={route('dashboard')}
                                            className="inline-flex items-center rounded-full bg-brand-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                        >
                                            Open Dashboard
                                        </Link>
                                        <Link
                                            href={route('profile.edit')}
                                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                        >
                                            View Profile
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href={route('register')}
                                            className="inline-flex items-center rounded-full bg-brand-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                        >
                                            Get Started
                                        </Link>
                                        <Link
                                            href={route('login')}
                                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                        >
                                            Sign In
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                    Integration Lanes
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-stripe-500" />
                                    <span className="h-2 w-2 rounded-full bg-brand-600" />
                                    <span className="h-2 w-2 rounded-full bg-twilio-500" />
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                {workflow.map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4"
                                    >
                                        <span
                                            className={`mt-1 h-2.5 w-2.5 rounded-full ${item.accent}`}
                                        />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                {item.label}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-600">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </main>

                    <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {pillars.map((pillar) => (
                            <div
                                key={pillar.title}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-700">
                                    <span className="h-2 w-2 rounded-full bg-brand-600" />
                                    {pillar.title}
                                </div>
                                <p className="mt-3 text-sm text-slate-600">
                                    {pillar.detail}
                                </p>
                            </div>
                        ))}
                    </section>

                    <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500">
                        <span>STRIPE + TWILIO + RCM</span>
                        <span>Minimalist green-first operations layer.</span>
                    </footer>
                </div>
            </div>
        </>
    );
}
