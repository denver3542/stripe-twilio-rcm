<?php

use App\Http\Controllers\StripeWebhookController;
use Illuminate\Support\Facades\Route;

// Per-company webhook URL — {company} is the stripe_config_key slug (e.g. "tspt")
// Register each company's webhook in Stripe Dashboard pointing to:
//   POST https://yourdomain.com/api/webhooks/stripe/{stripe_config_key_lowercase}
Route::post('/webhooks/stripe/{company}', StripeWebhookController::class)->name('webhooks.stripe');
