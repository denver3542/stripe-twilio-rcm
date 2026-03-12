<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Services\CompanyContext;
use App\Services\PaymentLinkService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly PaymentLinkService $paymentLinkService,
        private readonly CompanyContext $companyContext,
    ) {}

    public function index(): Response
    {
        $stats = $this->paymentLinkService->dashboardStats();

        return Inertia::render('Dashboard', [
            'stats' => array_merge($stats, [
                'total_clients' => Client::where('company_id', $this->companyContext->getId())->count(),
            ]),
        ]);
    }
}
