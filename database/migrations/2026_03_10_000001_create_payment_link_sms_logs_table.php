<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_link_sms_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_link_id')->nullable()->constrained('payment_links')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('batch_id')->nullable()->index(); // UUID grouping a batch run
            $table->string('phone_number')->nullable();
            $table->text('sms_body')->nullable();
            $table->string('status');                   // 'sent' | 'failed' | 'skipped'
            $table->string('message_sid')->nullable();  // Twilio message SID
            $table->text('error_message')->nullable();
            $table->string('triggered_by')->default('manual'); // 'batch' | 'manual'
            $table->timestamp('sent_at')->nullable()->index();  // explicit send time for date filtering
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_link_sms_logs');
    }
};
