<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Auth\Events\Verified;

class EmailVerificationService
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function hasVerifiedEmail(User $user): bool
    {
        return $this->users->hasVerifiedEmail($user);
    }

    public function sendNotification(User $user): bool
    {
        if ($this->users->hasVerifiedEmail($user)) {
            return false;
        }

        $this->users->sendEmailVerificationNotification($user);

        return true;
    }

    public function verify(User $user): bool
    {
        if ($this->users->hasVerifiedEmail($user)) {
            return false;
        }

        if ($this->users->markEmailAsVerified($user)) {
            event(new Verified($user));

            return true;
        }

        return false;
    }
}
