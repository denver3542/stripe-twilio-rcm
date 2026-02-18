<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientImportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin'       => Route::has('login'),
        'canRegister'    => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion'     => PHP_VERSION,
    ]);
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('clients/import', [ClientImportController::class, 'show'])->name('clients.import');
    Route::post('clients/import', [ClientImportController::class, 'store'])->name('clients.import.store');
    Route::resource('clients', ClientController::class);

    Route::post('invoices/{invoice}/payment-link', [InvoiceController::class, 'createPaymentLink'])
        ->name('invoices.payment-link');
    Route::post('invoices/{invoice}/send-sms', [InvoiceController::class, 'sendSms'])
        ->name('invoices.send-sms');
    Route::resource('invoices', InvoiceController::class);
});

require __DIR__.'/auth.php';
