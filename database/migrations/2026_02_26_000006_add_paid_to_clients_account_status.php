<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE clients MODIFY COLUMN account_status ENUM('active','inactive','pending','paid') NOT NULL DEFAULT 'active'");
    }

    public function down(): void
    {
        // Revert any 'paid' statuses back to 'active' before removing the enum value
        DB::statement("UPDATE clients SET account_status = 'active' WHERE account_status = 'paid'");
        DB::statement("ALTER TABLE clients MODIFY COLUMN account_status ENUM('active','inactive','pending') NOT NULL DEFAULT 'active'");
    }
};
