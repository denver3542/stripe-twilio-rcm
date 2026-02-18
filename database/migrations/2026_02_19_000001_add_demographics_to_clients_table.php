<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            // Make existing columns nullable for imported patients
            $table->string('name')->nullable()->change();
            $table->string('phone', 30)->nullable()->change();
            $table->string('email')->nullable()->change();

            // Patient identity
            $table->string('external_patient_id')->nullable()->unique()->after('id');
            $table->string('prefix', 20)->nullable()->after('external_patient_id');
            $table->string('first_name')->nullable()->after('prefix');
            $table->string('middle_name')->nullable()->after('first_name');
            $table->string('last_name')->nullable()->after('middle_name');
            $table->string('suffix', 20)->nullable()->after('last_name');
            $table->string('ssn', 20)->nullable()->after('suffix');
            $table->date('date_of_birth')->nullable()->after('ssn');
            $table->string('gender', 20)->nullable()->after('date_of_birth');
            $table->string('medical_record_number')->nullable()->after('gender');
            $table->string('marital_status', 50)->nullable()->after('medical_record_number');
            $table->string('employment_status', 50)->nullable()->after('marital_status');
            $table->string('employer_name')->nullable()->after('employment_status');
            $table->string('referral_source')->nullable()->after('employer_name');
            $table->string('insurance_type_name')->nullable()->after('referral_source');

            // Address
            $table->string('address_line1')->nullable()->after('insurance_type_name');
            $table->string('address_line2')->nullable()->after('address_line1');
            $table->string('city', 100)->nullable()->after('address_line2');
            $table->string('state', 100)->nullable()->after('city');
            $table->string('country', 100)->nullable()->after('state');
            $table->string('zip_code', 20)->nullable()->after('country');

            // Phone numbers
            $table->string('home_phone', 30)->nullable()->after('zip_code');
            $table->string('work_phone', 30)->nullable()->after('home_phone');
            $table->string('mobile_phone', 30)->nullable()->after('work_phone');

            // Care team & location
            $table->string('rendering_provider')->nullable()->after('mobile_phone');
            $table->string('primary_care_physician')->nullable()->after('rendering_provider');
            $table->string('referring_provider')->nullable()->after('primary_care_physician');
            $table->string('service_location')->nullable()->after('referring_provider');
            $table->string('payer_scenario', 100)->nullable()->after('service_location');

            // Financial summary (from import)
            $table->string('collection_category')->nullable()->after('payer_scenario');
            $table->decimal('charges', 10, 2)->default(0)->after('collection_category');
            $table->decimal('adjustments', 10, 2)->default(0)->after('charges');
            $table->decimal('insurance_payments', 10, 2)->default(0)->after('adjustments');
            $table->decimal('patient_payments', 10, 2)->default(0)->after('insurance_payments');
            $table->decimal('insurance_balance', 10, 2)->default(0)->after('patient_payments');
            $table->decimal('patient_balance', 10, 2)->default(0)->after('insurance_balance');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn([
                'external_patient_id', 'prefix', 'first_name', 'middle_name', 'last_name',
                'suffix', 'ssn', 'date_of_birth', 'gender', 'medical_record_number',
                'marital_status', 'employment_status', 'employer_name', 'referral_source',
                'insurance_type_name', 'address_line1', 'address_line2', 'city', 'state',
                'country', 'zip_code', 'home_phone', 'work_phone', 'mobile_phone',
                'rendering_provider', 'primary_care_physician', 'referring_provider',
                'service_location', 'payer_scenario', 'collection_category',
                'charges', 'adjustments', 'insurance_payments', 'patient_payments',
                'insurance_balance', 'patient_balance',
            ]);

            $table->string('name')->nullable(false)->change();
            $table->string('phone', 30)->nullable(false)->change();
            $table->string('email')->nullable(false)->change();
        });
    }
};
