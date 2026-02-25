<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->text('stripe_payment_link_url')->nullable();
            $table->string('stripe_payment_link_id')->nullable()->unique();
            $table->decimal('amount', 10, 2);
            $table->string('description')->nullable();
            $table->enum('payment_status', ['pending', 'paid', 'failed', 'expired'])->default('pending');
            $table->enum('sms_status', ['not_sent', 'sent', 'failed'])->default('not_sent');
            $table->timestamp('sms_sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_links');
    }
};
