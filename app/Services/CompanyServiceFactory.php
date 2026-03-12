<?php

namespace App\Services;

use App\Models\Company;
use App\Support\CompanyCredentials;

/**
 * Builds StripeService and TwilioService instances for a specific Company.
 * Registered as a singleton in AppServiceProvider.
 */
class CompanyServiceFactory
{
    public function makeStripe(Company $company): StripeService
    {
        $creds = CompanyCredentials::stripe($company->stripe_config_key);

        return new StripeService($creds['key'], $creds['webhook_secret']);
    }

    public function makeTwilio(Company $company): TwilioService
    {
        $creds = CompanyCredentials::twilio($company->twilio_config_key);

        return new TwilioService(
            $creds['sid'],
            $creds['token'],
            $creds['from'],
            $creds['override_to'],
        );
    }
}
