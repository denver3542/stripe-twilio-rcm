<?php

namespace App\Repositories\Contracts;

use App\Models\User;
use Closure;

interface AuthRepositoryInterface
{
    public function login(User $user): void;

    public function attempt(array $credentials, bool $remember = false): bool;

    public function validate(array $credentials): bool;

    public function logout(): void;

    public function sendResetLink(array $credentials): string;

    public function resetPassword(array $credentials, Closure $callback): string;
}
