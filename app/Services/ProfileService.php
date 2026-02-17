<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\Contracts\AuthRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Http\Request;

class ProfileService
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly AuthRepositoryInterface $auth,
    ) {}

    public function update(User $user, array $validated): void
    {
        $user->fill($validated);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $this->users->save($user);
    }

    public function destroy(Request $request): void
    {
        $user = $request->user();

        $this->auth->logout();
        $this->users->delete($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
