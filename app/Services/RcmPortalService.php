<?php

namespace App\Services;

use App\Models\RcmUpdateLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RcmPortalService
{
    private const BASE_URL  = 'https://rcm.cfoutsourcing.com/api/v1';
    private const TOKEN_KEY = 'rcm_portal_access_token';
    private const TOKEN_TTL = 50; // minutes — refresh before typical 60-min expiry

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

                RcmUpdateLog::create([
                    'event'         => 'auth_token_fetch',
                    'status'        => 'failed',
                    'triggered_by'  => 'system',
                    'http_status'   => $response->status(),
                    'response_body' => $response->body(),
                    'error_message' => 'Failed to obtain auth token from RCM portal.',
                ]);

                return null;
            }

            return $response->json('access_token');
        });
    }

    public function updatePatientStatus(string $patientId, ?int $clientId = null, string $triggeredBy = 'webhook'): bool
    {
        $token = $this->getToken();

        if (! $token) {
            RcmUpdateLog::create([
                'client_id'     => $clientId,
                'patient_id'    => $patientId,
                'event'         => 'patient_status_update',
                'status'        => 'skipped',
                'triggered_by'  => $triggeredBy,
                'error_message' => 'No auth token available — token fetch may have failed.',
            ]);

            return false;
        }

        $payload  = ['patientID' => $patientId];
        $response = Http::withToken($token)
            ->post(self::BASE_URL . '/update-patient-status', $payload);

        $retried = false;

        // Token may have expired early — clear cache and retry once
        if ($response->status() === 401) {
            $firstBody   = $response->body();
            $firstStatus = $response->status();

            Cache::forget(self::TOKEN_KEY);
            $token = $this->getToken();

            if (! $token) {
                Log::error('RCM Portal: token expired and refresh failed', ['patientID' => $patientId]);

                RcmUpdateLog::create([
                    'client_id'       => $clientId,
                    'patient_id'      => $patientId,
                    'event'           => 'patient_status_update',
                    'status'          => 'retried_failed',
                    'triggered_by'    => $triggeredBy,
                    'http_status'     => $firstStatus,
                    'request_payload' => $payload,
                    'response_body'   => $firstBody,
                    'error_message'   => 'Token expired (401). Retry aborted: could not obtain a new token.',
                    'retried'         => true,
                ]);

                return false;
            }

            $response = Http::withToken($token)
                ->post(self::BASE_URL . '/update-patient-status', $payload);

            $retried = true;
        }

        if (! $response->successful()) {
            Log::error('RCM Portal: failed to update patient status', [
                'patientID' => $patientId,
                'status'    => $response->status(),
                'body'      => $response->body(),
            ]);

            RcmUpdateLog::create([
                'client_id'       => $clientId,
                'patient_id'      => $patientId,
                'event'           => 'patient_status_update',
                'status'          => $retried ? 'retried_failed' : 'failed',
                'triggered_by'    => $triggeredBy,
                'http_status'     => $response->status(),
                'request_payload' => $payload,
                'response_body'   => $response->body(),
                'error_message'   => "RCM portal returned HTTP {$response->status()}.",
                'retried'         => $retried,
            ]);

            return false;
        }

        Log::info('RCM Portal: patient status updated successfully', ['patientID' => $patientId]);

        RcmUpdateLog::create([
            'client_id'       => $clientId,
            'patient_id'      => $patientId,
            'event'           => 'patient_status_update',
            'status'          => $retried ? 'retried_success' : 'success',
            'triggered_by'    => $triggeredBy,
            'http_status'     => $response->status(),
            'request_payload' => $payload,
            'response_body'   => $response->body(),
            'retried'         => $retried,
        ]);

        return true;
    }
}
