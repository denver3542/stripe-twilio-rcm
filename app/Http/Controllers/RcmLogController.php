<?php

namespace App\Http\Controllers;

use App\Models\RcmUpdateLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RcmLogController extends Controller
{
    public function index(Request $request): Response
    {
        $allowedSorts = ['created_at', 'event', 'status', 'http_status', 'patient_id'];
        $sort = in_array($request->input('sort'), $allowedSorts) ? $request->input('sort') : 'created_at';
        $dir  = $request->input('direction') === 'asc' ? 'asc' : 'desc';

        $query = RcmUpdateLog::with('client')->orderBy($sort, $dir);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('event')) {
            $query->where('event', $request->event);
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', 'like', '%' . $request->patient_id . '%');
        }

        $logs = $query->paginate(50)->withQueryString();

        $stats = [
            'total'           => RcmUpdateLog::count(),
            'success'         => RcmUpdateLog::whereIn('status', ['success', 'retried_success'])->count(),
            'failed'          => RcmUpdateLog::whereIn('status', ['failed', 'retried_failed'])->count(),
            'skipped'         => RcmUpdateLog::where('status', 'skipped')->count(),
            'retried'         => RcmUpdateLog::where('retried', true)->count(),
            'token_failures'  => RcmUpdateLog::where('event', 'auth_token_fetch')->where('status', 'failed')->count(),
        ];

        return Inertia::render('RcmLogs/Index', [
            'logs'    => $logs,
            'stats'   => $stats,
            'filters' => (object) array_filter($request->only(['status', 'event', 'from', 'to', 'patient_id', 'sort', 'direction']), fn ($v) => $v !== null),
        ]);
    }
}
