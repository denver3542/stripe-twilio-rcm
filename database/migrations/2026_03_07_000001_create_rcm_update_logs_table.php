<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rcm_update_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('patient_id')->nullable()->index();
            $table->string('event');        // 'auth_token_fetch' | 'patient_status_update'
            $table->string('status');       // 'success' | 'failed' | 'retried_success' | 'retried_failed' | 'skipped'
            $table->string('triggered_by')->default('webhook'); // 'webhook' | 'manual' | 'job' | 'system'
            $table->integer('http_status')->nullable();
            $table->json('request_payload')->nullable();
            $table->text('response_body')->nullable();
            $table->text('error_message')->nullable();
            $table->boolean('retried')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rcm_update_logs');
    }
};
