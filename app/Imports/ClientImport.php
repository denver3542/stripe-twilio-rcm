<?php

namespace App\Imports;

use App\Models\Client;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/**
 * Column index map for rptPatientDemographicExport (178 cols):
 *
 * 0   Patient Created Date        27  Patient Mobile Phone
 * 1   Patient ID                  29  Patient Email Address
 * 2   Patient Prefix              30  Default Rendering Provider Full Name
 * 3   Patient First Name          31  Primary Care Physician Full Name
 * 4   Patient Middle Name         32  Referring Provider Full Name
 * 5   Patient Last Name           33  Service Location Name
 * 6   Patient Suffix              45  Patient Responsible Different Than Patient
 * 7   Patient SSN                 47  Patient Responsible First Name
 * 8   Patient DOB                 50  Patient Responsible Last Name
 * 10  Patient Gender              54  Default Case Name
 * 11  Patient Medical Record #    55  Default Case Payer Scenario
 * 12  Patient Marital Status      64-78  Primary Insurance
 * 13  Patient Employment Status   79-93  Secondary Insurance
 * 14  Patient Employer Name       94-103 Auth 1
 * 15  Patient Referral Source     104-113 Auth 2
 * 16  Patient Insurance Type      114-123 Auth 3
 * 17  Patient Address Line 1      124-168 Encounters 1-9 (5 cols each)
 * 18  Patient Address Line 2      169 Encounter ID 10 (no procedure data)
 * 19  Patient City                170 Collection Category
 * 20  Patient State               171 Charges
 * 21  Patient Country             172 Adjustments
 * 22  Patient Zip Code            173 Insurance Payments
 * 23  Patient Home Phone          174 Patient Payments
 * 25  Patient Work Phone          175 Insurance Balance
 *                                 176 Patient Balance
 *                                 177 Claim Total Balance
 */
class ClientImport implements ToCollection, WithChunkReading
{
    public int $created = 0;
    public int $updated = 0;
    public int $failed  = 0;
    public array $errors      = [];
    public array $createdIds  = [];

    private int $rowNumber = 0;

    public function chunkSize(): int
    {
        return 250;
    }

    public function collection(Collection $rows): void
    {
        $inserts = [
            'insurances'     => [],
            'authorizations' => [],
            'encounters'     => [],
        ];

        $clientIds = []; // external_patient_id => client->id

        DB::transaction(function () use ($rows, &$inserts, &$clientIds) {
            foreach ($rows as $row) {
                $this->rowNumber++;

                // Skip the header row (first row)
                if ($this->rowNumber === 1) {
                    continue;
                }

                $extId = $this->intVal($row[1]);
                if (!$extId) {
                    continue;
                }

                try {
                    $client = $this->upsertClient($row, $extId);

                    $clientIds[$extId] = $client->id;

                    $this->collectInsurances($row, $client->id, $inserts['insurances']);
                    $this->collectAuthorizations($row, $client->id, $inserts['authorizations']);
                    $this->collectEncounters($row, $client->id, $inserts['encounters']);

                    if ($client->wasRecentlyCreated) {
                        $this->created++;
                        $this->createdIds[] = $client->id;
                    } else {
                        $this->updated++;
                    }
                } catch (\Throwable $e) {
                    $this->failed++;
                    $msg = "Row {$this->rowNumber} (Patient ID {$extId}): " . $e->getMessage();
                    $this->errors[] = $msg;
                    Log::warning("ClientImport: {$msg}");
                }
            }
        });

        // Bulk insert related records for this chunk
        if ($clientIds) {
            $affectedClientIds = array_values($clientIds);

            if ($inserts['insurances']) {
                DB::table('patient_insurances')->whereIn('client_id', $affectedClientIds)->delete();
                DB::table('patient_insurances')->insert($inserts['insurances']);
            }
            if ($inserts['authorizations']) {
                DB::table('patient_authorizations')->whereIn('client_id', $affectedClientIds)->delete();
                DB::table('patient_authorizations')->insert($inserts['authorizations']);
            }
            if ($inserts['encounters']) {
                DB::table('encounters')->whereIn('client_id', $affectedClientIds)->delete();
                DB::table('encounters')->insert($inserts['encounters']);
            }
        }
    }

    // ─── Client ──────────────────────────────────────────────────────────────

