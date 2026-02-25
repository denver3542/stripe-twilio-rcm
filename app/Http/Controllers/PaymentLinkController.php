<?php

namespace App\Http\Controllers;

use App\Http\Requests\PaymentLink\StorePaymentLinkRequest;
use App\Models\Client;
use App\Models\PaymentLink;
use App\Services\PaymentLinkService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PaymentLinkController extends Controller
{
    public function __construct(
        private readonly PaymentLinkService $paymentLinkService,
    ) {}

    public function index(Request $request): Response
    {
        $query = PaymentLink::with('client')->latest();

        if ($status = $request->input('status')) {
            $query->where('payment_status', $status);
        }

        if ($search = trim((string) $request->input('search'))) {
            $query->whereHas('client', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('external_patient_id', 'like', "%{$search}%");
            });
        }

        return Inertia::render('PaymentLinks/Index', [
            'links'   => $query->paginate(25)->withQueryString(),
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    public function store(StorePaymentLinkRequest $request, Client $client): RedirectResponse
    {
        try {
            $this->paymentLinkService->store($client, $request->validated());
            return redirect()->back()->with('success', 'Payment link created successfully.');
        } catch (\Throwable $e) {
            Log::error("Failed to create payment link for client #{$client->id}: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to create payment link. Please try again.');
        }
    }

    public function sendSms(PaymentLink $paymentLink): RedirectResponse
    {
        try {
            $this->paymentLinkService->sendSms($paymentLink);
            return redirect()->back()->with('success', 'SMS sent successfully.');
        } catch (\Throwable $e) {
            Log::error("Failed to send SMS for PaymentLink #{$paymentLink->id}: " . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to send SMS. Please try again.');
        }
    }

    public function destroy(PaymentLink $paymentLink): RedirectResponse
    {
        $this->paymentLinkService->destroy($paymentLink);
        return redirect()->back()->with('success', 'Payment link deleted.');
    }
}
