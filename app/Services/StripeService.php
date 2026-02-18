<?php

namespace App\Services;

use App\Models\Invoice;
use Stripe\Checkout\Session;
use Stripe\Event;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;

class StripeService
{
    private readonly StripeClient $stripe;

    public function __construct()
    {
        $this->stripe = new StripeClient(config('services.stripe.key'));
    }

    public function createCheckoutSession(Invoice $invoice, string $successUrl, string $cancelUrl): Session
    {
        return $this->stripe->checkout->sessions->create([
            'line_items' => [
                [
                    'price_data' => [
                        'currency'     => 'usd',
                        'unit_amount'  => (int) round($invoice->amount_due * 100),
                        'product_data' => [
                            'name' => "Invoice {$invoice->invoice_number}",
                        ],
                    ],
                    'quantity' => 1,
                ],
            ],
            'mode'        => 'payment',
            'success_url' => $successUrl,
            'cancel_url'  => $cancelUrl,
            'metadata'    => [
                'invoice_id' => $invoice->id,
            ],
        ]);
    }

    /**
     * @throws SignatureVerificationException
     */
    public function constructWebhookEvent(string $payload, string $signature): Event
    {
        return Webhook::constructEvent(
            $payload,
            $signature,
            config('services.stripe.webhook_secret')
        );
    }
}
