<?php

namespace App\Http\Controllers;

use App\Services\InvoiceService;
use App\Services\StripeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Exception\SignatureVerificationException;

class StripeWebhookController extends Controller
{
    public function __construct(
        private readonly StripeService $stripeService,
        private readonly InvoiceService $invoiceService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $payload   = $request->getContent();
        $signature = $request->header('Stripe-Signature', '');

        try {
            $event = $this->stripeService->constructWebhookEvent($payload, $signature);
        } catch (SignatureVerificationException) {
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        if ($event->type === 'checkout.session.completed') {
            $session = $event->data->object;
            $this->invoiceService->markPaid($session->id);
        }

        return response()->json(['received' => true]);
    }
}
