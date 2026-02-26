<?php

namespace App\Http\Controllers;

use App\Imports\ClientImport;
use App\Jobs\GenerateClientPaymentLinksJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class ClientImportController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Clients/Import', [
            'importResult' => session('importResult'),
            'generating'   => Cache::get('payment_links_generating'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xls,xlsx,csv', 'max:51200'], // 50 MB
        ]);

        // Allow enough time for large files (3 000+ rows)
        set_time_limit(300);

        $import = new ClientImport();

        Excel::import($import, $request->file('file'));

        if ($import->createdIds) {
            $count = count($import->createdIds);

            // Set progress cache so both Import and Index pages can track it
            Cache::put('payment_links_generating', [
                'total'      => $count,
                'processed'  => 0,
                'started_at' => now()->toISOString(),
            ], 3600);

            GenerateClientPaymentLinksJob::dispatch($import->createdIds);
        }

        return redirect()->route('clients.import')
            ->with('importResult', [
                'created' => $import->created,
                'updated' => $import->updated,
                'failed'  => $import->failed,
                'errors'  => array_slice($import->errors, 0, 20), // cap at 20 shown
            ]);
    }

    /**
     * API endpoint for polling payment link generation progress.
     */
    public function generationProgress(): JsonResponse
    {
        $progress = Cache::get('payment_links_generating');

        return response()->json([
            'generating' => $progress,
        ]);
    }
}
