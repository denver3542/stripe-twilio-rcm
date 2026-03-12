<?php

namespace App\Http\Controllers;

use App\Imports\ClientImport;
use App\Jobs\GenerateClientPaymentLinksJob;
use App\Models\Company;
use App\Services\CompanyContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class ClientImportController extends Controller
{
    public function __construct(
        private readonly CompanyContext $companyContext,
    ) {}

    public function show(): Response
    {
        $user      = auth()->user();
        $companyId = $this->companyContext->getId();
        $cacheKey  = "payment_links_generating_{$companyId}";

        // Build available companies for the selector
        $companies = $user->is_admin
            ? Company::active()->orderBy('name')->get(['id', 'name'])
            : $user->companies()->active()->orderBy('companies.name')->get(['companies.id', 'companies.name']);

        return Inertia::render('Clients/Import', [
            'importResult'      => session('importResult'),
            'generating'        => Cache::get($cacheKey),
            'companies'         => $companies,
            'activeCompanyId'   => $companyId,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = auth()->user();

        $request->validate([
            'file'       => ['required', 'file', 'mimes:xls,xlsx,csv', 'max:51200'],
            'company_id' => ['required', 'integer', 'exists:companies,id'],
        ]);

        $companyId = (int) $request->company_id;

        // Non-admins must only import into companies they're assigned to
        if (! $user->is_admin) {
            $assigned = $user->companies()->pluck('companies.id');
            if (! $assigned->contains($companyId)) {
                abort(403, 'You are not assigned to this company.');
            }
        }

        set_time_limit(300);

        $import = new ClientImport($companyId);

        Excel::import($import, $request->file('file'));

        if ($import->createdIds) {
            $count    = count($import->createdIds);
            $cacheKey = "payment_links_generating_{$companyId}";

            Cache::put($cacheKey, [
                'total'      => $count,
                'processed'  => 0,
                'started_at' => now()->toISOString(),
            ], 3600);

            GenerateClientPaymentLinksJob::dispatch($import->createdIds, $companyId);
        }

        return redirect()->route('clients.import')
            ->with('importResult', [
                'created' => $import->created,
                'updated' => $import->updated,
                'failed'  => $import->failed,
                'errors'  => array_slice($import->errors, 0, 20),
            ]);
    }

    /**
     * API endpoint for polling payment link generation progress.
     */
    public function generationProgress(Request $request): JsonResponse
    {
        $companyId = $this->companyContext->isSet()
            ? $this->companyContext->getId()
            : (int) $request->input('company_id', 0);

        $cacheKey = "payment_links_generating_{$companyId}";

        return response()->json([
            'generating' => Cache::get($cacheKey),
        ]);
    }
}
