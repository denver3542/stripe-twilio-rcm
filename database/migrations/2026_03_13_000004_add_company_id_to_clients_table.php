<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->after('id');
            $table->foreign('company_id')->references('id')->on('companies')->restrictOnDelete();

            $table->index('company_id');
            $table->index(['company_id', 'account_status']);
            $table->index(['company_id', 'exclude_from_payment_links']);
        });

        // Change external_patient_id unique constraint from single-column to compound
        // so the same patient ID can exist in different companies.
        Schema::table('clients', function (Blueprint $table) {
            // Drop the old single-column unique index if it exists
            try {
                $table->dropUnique(['external_patient_id']);
            } catch (\Exception $e) {
                // Index may not exist on fresh installs — safe to ignore
            }
            // Add compound unique index
            $table->unique(['external_patient_id', 'company_id'], 'clients_external_patient_id_company_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropIndex(['company_id']);
            $table->dropIndex(['company_id', 'account_status']);
            $table->dropIndex(['company_id', 'exclude_from_payment_links']);
            $table->dropUnique('clients_external_patient_id_company_id_unique');
            $table->unique('external_patient_id');
            $table->dropColumn('company_id');
        });
    }
};
