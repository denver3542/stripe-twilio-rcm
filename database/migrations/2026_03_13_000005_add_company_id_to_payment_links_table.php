<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_links', function (Blueprint $table) {
            $table->unsignedBigInteger('company_id')->nullable()->after('id');
            $table->foreign('company_id')->references('id')->on('companies')->restrictOnDelete();

            $table->index('company_id');
            $table->index(['company_id', 'payment_status']);
            $table->index(['company_id', 'sms_status']);
            $table->index(['company_id', 'payment_status', 'sms_status']);
        });
    }

    public function down(): void
    {
        Schema::table('payment_links', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropIndex(['company_id']);
            $table->dropIndex(['company_id', 'payment_status']);
            $table->dropIndex(['company_id', 'sms_status']);
            $table->dropIndex(['company_id', 'payment_status', 'sms_status']);
            $table->dropColumn('company_id');
        });
    }
};
