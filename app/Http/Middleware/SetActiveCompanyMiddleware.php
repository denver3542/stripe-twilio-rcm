<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Services\CompanyContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SetActiveCompanyMiddleware
{
    public function __construct(private readonly CompanyContext $context) {}

    public function handle(Request $request, Closure $next): mixed
    {
        $user = Auth::user();

        if (! $user) {
            return $next($request);
        }

        $sessionCompanyId = $request->session()->get('active_company_id');

        if ($user->is_admin) {
            $company = $sessionCompanyId
                ? Company::active()->find($sessionCompanyId)
                : null;

            $company ??= Company::active()->first();
        } else {
            $assignedIds = $user->companies()->active()->pluck('companies.id');

            if ($assignedIds->isEmpty()) {
                if ($request->routeIs('logout')) {
                    return $next($request);
                }
                return Inertia::render('NoCompanyAccess')->toResponse($request);
            }

            $company = ($sessionCompanyId && $assignedIds->contains($sessionCompanyId))
                ? Company::find($sessionCompanyId)
                : Company::find($assignedIds->first());
        }

        if ($company) {
            $this->context->set($company);
            $request->session()->put('active_company_id', $company->id);
        }

        return $next($request);
    }
}
