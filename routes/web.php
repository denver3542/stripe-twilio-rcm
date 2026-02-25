<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\ClientImportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PaymentLinkController;
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
    Route::post('clients/batch-send-sms', [ClientController::class, 'batchSendSms'])->name('clients.batch-send-sms');
    Route::post('clients/generate-all-payment-links', [ClientController::class, 'generateAllPaymentLinks'])->name('clients.generate-all-payment-links');
    Route::post('clients/cancel-payment-link-generation', [ClientController::class, 'cancelPaymentLinkGeneration'])->name('clients.cancel-payment-link-generation');
    Route::post('clients/{client}/send-to-phone', [ClientController::class, 'sendToPhone'])->name('clients.send-to-phone');
    Route::resource('clients', ClientController::class);

    Route::get('payment-links', [PaymentLinkController::class, 'index'])->name('payment-links.index');
    Route::post('clients/{client}/payment-links', [PaymentLinkController::class, 'store'])
        ->name('payment-links.store');
    Route::post('payment-links/{paymentLink}/send-sms', [PaymentLinkController::class, 'sendSms'])
        ->name('payment-links.send-sms');
    Route::delete('payment-links/{paymentLink}', [PaymentLinkController::class, 'destroy'])
        ->name('payment-links.destroy');
});

require __DIR__.'/auth.php';
