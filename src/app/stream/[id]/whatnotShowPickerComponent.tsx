'use client'
import React, {FC, useState} from "react";
import {WhatnotShow} from "@/app/entity/entities";
import {WhatnotShowListComponent} from "@/app/stream/[id]/whatnotShowListComponent";

interface WhatnotShowPickerProps {
    shows: WhatnotShow[]
    loading: boolean
    partialFailure: boolean
    currentShowId: string | null
    onSelect: (id: string) => Promise<boolean>
    onRetry: () => void
    hasOlder: boolean
    olderLoading: boolean
    olderFailed: boolean
    onLoadOlder: () => Promise<number>
    onClose: () => void
}

export const WhatnotShowPickerComponent: FC<WhatnotShowPickerProps> = ({shows, loading, partialFailure, currentShowId, onSelect, onRetry, hasOlder, olderLoading, olderFailed, onLoadOlder, onClose}) => {
    const [saving, setSaving] = useState(false)

    const currentMissing = !loading && !!currentShowId && !shows.some(sh => sh.id === currentShowId)

    async function choose(id: string) {
        if (saving) return
        if (id === currentShowId) {
            onClose()
            return
        }
        setSaving(true)
        try {
            const ok = await onSelect(id)
            if (ok) onClose()
        } finally {
            setSaving(false)
        }
    }

    function close() {
        if (!saving) onClose()
    }

    return (
        <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-3"
            style={{background: 'rgba(0,0,0,0.6)'}}
            onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
            <div className="bg-dark text-white border rounded p-3" style={{width: '640px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto'}}>
                <div className="d-flex align-items-center gap-2 mb-3">
                    <h5 className="mb-0 me-auto">Select Whatnot show</h5>
                    {currentShowId && (
                        <button type="button" className="btn btn-sm btn-outline-danger" disabled={saving} onClick={() => choose('')}>
                            Unlink
                        </button>
                    )}
                    <button type="button" className="btn btn-sm btn-outline-light" disabled={saving} onClick={close}>
                        Close
                    </button>
                </div>
                {currentMissing && (
                    <small className="text-muted d-block mb-2">Currently linked: {currentShowId}</small>
                )}
                {loading ? (
                    <div className="text-muted">Loading shows…</div>
                ) : (
                    <>
                        {partialFailure && (
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <small className="text-warning">Some shows couldn&apos;t be loaded</small>
                                <button type="button" className="btn btn-sm btn-outline-light" onClick={onRetry}>Retry</button>
                            </div>
                        )}
                        <WhatnotShowListComponent
                            shows={shows}
                            currentShowId={currentShowId}
                            disabled={saving}
                            onPick={choose}
                            hasOlder={hasOlder}
                            olderLoading={olderLoading}
                            olderFailed={olderFailed}
                            onLoadOlder={onLoadOlder}
                        />
                    </>
                )}
            </div>
        </div>
    )
}
