<?php

namespace App\Support;

/**
 * Resolves per-company Stripe and Twilio credentials from environment variables.
 *
 * Convention:
 *   STRIPE_{CONFIG_KEY}_KEY
 *   STRIPE_{CONFIG_KEY}_WEBHOOK_SECRET
 *   TWILIO_{CONFIG_KEY}_SID
 *   TWILIO_{CONFIG_KEY}_TOKEN
 *   TWILIO_{CONFIG_KEY}_FROM
 *
 * IMPORTANT: php artisan config:cache must NOT be used because env() is
 * called at runtime (after the config cache has been loaded) to resolve
 * per-company credentials dynamically.
 */
class CompanyCredentials
{
    public static function stripe(string $configKey): array
    {
        $prefix = strtoupper($configKey);

        return [
            'key'            => env("STRIPE_{$prefix}_KEY"),
            'webhook_secret' => env("STRIPE_{$prefix}_WEBHOOK_SECRET"),
        ];
    }

    public static function twilio(string $configKey): array
    {
        $prefix = strtoupper($configKey);

        return [
            'sid'         => env("TWILIO_{$prefix}_SID"),
            'token'       => env("TWILIO_{$prefix}_TOKEN"),
            'from'        => env("TWILIO_{$prefix}_FROM"),
            'override_to' => env('SMS_OVERRIDE_TO'),
        ];
    }
}
