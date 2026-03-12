<?php

namespace App\Services;

use Twilio\Rest\Client as TwilioClient;

class TwilioService
{
    private readonly TwilioClient $twilio;
    private readonly string $from;
    private readonly ?string $overrideTo;

    public function __construct(string $sid, string $token, string $from, ?string $overrideTo = null)
    {
        $this->twilio     = new TwilioClient($sid, $token);
        $this->from       = $from;
        $this->overrideTo = $overrideTo;
    }

    public function sendSms(string $to, string $body): array
    {
        // If SMS_OVERRIDE_TO is set, redirect all SMS to that number (useful for testing)
        $recipient = $this->overrideTo ?: $to;

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
