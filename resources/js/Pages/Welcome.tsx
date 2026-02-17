import BrandMark from '@/Components/BrandMark';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

const pillars = [
    {
        title: 'Payment Oversight',
        detail: 'Track collections and settlements with clear status visibility.',
    },
    {
        title: 'Patient Communication',
        detail: 'Coordinate reminders and updates through a single activity feed.',
    },
    {
        title: 'Claims Workflow',
        detail: 'Keep claims, posting, and exception management aligned in one view.',
    },
];

const workflow = [
    {
        label: 'Collections',
        description: 'Payment activity, settlement checks, and reconciliation.',
        tone: 'border-brand-100 bg-brand-50/60',
    },
    {
        label: 'Claims',
        description: 'Claim lifecycle tracking with clear ownership and notes.',
        tone: 'border-slate-200 bg-slate-50',
    },
    {
        label: 'Communication',
        description: 'Reminder and outreach workflows tied directly to account status.',
        tone: 'border-slate-200 bg-white',
    },
];

export default function Welcome({ auth }: PageProps) {
    return (
        <>
            <Head title="Welcome" />
            <div className="relative min-h-screen bg-slate-50 text-slate-900">
                <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 via-white to-white" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                </div>

                <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6 pb-20 pt-10">
                    <header className="flex flex-wrap items-center justify-between gap-6">
                        <BrandMark />

                        <nav className="flex items-center gap-2">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex items-center rounded-md bg-brand-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="inline-flex items-center rounded-md border border-slate-200 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="inline-flex items-center rounded-md bg-brand-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </header>

                    <main className="mt-16 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
                        <div>
                            <div className="inline-flex items-center rounded-md border border-brand-200/70 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700">
                                Revenue Operations Platform
                            </div>

                            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                                Streamlined operations for collections,
                                communication, and claims.
                            </h1>

                            <p className="mt-6 max-w-xl text-base text-slate-600">
                                A focused workspace for day-to-day revenue cycle
                                work, designed to reduce noise and keep teams
                                moving quickly with clear priorities.
                            </p>

                            <div className="mt-8 flex flex-wrap items-center gap-3">
                                {auth.user ? (
                                    <>
                                        <Link
                                            href={route('dashboard')}
                                            className="inline-flex items-center rounded-md bg-brand-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                        >
                                            Open Dashboard
                                        </Link>
                                        <Link
                                            href={route('profile.edit')}
                                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                        >
                                            View Profile
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href={route('register')}
                                            className="inline-flex items-center rounded-md bg-brand-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
                                        >
                                            Get Started
                                        </Link>
                                        <Link
                                            href={route('login')}
                                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-700 transition hover:border-brand-200 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-50"
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
                                    Workflow Overview
                                </p>
                                <span className="text-xs text-slate-400">
                                    Live
                                </span>
                            </div>

                            <div className="mt-6 space-y-3">
                                {workflow.map((item) => (
                                    <div
                                        key={item.label}
                                        className={`rounded-2xl border px-4 py-4 ${item.tone}`}
                                    >
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
                                <div className="text-xs font-semibold uppercase tracking-widest text-brand-700">
                                    {pillar.title}
                                </div>
                                <p className="mt-3 text-sm text-slate-600">
                                    {pillar.detail}
                                </p>
                            </div>
                        ))}
                    </section>

                    <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500">
                        <span>Client Revenue Operations</span>
                        <span>Minimal interface, clear actions.</span>
                    </footer>
                </div>
            </div>
        </>
    );
}
