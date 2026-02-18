<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Invoice;
use App\Services\InvoiceService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
    ) {}

    public function index(): Response
    {
        $stats = $this->invoiceService->dashboardStats();

        // Status breakdown counts
        $statusCounts = Invoice::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        return Inertia::render('Dashboard', [
            'stats' => array_merge($stats, [
                'total_clients'         => Client::count(),
                'total_invoices'        => Invoice::count(),
                'overdue_amount'        => (float) Invoice::query()
                    ->where('status', 'overdue')
                    ->selectRaw('COALESCE(SUM(amount_due - amount_paid), 0) as total')
                    ->value('total'),
                'status_counts'         => $statusCounts,
                'needs_action_invoices' => Invoice::query()
                    ->with('client')
                    ->whereIn('status', ['unpaid', 'overdue'])
                    ->orderByRaw("FIELD(status, 'overdue', 'unpaid')")
                    ->orderByDesc('created_at')
                    ->limit(10)
                    ->get(),
            ]),
        ]);
    }
}
