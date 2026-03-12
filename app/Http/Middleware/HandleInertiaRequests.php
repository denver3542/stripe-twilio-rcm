<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Services\CompanyContext;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user    = $request->user();
        $context = app(CompanyContext::class);

        $activeCompany = null;
        $availableCompanies = [];

        if ($user && $context->isSet()) {
            $company       = $context->get();
            $activeCompany = ['id' => $company->id, 'name' => $company->name];

            if ($user->is_admin) {
                $availableCompanies = Company::active()
                    ->orderBy('name')
                    ->get(['id', 'name'])
                    ->toArray();
            } else {
                $availableCompanies = $user->companies()
                    ->active()
                    ->orderBy('companies.name')
                    ->get(['companies.id', 'companies.name'])
                    ->toArray();
            }
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user'     => $user,
                'is_admin' => $user?->is_admin ?? false,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
            'activeCompany'      => $activeCompany,
            'availableCompanies' => $availableCompanies,
        ];
    }
}
