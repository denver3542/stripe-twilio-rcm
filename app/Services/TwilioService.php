<?php

namespace App\Services;

use Twilio\Rest\Client as TwilioClient;

class TwilioService
{
    private readonly TwilioClient $twilio;
    private readonly string $from;

    public function __construct()
    {
        $this->twilio = new TwilioClient(
            config('services.twilio.sid'),
            config('services.twilio.token')
        );
        $this->from = config('services.twilio.from');
    }

    public function sendSms(string $to, string $body): array
    {
        // If SMS_OVERRIDE_TO is set, redirect all SMS to that number (useful for testing)
        $recipient = config('services.twilio.override_to') ?: $to;

        try {
            $message = $this->twilio->messages->create($recipient, [
                'from' => $this->from,
                'body' => $body,
            ]);

            return [
                'status' => 'sent',
                'sid'    => $message->sid,
            ];
        } catch (\Throwable $e) {
            return [
                'status' => 'failed',
                'error'  => $e->getMessage(),
            ];
        }
    }
}
