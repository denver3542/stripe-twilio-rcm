<?php

namespace App\Providers;

use App\Repositories\AuthRepository;
use App\Repositories\ClientRepository;
use App\Repositories\Contracts\AuthRepositoryInterface;
use App\Repositories\Contracts\ClientRepositoryInterface;
use App\Repositories\Contracts\InvoiceRepositoryInterface;
use App\Repositories\Contracts\SmsLogRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Repositories\InvoiceRepository;
use App\Repositories\SmsLogRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class,    UserRepository::class);
        $this->app->bind(AuthRepositoryInterface::class,    AuthRepository::class);
        $this->app->bind(ClientRepositoryInterface::class,  ClientRepository::class);
        $this->app->bind(InvoiceRepositoryInterface::class, InvoiceRepository::class);
        $this->app->bind(SmsLogRepositoryInterface::class,  SmsLogRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
    }
}
