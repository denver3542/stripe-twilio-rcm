<?php

namespace App\Repositories;

use App\Models\User;
use App\Repositories\Contracts\AuthRepositoryInterface;
use Closure;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;

class AuthRepository implements AuthRepositoryInterface
{
    public function login(User $user): void
    {
        Auth::login($user);
    }

    public function attempt(array $credentials, bool $remember = false): bool
    {
        return Auth::guard('web')->attempt($credentials, $remember);
    }

    public function validate(array $credentials): bool
    {
        return Auth::guard('web')->validate($credentials);
    }

    public function logout(): void
    {
        Auth::guard('web')->logout();
    }

    public function sendResetLink(array $credentials): string
    {
        return Password::sendResetLink($credentials);
    }

    public function resetPassword(array $credentials, Closure $callback): string
    {
        return Password::reset($credentials, $callback);
    }
}
