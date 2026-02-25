<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Services\PaymentLinkService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly PaymentLinkService $paymentLinkService,
    ) {}

    public function index(): Response
    {
        $stats = $this->paymentLinkService->dashboardStats();

        return Inertia::render('Dashboard', [
            'stats' => array_merge($stats, [
                'total_clients' => Client::count(),
            ]),
        ]);
    }
}
