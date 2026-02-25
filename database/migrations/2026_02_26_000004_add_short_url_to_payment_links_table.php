<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_links', function (Blueprint $table) {
            $table->string('short_url')->nullable()->after('stripe_payment_link_url');
        });
    }

    public function down(): void
    {
        Schema::table('payment_links', function (Blueprint $table) {
            $table->dropColumn('short_url');
        });
    }
};
