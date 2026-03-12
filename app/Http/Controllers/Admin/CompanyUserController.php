<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CompanyUserController extends Controller
{
    public function attach(Request $request, User $user, Company $company): RedirectResponse
    {
        $user->companies()->syncWithoutDetaching([$company->id]);

        return redirect()->back()->with('success', "{$user->name} assigned to {$company->name}.");
    }

    public function detach(Request $request, User $user, Company $company): RedirectResponse
    {
        $user->companies()->detach($company->id);

        return redirect()->back()->with('success', "{$user->name} removed from {$company->name}.");
    }
}
