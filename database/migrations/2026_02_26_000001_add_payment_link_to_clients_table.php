<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->text('payment_link')->nullable()->after('patient_balance');
            $table->string('stripe_payment_link_id')->nullable()->after('payment_link');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['payment_link', 'stripe_payment_link_id']);
        });
    }
};
