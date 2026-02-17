<?php

namespace App\Services\Auth;

use App\Http\Requests\Auth\LoginRequest;
use App\Repositories\Contracts\AuthRepositoryInterface;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthenticationService
{
    public function __construct(
        private readonly AuthRepositoryInterface $auth,
    ) {}

    /**
     * @throws \Illuminate\Validation\ValidationException
     */
    public function login(LoginRequest $request): void
    {
        $this->ensureIsNotRateLimited($request);

        if (! $this->auth->attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey($request));

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey($request));
        $request->session()->regenerate();
    }

    /**
     * @throws \Illuminate\Validation\ValidationException
     */
    public function confirmPassword(Request $request, string $password): void
    {
        if (! $this->auth->validate([
            'email' => $request->user()->email,
            'password' => $password,
        ])) {
            throw ValidationException::withMessages([
                'password' => __('auth.password'),
            ]);
        }

        $request->session()->put('auth.password_confirmed_at', time());
    }

    public function logout(Request $request): void
    {
        $this->auth->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    /**
     * @throws \Illuminate\Validation\ValidationException
     */
    private function ensureIsNotRateLimited(LoginRequest $request): void
    {
        $throttleKey = $this->throttleKey($request);

        if (! RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return;
        }

        event(new Lockout($request));

        $seconds = RateLimiter::availableIn($throttleKey);

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    private function throttleKey(LoginRequest $request): string
    {
        return Str::transliterate(Str::lower((string) $request->string('email')).'|'.$request->ip());
    }
}
