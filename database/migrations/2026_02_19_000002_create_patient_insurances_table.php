<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_insurances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['primary', 'secondary']);
            $table->string('company_name')->nullable();
            $table->string('plan_name')->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('country', 100)->nullable();
            $table->string('zip_code', 20)->nullable();
            $table->string('policy_number')->nullable();
            $table->string('group_number')->nullable();
            $table->date('effective_start_date')->nullable();
            $table->date('effective_end_date')->nullable();
            $table->string('insured_relationship', 50)->nullable();
            $table->string('insured_full_name')->nullable();
            $table->string('insured_id_number')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_insurances');
    }
};
