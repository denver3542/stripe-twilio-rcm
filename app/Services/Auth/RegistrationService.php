<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Repositories\Contracts\AuthRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Hash;

class RegistrationService
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly AuthRepositoryInterface $auth,
    ) {}

    public function register(array $validated): User
    {
        $user = $this->users->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        event(new Registered($user));
        $this->auth->login($user);

        return $user;
    }
}
