<?php

namespace App\Services;

use App\Models\Company;
use RuntimeException;

/**
 * Holds the active Company for the current request or job lifecycle.
 * Registered as a singleton in AppServiceProvider.
 * Set by SetActiveCompanyMiddleware (web requests) or directly in Job::handle() (queue).
 */
class CompanyContext
{
    private ?Company $company = null;

    public function set(Company $company): void
    {
        $this->company = $company;
    }

    public function get(): Company
    {
        if ($this->company === null) {
            throw new RuntimeException(
                'CompanyContext: no active company has been set for this request.'
            );
        }

        return $this->company;
    }

    public function getId(): int
    {
        return $this->get()->id;
    }

    public function getName(): string
    {
        return $this->get()->name;
    }

    public function isSet(): bool
    {
        return $this->company !== null;
    }
}
