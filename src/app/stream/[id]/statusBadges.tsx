'use client'

import React from "react";

const streamColors: Record<string, string> = {
    planned: 'bg-secondary', live: 'bg-success', ended: 'bg-dark border border-secondary', failed_to_verify: 'bg-danger', verified: 'bg-primary',
}
const runColors: Record<string, string> = {
    applied: 'bg-success', needs_manual: 'bg-warning text-dark', failed: 'bg-danger', running: 'bg-info text-dark', dry_run: 'bg-secondary',
}

export function StreamStatusBadge({status}: {status?: string}) {
    if (!status) return null
    return <span className={`badge ${streamColors[status] ?? 'bg-secondary'}`}>{status === 'failed_to_verify' ? 'Failed to verify' : status}</span>
}

export function RunStatusBadge({status}: {status: string}) {
    return <span className={`badge ${runColors[status] ?? 'bg-secondary'}`}>{status === 'dry_run' ? 'report only' : status.replace('_', ' ')}</span>
}
