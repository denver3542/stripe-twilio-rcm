<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RcmPortalService
{
    private const BASE_URL   = 'https://rcm.cfoutsourcing.com/api/v1';
    private const TOKEN_KEY  = 'rcm_portal_access_token';
    private const TOKEN_TTL  = 50; // minutes — refresh before typical 60-min expiry

    private function getToken(): ?string
    {
        return Cache::remember(self::TOKEN_KEY, now()->addMinutes(self::TOKEN_TTL), function () {
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
        });
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

        // Token may have expired early — clear cache and retry once
        if ($response->status() === 401) {
            Cache::forget(self::TOKEN_KEY);
            $token = $this->getToken();
            if (! $token) {
                return false;
            }
            $response = Http::withToken($token)
                ->post(self::BASE_URL . '/update-patient-status', [
                    'patientID' => $patientId,
                ]);
        }

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
