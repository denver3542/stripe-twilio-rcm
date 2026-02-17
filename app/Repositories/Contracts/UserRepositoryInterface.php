<?php

namespace App\Repositories\Contracts;

use App\Models\User;

interface UserRepositoryInterface
{
    public function create(array $attributes): User;

    public function save(User $user): bool;

    public function updatePassword(User $user, string $hashedPassword, ?string $rememberToken = null): bool;

    public function delete(User $user): bool;

    public function hasVerifiedEmail(User $user): bool;

    public function markEmailAsVerified(User $user): bool;

    public function sendEmailVerificationNotification(User $user): void;
}
