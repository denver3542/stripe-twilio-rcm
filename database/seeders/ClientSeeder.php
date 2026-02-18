<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        $clients = [
            [
                'name'                => 'Riverside Medical Group',
                'contact_name'        => 'Sandra Reyes',
                'phone'               => '+15005550006',
                'email'               => 'billing@riversidemedical.example',
                'outstanding_balance' => 4250.00,
                'insurance_info'      => "Carrier: BlueCross BlueShield\nPolicy #: BCB-998-771\nGroup #: GRP-44210",
                'account_status'      => 'active',
            ],
            [
                'name'                => 'Harmon Physical Therapy',
                'contact_name'        => 'James Harmon',
                'phone'               => '+15005550006',
                'email'               => 'jharmon@harmonpt.example',
                'outstanding_balance' => 1875.50,
                'insurance_info'      => "Carrier: Aetna\nPolicy #: AET-554-882\nGroup #: GRP-77031",
                'account_status'      => 'active',
            ],
            [
                'name'                => 'Clearview Orthopedics',
                'contact_name'        => 'Dr. Patricia Lin',
                'phone'               => '+15005550006',
                'email'               => 'accounts@clearviewortho.example',
                'outstanding_balance' => 9320.75,
                'insurance_info'      => "Carrier: United Health\nPolicy #: UHC-221-663\nGroup #: GRP-88102\nNote: Pre-auth required for procedures over $500",
                'account_status'      => 'active',
            ],
            [
                'name'                => 'Lakeshore Family Practice',
                'contact_name'        => null,
                'phone'               => '+15005550006',
                'email'               => 'billing@lakeshorefp.example',
                'outstanding_balance' => 0.00,
                'insurance_info'      => "Carrier: Cigna\nPolicy #: CIG-773-991",
                'account_status'      => 'active',
            ],
            [
                'name'                => 'Westfield Urgent Care',
                'contact_name'        => 'Maria Santos',
                'phone'               => '+15005550006',
                'email'               => 'msantos@westfielduc.example',
                'outstanding_balance' => 640.00,
                'insurance_info'      => "Carrier: Humana\nPolicy #: HUM-441-220",
                'account_status'      => 'pending',
            ],
            [
                'name'                => 'Summit Behavioral Health',
                'contact_name'        => 'Dr. Kevin Tran',
                'phone'               => '+15005550006',
                'email'               => 'ktran@summitbh.example',
                'outstanding_balance' => 0.00,
                'insurance_info'      => null,
                'account_status'      => 'inactive',
            ],
        ];

        foreach ($clients as $client) {
            Client::query()->updateOrCreate(
                ['email' => $client['email']],
                $client,
            );
        }
    }
}
