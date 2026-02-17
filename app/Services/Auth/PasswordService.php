<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Repositories\Contracts\AuthRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordService
{
    public function __construct(
        private readonly AuthRepositoryInterface $auth,
        private readonly UserRepositoryInterface $users,
    ) {}

    /**
     * @throws \Illuminate\Validation\ValidationException
     */
    public function sendResetLink(string $email): void
    {
        $status = $this->auth->sendResetLink(['email' => $email]);

        if ($status === Password::RESET_LINK_SENT) {
            return;
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }

    /**
     * @throws \Illuminate\Validation\ValidationException
     */
    public function resetPassword(array $validated): void
    {
        $status = $this->auth->resetPassword(
            [
                'email' => $validated['email'],
                'password' => $validated['password'],
                'password_confirmation' => $validated['password_confirmation'],
                'token' => $validated['token'],
            ],
            function (User $user) use ($validated): void {
                $this->users->updatePassword(
                    $user,
                    Hash::make($validated['password']),
                    Str::random(60)
                );

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return;
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }

    public function updateUserPassword(User $user, string $password): void
    {
        $this->users->updatePassword($user, Hash::make($password));
    }
}
