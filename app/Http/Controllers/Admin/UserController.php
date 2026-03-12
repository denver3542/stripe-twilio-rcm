<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Users/Index', [
            'users'     => User::with('companies')->orderBy('name')->get(),
            'companies' => Company::active()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function toggleAdmin(User $user): RedirectResponse
    {
        // Prevent self-demotion to avoid lockout
        if ($user->id === auth()->id() && $user->is_admin) {
            return redirect()->back()->with('error', 'You cannot remove your own admin access.');
        }

        $user->update(['is_admin' => ! $user->is_admin]);

        $status = $user->is_admin ? 'granted' : 'revoked';

        return redirect()->back()->with('success', "Admin access {$status} for {$user->name}.");
    }
}
