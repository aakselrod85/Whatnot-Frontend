'use client'
import React, {FC, useState} from "react";
import {WhatnotShow} from "@/app/entity/entities";

const PAGE_SIZE = 10

interface WhatnotShowListProps {
    shows: WhatnotShow[]
    currentShowId: string | null
    disabled: boolean
    onPick: (id: string) => void
    hasOlder?: boolean
    olderLoading?: boolean
    olderFailed?: boolean
    onLoadOlder?: () => Promise<number>
}

export const WhatnotShowListComponent: FC<WhatnotShowListProps> = ({shows, currentShowId, disabled, onPick, hasOlder, olderLoading, olderFailed, onLoadOlder}) => {
    const [page, setPage] = useState(() => {
        const idx = currentShowId ? shows.findIndex(sh => sh.id === currentShowId) : -1
        return idx >= 0 ? Math.floor(idx / PAGE_SIZE) : 0
    })

    const totalPages = Math.max(1, Math.ceil(shows.length / PAGE_SIZE))
    const visible = shows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    const canLoadOlder = !!onLoadOlder && !!hasOlder

    async function loadOlder() {
        if (!onLoadOlder) return
        const firstNewIndex = shows.length
        const added = await onLoadOlder()
        if (added > 0) setPage(Math.floor(firstNewIndex / PAGE_SIZE))
    }

    return (
        <>
            {shows.length === 0 ? (
                <div className="text-muted">
                    {canLoadOlder ? 'No recent shows.' : <>No shows returned — check the channel&apos;s Whatnot API key.</>}
                </div>
            ) : (
                <div className="d-flex flex-column gap-1" style={totalPages > 1 ? {minHeight: '536px'} : undefined}>
                    {visible.map(sh => (
                        <button
                            key={sh.id}
                            type="button"
                            className={`btn btn-sm text-start ${sh.id === currentShowId ? 'btn-primary' : 'btn-outline-light'}`}
                            disabled={disabled}
                            onClick={() => onPick(sh.id)}
                        >
                            <span className="d-block text-truncate" title={sh.title}>
                                {sh.status === 'live' ? '🔴 ' : ''}{sh.title}
                            </span>
                            <span className="d-block small opacity-75">
                                {`${sh.status}${sh.scheduled_start_at ? ` · ${new Date(sh.scheduled_start_at).toLocaleString()}` : ''}`}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {totalPages > 1 && (
                <div className="d-flex align-items-center gap-2 mt-3">
                    <button type="button" className="btn btn-sm btn-outline-light" disabled={disabled || page === 0} onClick={() => setPage(page - 1)}>
                        Prev
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-light" disabled={disabled || page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                        Next
                    </button>
                    <small className="text-muted ms-auto">Page {page + 1} of {totalPages} · {shows.length} shows</small>
                </div>
            )}
            {canLoadOlder && (
                <div className="d-flex align-items-center gap-2 mt-2">
                    <button type="button" className="btn btn-sm btn-outline-light" disabled={disabled || olderLoading} onClick={() => void loadOlder()}>
                        {olderLoading ? 'Loading…' : 'Load older shows'}
                    </button>
                    {olderFailed && <small className="text-warning">Couldn&apos;t load older shows</small>}
                </div>
            )}
        </>
    )
}
