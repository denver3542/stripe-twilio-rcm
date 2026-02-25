<?php

namespace App\Services;

use App\Models\Client;
use Stripe\Event;
use Stripe\Exception\SignatureVerificationException;
use Stripe\PaymentLink;
use Stripe\StripeClient;
use Stripe\Webhook;

class StripeService
{
    private readonly StripeClient $stripe;

    public function __construct()
    {
        $this->stripe = new StripeClient(config('services.stripe.key'));
    }

    public function createPaymentLink(Client $client, int $amountCents, ?string $description = null): PaymentLink
    {
        $firstName   = $client->first_name ?? '';
        $lastName    = $client->last_name  ?? '';
        $name        = trim($client->name ?? "{$firstName} {$lastName}") ?: "Patient #{$client->id}";
        $productName = $description ?? "Balance for {$name}";

        $price = $this->stripe->prices->create([
            'currency'     => 'usd',
            'unit_amount'  => $amountCents,
            'product_data' => ['name' => $productName],
        ]);

        return $this->stripe->paymentLinks->create([
            'line_items' => [['price' => $price->id, 'quantity' => 1]],
            'metadata'   => ['client_id' => $client->id],
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