    private function upsertClient(Collection $row, int $extId): Client
    {
        $firstName = $this->str($row[3]);
        $lastName  = $this->str($row[5]);
        $fullName  = trim("{$firstName} {$lastName}") ?: null;

        // Responsible party name if different from patient
        $contactName = null;
        if (strtolower($this->str($row[45]) ?? '') === 'true') {
            $rFirst = $this->str($row[47]);
            $rLast  = $this->str($row[50]);
            $contactName = trim("{$rFirst} {$rLast}") ?: null;
        }

        // Best available phone: mobile > home > work
        $mobile = $this->formatPhone($row[27]);
        $home   = $this->formatPhone($row[23]);
        $work   = $this->formatPhone($row[25]);
        $phone  = $mobile ?: $home ?: $work;

        // Financial summary from import
        $claimTotal = (float) ($row[177] ?? 0);

        return Client::updateOrCreate(
            ['external_patient_id' => (string) $extId],
            [
                'name'                   => $fullName,
                'contact_name'           => $contactName,
                'phone'                  => $phone,
                'email'                  => $this->str($row[29]),
                'outstanding_balance'    => $claimTotal,
                'account_status'         => 'active',

                'prefix'                 => $this->str($row[2]),
                'first_name'             => $firstName ?: null,
                'middle_name'            => $this->str($row[4]),
                'last_name'              => $lastName ?: null,
                'suffix'                 => $this->str($row[6]),
                'ssn'                    => $this->str($row[7]),
                'date_of_birth'          => $this->parseDate($row[8]),
                'gender'                 => $this->str($row[10]),
                'medical_record_number'  => $this->str($row[11]),
                'marital_status'         => $this->str($row[12]),
                'employment_status'      => $this->str($row[13]),
                'employer_name'          => $this->str($row[14]),
                'referral_source'        => $this->str($row[15]),
                'insurance_type_name'    => $this->str($row[16]),

                'address_line1'          => $this->str($row[17]),
                'address_line2'          => $this->str($row[18]),
                'city'                   => $this->str($row[19]),
                'state'                  => $this->str($row[20]),
                'country'                => $this->str($row[21]),
                'zip_code'               => $this->str($row[22]),

                'home_phone'             => $home,
                'work_phone'             => $work,
                'mobile_phone'           => $mobile,

                'rendering_provider'     => $this->str($row[30]),
                'primary_care_physician' => $this->str($row[31]),
                'referring_provider'     => $this->str($row[32]),
                'service_location'       => $this->str($row[33]),
                'payer_scenario'         => $this->str($row[55]),

                'collection_category'    => $this->str($row[170]),
                'charges'                => (float) ($row[171] ?? 0),
                'adjustments'            => (float) ($row[172] ?? 0),
                'insurance_payments'     => (float) ($row[173] ?? 0),
                'patient_payments'       => (float) ($row[174] ?? 0),
                'insurance_balance'      => (float) ($row[175] ?? 0),
                'patient_balance'        => (float) ($row[176] ?? 0),
            ]
        );
    }

    // ─── Insurance ───────────────────────────────────────────────────────────

    private function collectInsurances(Collection $row, int $clientId, array &$out): void
    {
        $now = now()->toDateTimeString();

        // Primary (cols 64–78)
        if ($this->str($row[64])) {
            $out[] = [
                'client_id'            => $clientId,
                'type'                 => 'primary',
                'company_name'         => $this->str($row[64]),
                'plan_name'            => $this->str($row[65]),
                'address_line1'        => $this->str($row[66]),
                'address_line2'        => $this->str($row[67]),
                'city'                 => $this->str($row[68]),
                'state'                => $this->str($row[69]),
                'country'              => $this->str($row[70]),
                'zip_code'             => $this->str($row[71]),
                'policy_number'        => $this->str($row[72]),
                'group_number'         => $this->str($row[73]),
                'effective_start_date' => $this->parseDate($row[74]),
                'effective_end_date'   => $this->parseDate($row[75]),
                'insured_relationship' => $this->str($row[76]),
                'insured_full_name'    => $this->str($row[77]),
                'insured_id_number'    => $this->str($row[78]),
                'created_at'           => $now,
                'updated_at'           => $now,
            ];
        }

        // Secondary (cols 79–93)
        if ($this->str($row[79])) {
            $out[] = [
                'client_id'            => $clientId,
                'type'                 => 'secondary',
                'company_name'         => $this->str($row[79]),
                'plan_name'            => $this->str($row[80]),
                'address_line1'        => $this->str($row[81]),
                'address_line2'        => $this->str($row[82]),
                'city'                 => $this->str($row[83]),
                'state'                => $this->str($row[84]),
                'country'              => $this->str($row[85]),
                'zip_code'             => $this->str($row[86]),
                'policy_number'        => $this->str($row[87]),
                'group_number'         => $this->str($row[88]),
                'effective_start_date' => $this->parseDate($row[89]),
                'effective_end_date'   => $this->parseDate($row[90]),
                'insured_relationship' => $this->str($row[91]),
                'insured_full_name'    => $this->str($row[92]),
                'insured_id_number'    => $this->str($row[93]),
                'created_at'           => $now,
                'updated_at'           => $now,
            ];
        }
    }

