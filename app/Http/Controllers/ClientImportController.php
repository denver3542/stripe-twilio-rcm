<?php

namespace App\Http\Controllers;

use App\Imports\ClientImport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class ClientImportController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Clients/Import', [
            'importResult' => session('importResult'),
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

        return redirect()->route('clients.import')
            ->with('importResult', [
                'created' => $import->created,
                'updated' => $import->updated,
                'failed'  => $import->failed,
                'errors'  => array_slice($import->errors, 0, 20), // cap at 20 shown
            ]);
    }
}
