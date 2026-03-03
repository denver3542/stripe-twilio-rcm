<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RcmPortalService
{
    private const BASE_URL = 'https://rcm.cfoutsourcing.com/api/v1';

    private function getToken(): ?string
    {
        $response = Http::post(self::BASE_URL . '/auth/token', [
            'username' => config('services.rcm_portal.username'),
            'password' => config('services.rcm_portal.password'),
        ]);

        if (! $response->successful()) {
            Log::error('RCM Portal: failed to obtain auth token', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);

            return null;
        }

        return $response->json('access_token');
    }

    public function updatePatientStatus(string $patientId): bool
    {
        $token = $this->getToken();

        if (! $token) {
            return false;
        }

        $response = Http::withToken($token)
            ->post(self::BASE_URL . '/update-patient-status', [
                'patientID' => $patientId,
            ]);

        if (! $response->successful()) {
            Log::error('RCM Portal: failed to update patient status', [
                'patientID' => $patientId,
                'status'    => $response->status(),
                'body'      => $response->body(),
            ]);

            return false;
        }

        Log::info('RCM Portal: patient status updated successfully', ['patientID' => $patientId]);

        return true;
    }
}