    // ─── Authorizations ──────────────────────────────────────────────────────

    private function collectAuthorizations(Collection $row, int $clientId, array &$out): void
    {
        $now = now()->toDateTimeString();

        foreach ([94, 104, 114] as $offset) {
            if (!$this->str($row[$offset])) {
                continue;
            }
            $out[] = [
                'client_id'             => $clientId,
                'auth_number'           => $this->str($row[$offset]),
                'insurance_plan_name'   => $this->str($row[$offset + 1]),
                'number_of_visits'      => $this->intVal($row[$offset + 2]),
                'number_of_visits_used' => $this->intVal($row[$offset + 3]),
                'contact_fullname'      => $this->str($row[$offset + 4]),
                'contact_phone'         => $this->formatPhone($row[$offset + 5]),
                'notes'                 => $this->str($row[$offset + 7]),
                'start_date'            => $this->parseDate($row[$offset + 8]),
                'end_date'              => $this->parseDate($row[$offset + 9]),
                'created_at'            => $now,
                'updated_at'            => $now,
            ];
        }
    }

    // ─── Encounters ──────────────────────────────────────────────────────────

    private function collectEncounters(Collection $row, int $clientId, array &$out): void
    {
        $now = now()->toDateTimeString();

        // Encounters 1–9 (5 columns each starting at col 124)
        for ($i = 0; $i < 9; $i++) {
            $offset = 124 + ($i * 5);
            $encId  = $this->intVal($row[$offset]);
            if (!$encId) {
                continue;
            }
            $out[] = [
                'client_id'             => $clientId,
                'external_encounter_id' => (string) $encId,
                'procedure_code'        => $this->str($row[$offset + 1]),
                'procedure_category'    => $this->str($row[$offset + 2]),
                'diagnosis_code'        => $this->str($row[$offset + 3]),
                'encounter_date'        => $this->parseDate($row[$offset + 4]),
                'created_at'            => $now,
                'updated_at'            => $now,
            ];
        }

        // Encounter 10 — only encounter ID in this export format (col 169)
        $enc10 = $this->intVal($row[169]);
        if ($enc10) {
            $out[] = [
                'client_id'             => $clientId,
                'external_encounter_id' => (string) $enc10,
                'procedure_code'        => null,
                'procedure_category'    => null,
                'diagnosis_code'        => null,
                'encounter_date'        => null,
                'created_at'            => $now,
                'updated_at'            => $now,
            ];
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Return trimmed string or null. */
    private function str(mixed $value): ?string
    {
        $s = trim((string) ($value ?? ''));
        return $s === '' ? null : $s;
    }

    /** Return integer or null. */
    private function intVal(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        $int = (int) $value;
        return $int === 0 ? null : $int;
    }

    /**
     * Parse a date value that may be:
     *  - a string "M/D/YYYY" (as exported from the EMR)
     *  - an Excel serial number float
     *  - a PHP DateTime object (PhpSpreadsheet auto-conversion)
     */
    private function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance($value)->toDateString();
        }

        $str = trim((string) $value);
        if ($str === '') {
            return null;
        }

        // M/D/YYYY or MM/DD/YYYY
        if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $str)) {
            try {
                return Carbon::createFromFormat('m/d/Y', $str)->toDateString();
            } catch (\Throwable) {
                return null;
            }
        }

        // Excel serial number
        if (is_numeric($str)) {
            try {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $str))->toDateString();
            } catch (\Throwable) {
                return null;
            }
        }

        // Fallback
        try {
            return Carbon::parse($str)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /** Strip non-digits; return 10-digit US number or raw digits; null if empty. */
    private function formatPhone(mixed $value): ?string
    {
        $digits = preg_replace('/\D/', '', (string) ($value ?? ''));
        return $digits !== '' ? $digits : null;
    }
}
