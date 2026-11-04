'use client'

import React from "react";

const streamColors: Record<string, string> = {
    planned: 'bg-secondary', live: 'bg-success', ended: 'bg-dark border border-secondary', verified: 'bg-primary',
}
const runColors: Record<string, string> = {
    applied: 'bg-success', needs_manual: 'bg-warning text-dark', failed: 'bg-danger', running: 'bg-info text-dark',
}

export function StreamStatusBadge({status}: {status?: string}) {
    if (!status) return null
    return <span className={`badge ${streamColors[status] ?? 'bg-secondary'}`}>{status}</span>
}

export function RunStatusBadge({status}: {status: string}) {
    return <span className={`badge ${runColors[status] ?? 'bg-secondary'}`}>{status.replace('_', ' ')}</span>
}
