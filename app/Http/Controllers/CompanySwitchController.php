<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CompanySwitchController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $request->validate([
            'company_id' => ['required', 'integer', 'exists:companies,id'],
        ]);

        $user      = $request->user();
        $companyId = (int) $request->company_id;

        // Non-admins may only switch to companies they're assigned to
        if (! $user->is_admin) {
            $assigned = $user->companies()->pluck('companies.id');
            if (! $assigned->contains($companyId)) {
                abort(403, 'You are not assigned to this company.');
            }
        }

        $request->session()->put('active_company_id', $companyId);

        return redirect()->back();
    }
}
