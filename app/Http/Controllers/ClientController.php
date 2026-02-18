<?php

namespace App\Http\Controllers;

use App\Http\Requests\Client\StoreClientRequest;
use App\Http\Requests\Client\UpdateClientRequest;
use App\Models\Client;
use App\Services\ClientService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function __construct(
        private readonly ClientService $clientService,
    ) {}

    public function index(Request $request): Response
    {
        $query = Client::query();

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('mobile_phone', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('external_patient_id', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('account_status', $status);
        }

        $query->orderByRaw("COALESCE(last_name, name, '') ASC")
              ->orderByRaw("COALESCE(first_name, '') ASC");

        return Inertia::render('Clients/Index', [
            'clients' => $query->paginate(20)->withQueryString(),
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Clients/Create');
    }

    public function store(StoreClientRequest $request): RedirectResponse
    {
        $client = $this->clientService->store($request->validated());

        return redirect()->route('clients.show', $client);
    }

    public function show(Client $client): Response
    {
        $client->load([
            'invoices'              => fn ($q) => $q->orderByDesc('created_at')->limit(20),
            'patientInsurances',
            'patientAuthorizations',
            'encounters'            => fn ($q) => $q->orderByDesc('encounter_date'),
        ]);

        return Inertia::render('Clients/Show', [
            'client' => $client,
        ]);
    }

    public function edit(Client $client): Response
    {
        return Inertia::render('Clients/Edit', [
            'client' => $client,
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client): RedirectResponse
    {
        $this->clientService->update($client, $request->validated());

        return redirect()->route('clients.show', $client);
    }

    public function destroy(Client $client): RedirectResponse
    {
        $this->clientService->destroy($client);

        return redirect()->route('clients.index');
    }
}
