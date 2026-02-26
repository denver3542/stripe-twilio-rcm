import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { PageProps } from "@/types";
import { Head, Link, useForm } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";

interface ImportResult {
    created: number;
    updated: number;
    failed: number;
    errors: string[];
}

interface GeneratingStatus {
    total: number;
    processed: number;
    started_at: string;
}

export default function Import({
    importResult,
    generating: initialGenerating,
}: PageProps<{
    importResult?: ImportResult;
    generating?: GeneratingStatus | null;
}>) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [generating, setGenerating] = useState<GeneratingStatus | null>(
        initialGenerating ?? null,
    );
    const [completed, setCompleted] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<{
        file: File | null;
    }>({
        file: null,
    });

    // Sync from server props when they change (e.g. after import submit)
    useEffect(() => {
        setGenerating(initialGenerating ?? null);
        setCompleted(false);
    }, [initialGenerating]);

    // Poll for progress while generating
    useEffect(() => {
        if (!generating) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(route("clients.generation-progress"), {
                    headers: { Accept: "application/json" },
                });
                const json = await res.json();
                if (json.generating) {
                    setGenerating(json.generating);
                } else {
                    // Generation finished
                    setGenerating(null);
                    setCompleted(true);
                    clearInterval(interval);
                }
            } catch {
                // Silently retry on next interval
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [!!generating]);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setData("file", e.target.files?.[0] ?? null);
    }

    function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setData("file", file);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(route("clients.import.store"), {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    }

    const total = importResult
        ? importResult.created + importResult.updated + importResult.failed
        : 0;
    const pct =
        generating && generating.total > 0
            ? Math.min(
                  100,
                  Math.round((generating.processed / generating.total) * 100),
              )
            : 0;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-slate-900">
                        Import Clients
                    </h2>
                    <Link
                        href={route("clients.index")}
                        className="text-sm text-slate-500 hover:text-brand-700"
                    >
                        ← Back to Clients
                    </Link>
                </div>
            }
        >
            <Head title="Import Clients" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8 space-y-6">
                    {/* Result card */}
                    {importResult && (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                                    Import Complete — {total.toLocaleString()}{" "}
                                    rows processed
                                </h3>
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-slate-100">
                                <div className="px-6 py-5 text-center">
                                    <p className="text-3xl font-bold text-brand-600">
                                        {importResult.created.toLocaleString()}
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Created
                                    </p>
                                </div>
                                <div className="px-6 py-5 text-center">
                                    <p className="text-3xl font-bold text-slate-700">
                                        {importResult.updated.toLocaleString()}
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Updated
                                    </p>
                                </div>
                                <div className="px-6 py-5 text-center">
                                    <p
                                        className={`text-3xl font-bold ${importResult.failed > 0 ? "text-red-600" : "text-slate-400"}`}
                                    >
                                        {importResult.failed.toLocaleString()}
                                    </p>
                                    <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Failed
                                    </p>
                                </div>
                            </div>
                            {importResult.errors.length > 0 && (
                                <div className="border-t border-slate-100 px-6 py-4">
                                    <p className="mb-2 text-xs font-semibold text-red-600 uppercase tracking-wider">
                                        Row Errors
                                    </p>
                                    <ul className="space-y-1">
                                        {importResult.errors.map((err, i) => (
                                            <li
                                                key={i}
                                                className="text-xs text-red-700 font-mono bg-red-50 rounded px-2 py-1"
                                            >
                                                {err}
                                            </li>
                                        ))}
                                    </ul>
                                    {importResult.failed >
                                        importResult.errors.length && (
                                        <p className="mt-2 text-xs text-slate-400">
                                            … and{" "}
                                            {importResult.failed -
                                                importResult.errors.length}{" "}
                                            more (check server logs).
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment link generation progress banner */}
                    {generating && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                            <div className="flex items-start gap-3">
                                <svg
                                    className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-amber-800">
                                            Generating payment links…
                                        </p>
                                        <span className="text-sm font-semibold text-amber-700 shrink-0">
                                            {pct}%
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 w-full rounded-full bg-amber-200 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-amber-500 transition-all duration-500 ease-out"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-xs text-amber-600">
                                        {generating.processed.toLocaleString()}{" "}
                                        of {generating.total.toLocaleString()}{" "}
                                        {generating.total === 1
                                            ? "client"
                                            : "clients"}{" "}
                                        processed &nbsp;·&nbsp; refreshing
                                        automatically
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment link generation completed */}
                    {completed && !generating && (
                        <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <svg
                                    className="h-5 w-5 text-brand-600 shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <p className="text-sm font-medium text-brand-800">
                                    Payment link generation complete!
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Upload card */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                                Upload Patient Demographics Export
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Drop zone */}
                            <label
                                htmlFor="file-input"
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                className={`
                                    flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed
                                    px-6 py-10 cursor-pointer transition
                                    ${
                                        data.file
                                            ? "border-brand-400 bg-brand-50"
                                            : "border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50"
                                    }
                                `}
                            >
                                {data.file ? (
                                    <>
                                        <svg
                                            className="h-8 w-8 text-brand-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        <span className="text-sm font-medium text-brand-700">
                                            {data.file.name}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {(
                                                data.file.size /
                                                1024 /
                                                1024
                                            ).toFixed(1)}{" "}
                                            MB — click to change
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className="h-8 w-8 text-slate-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                            />
                                        </svg>
                                        <span className="text-sm font-medium text-slate-600">
                                            Drag &amp; drop your file here, or{" "}
                                            <span className="text-brand-600 underline">
                                                browse
                                            </span>
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            Supports .xls, .xlsx, .csv — max 50
                                            MB
                                        </span>
                                    </>
                                )}
                                <input
                                    id="file-input"
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xls,.xlsx,.csv"
                                    className="sr-only"
                                    onChange={handleFileChange}
                                />
                            </label>

                            {errors.file && (
                                <p className="text-sm text-red-600">
                                    {errors.file}
                                </p>
                            )}

                            <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-slate-400">
                                    Existing patients (matched by Patient ID)
                                    will be updated, not duplicated.
                                </p>
                                <button
                                    type="submit"
                                    disabled={!data.file || processing}
                                    className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <svg
                                                className="h-4 w-4 animate-spin"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                />
                                            </svg>
                                            Importing…
                                        </>
                                    ) : (
                                        "Import"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Format guide */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                                Expected File Format
                            </h3>
                        </div>
                        <div className="px-6 py-5 text-sm text-slate-600 space-y-3">
                            <p>
                                The importer expects the{" "}
                                <strong>rptPatientDemographicExport</strong>{" "}
                                layout (178 columns). Row 1 must be the header
                                row. Key columns imported:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-slate-500">
                                <li>
                                    Patient demographics (name, DOB, gender,
                                    address, phone, email)
                                </li>
                                <li>
                                    Primary &amp; secondary insurance (company,
                                    plan, policy/group number, insured info)
                                </li>
                                <li>
                                    Up to 3 authorization records per patient
                                </li>
                                <li>
                                    Up to 10 encounter records per patient
                                    (procedure code, diagnosis, date)
                                </li>
                                <li>
                                    Financial summary (charges, adjustments,
                                    payments, balances)
                                </li>
                            </ul>
                            <p className="text-xs text-slate-400">
                                Patients are matched by{" "}
                                <strong>Patient ID</strong> (column B).
                                Re-importing the same file updates existing
                                records rather than creating duplicates.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
