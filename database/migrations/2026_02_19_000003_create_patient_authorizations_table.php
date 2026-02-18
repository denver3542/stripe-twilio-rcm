<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_authorizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('auth_number')->nullable();
            $table->string('insurance_plan_name')->nullable();
            $table->unsignedInteger('number_of_visits')->nullable();
            $table->unsignedInteger('number_of_visits_used')->nullable();
            $table->string('contact_fullname')->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->text('notes')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_authorizations');
    }
};
