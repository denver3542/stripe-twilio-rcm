<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Insert (or find existing) TSPT company
        $existing = DB::table('companies')->where('stripe_config_key', 'TSPT')->first();

        if ($existing) {
            $companyId = $existing->id;
        } else {
            $companyId = DB::table('companies')->insertGetId([
                'name'              => 'True Sport PT',
                'stripe_config_key' => 'TSPT',
                'twilio_config_key' => 'TSPT',
                'is_active'         => true,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);
        }

        // 2. Backfill all tables — idempotent (only sets null rows)
        DB::table('clients')->whereNull('company_id')->update(['company_id' => $companyId]);
        DB::table('payment_links')->whereNull('company_id')->update(['company_id' => $companyId]);
        DB::table('client_payments')->whereNull('company_id')->update(['company_id' => $companyId]);
        DB::table('rcm_update_logs')->whereNull('company_id')->update(['company_id' => $companyId]);
        DB::table('payment_link_sms_logs')->whereNull('company_id')->update(['company_id' => $companyId]);

        // 3. Assign the first user as admin and attach to TSPT company
        $firstUser = DB::table('users')->orderBy('id')->first();
        if ($firstUser) {
            DB::table('users')->where('id', $firstUser->id)->update(['is_admin' => true]);

            $alreadyAttached = DB::table('company_user')
                ->where('company_id', $companyId)
                ->where('user_id', $firstUser->id)
                ->exists();

            if (! $alreadyAttached) {
                DB::table('company_user')->insert([
                    'company_id' => $companyId,
                    'user_id'    => $firstUser->id,
                    'created_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Nullify backfilled rows (best-effort; cannot perfectly reverse)
        $tspt = DB::table('companies')->where('stripe_config_key', 'TSPT')->first();
        if ($tspt) {
            DB::table('clients')->where('company_id', $tspt->id)->update(['company_id' => null]);
            DB::table('payment_links')->where('company_id', $tspt->id)->update(['company_id' => null]);
            DB::table('client_payments')->where('company_id', $tspt->id)->update(['company_id' => null]);
            DB::table('rcm_update_logs')->where('company_id', $tspt->id)->update(['company_id' => null]);
            DB::table('payment_link_sms_logs')->where('company_id', $tspt->id)->update(['company_id' => null]);
            DB::table('company_user')->where('company_id', $tspt->id)->delete();
            DB::table('companies')->where('id', $tspt->id)->delete();
        }
    }
};
