<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientPayment;
use App\Models\Company;
use App\Services\CompanyContext;
use App\Services\CompanyServiceFactory;
use App\Services\PaymentLinkService;
use App\Services\RcmPortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;

class StripeWebhookController extends Controller
{
    public function __construct(
        private readonly CompanyServiceFactory $factory,
        private readonly PaymentLinkService $paymentLinkService,
        private readonly RcmPortalService $rcmPortalService,
        private readonly CompanyContext $companyContext,
    ) {}

    public function __invoke(Request $request, string $companySlug): JsonResponse
    {
        // 1. Resolve company by stripe_config_key slug from URL
        $company = Company::where('stripe_config_key', strtoupper($companySlug))
            ->where('is_active', true)
            ->first();

        if (! $company) {
            Log::warning("Stripe webhook: unknown company slug [{$companySlug}]");
            return response()->json(['error' => 'Unknown company'], 404);
        }

        // 2. Set company context (PaymentLinkService will use it)
        $this->companyContext->set($company);

        // 3. Verify webhook signature using company-specific secret
        $payload   = $request->getContent();
        $signature = $request->header('Stripe-Signature', '');

        try {
            $event = $this->factory->makeStripe($company)->constructWebhookEvent($payload, $signature);
        } catch (SignatureVerificationException $e) {
            Log::error("Stripe webhook signature failed for company [{$company->id}]: " . $e->getMessage());
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        Log::info("Stripe webhook received for company [{$company->name}]: {$event->type}");

        $session = $event->data->object;

        match ($event->type) {
            'checkout.session.completed' => $this->handleSessionCompleted($session, $company),
            default                      => null,
        };

        return response()->json(['received' => true]);
    }

    private function handleSessionCompleted(object $session, Company $company): void
    {
        $stripePaymentLinkId = is_string($session->payment_link)
            ? $session->payment_link
            : ($session->payment_link->id ?? null);

        if ($stripePaymentLinkId) {
            Log::info("Webhook: marking PaymentLink paid", ['stripe_id' => $stripePaymentLinkId]);
            $this->paymentLinkService->markPaid($stripePaymentLinkId);
        } else {
            Log::warning("Webhook: checkout.session.completed has no payment_link", ['session' => $session->id]);
        }

        $metadata = $session->metadata ?? null;
        if ($metadata && isset($metadata->client_id)) {
            $this->recordClientPayment($session, (int) $metadata->client_id, $company);
        } else {
            Log::warning("Webhook: no client_id in session metadata", ['session' => $session->id]);
        }
    }

    private function recordClientPayment(object $session, int $clientId, Company $company): void
    {
        $client = Client::where('company_id', $company->id)->find($clientId);

        if (! $client) {
            return;
        }

        if (ClientPayment::where('stripe_session_id', $session->id)->exists()) {
            return;
        }

        $amountPaid = $session->amount_total / 100;
        $paidAt     = Carbon::createFromTimestamp($session->created);
        $becamePaid = false;

        DB::transaction(function () use ($client, $session, $amountPaid, $paidAt, $company, &$becamePaid) {
            $client = Client::where('company_id', $company->id)->lockForUpdate()->find($client->id);

        DB::transaction(function () use ($client, $session, $amountPaid, $paidAt) {
            ClientPayment::create([
                'company_id'             => $company->id,
                'client_id'              => $client->id,
                'amount_paid'            => $amountPaid,
                'stripe_session_id'      => $session->id,
                'stripe_payment_link_id' => $session->payment_link ?? null,
                'paid_at'                => $paidAt,
            ]);

            $patientBal = (float) $client->patient_balance;
            if ($patientBal > 0) {
                $client->update(['patient_balance' => max(0, $patientBal - $amountPaid)]);
            } else {
                $outstandingBal = (float) $client->outstanding_balance;
                $client->update(['outstanding_balance' => max(0, $outstandingBal - $amountPaid)]);
            }

            $client->refresh();
            if ((float) $client->patient_balance <= 0 && (float) $client->outstanding_balance <= 0) {
                $client->update(['account_status' => 'paid']);
                Log::info("Webhook: client #{$client->id} balance fully cleared — status set to 'paid'");
            }

            Log::info("Webhook: recorded payment for client #{$client->id}", ['amount' => $amountPaid]);
        });

        if ($becamePaid && $client->external_patient_id) {
            $this->rcmPortalService->updatePatientStatus(
                (string) $client->external_patient_id,
                $client->id,
                'webhook'
            );
        }
    }
}