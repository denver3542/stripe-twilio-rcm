<?php

namespace App\Repositories;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;

class UserRepository implements UserRepositoryInterface
{
    public function create(array $attributes): User
    {
        return User::query()->create($attributes);
    }

    public function save(User $user): bool
    {
        return $user->save();
    }

    public function updatePassword(User $user, string $hashedPassword, ?string $rememberToken = null): bool
    {
        $attributes = ['password' => $hashedPassword];

        if ($rememberToken !== null) {
            $attributes['remember_token'] = $rememberToken;
        }

        return $user->forceFill($attributes)->save();
    }

    public function delete(User $user): bool
    {
        return (bool) $user->delete();
    }

    public function hasVerifiedEmail(User $user): bool
    {
        return $user->hasVerifiedEmail();
    }

    public function markEmailAsVerified(User $user): bool
    {
        return $user->markEmailAsVerified();
    }

    public function sendEmailVerificationNotification(User $user): void
    {
        $user->sendEmailVerificationNotification();
    }
}
