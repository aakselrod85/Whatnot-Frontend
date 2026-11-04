'use client'
import React, {FC, useState} from "react";
import {WhatnotShow} from "@/app/entity/entities";
import {WhatnotShowListComponent} from "@/app/stream/[id]/whatnotShowListComponent";

interface WhatnotShowStepProps {
    shows: WhatnotShow[]
    loading: boolean
    partialFailure: boolean
    showSkip: boolean
    onSelect: (id: string) => Promise<boolean>
    onRetry: () => void
    onSkip: () => void
}

export const WhatnotShowStepComponent: FC<WhatnotShowStepProps> = ({shows, loading, partialFailure, showSkip, onSelect, onRetry, onSkip}) => {
    const [saving, setSaving] = useState(false)

    async function pick(id: string) {
        if (saving) return
        setSaving(true)
        try {
            await onSelect(id)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="bg-dark text-white border rounded p-3 mx-auto mt-5" style={{width: '640px', maxWidth: '100%'}}>
            <div className="d-flex align-items-center gap-2 mb-2">
                <h5 className="mb-0 me-auto">Select Whatnot show</h5>
                {showSkip && (
                    <button type="button" className="btn btn-sm btn-outline-light" onClick={onSkip}>
                        Skip
                    </button>
                )}
            </div>
            <p className="mb-3">Link this stream to its Whatnot show to continue.</p>
            {loading ? (
                <div className="text-muted">Loading shows…</div>
            ) : shows.length === 0 ? (
                <>
                    <WhatnotShowListComponent shows={shows} currentShowId={null} disabled={saving} onPick={pick}/>
                    <button type="button" className="btn btn-sm btn-outline-light mt-2" onClick={onRetry}>Retry</button>
                </>
            ) : (
                <>
                    {partialFailure && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <small className="text-warning">Some shows couldn&apos;t be loaded</small>
                            <button type="button" className="btn btn-sm btn-outline-light" onClick={onRetry}>Retry</button>
                        </div>
                    )}
                    <WhatnotShowListComponent shows={shows} currentShowId={null} disabled={saving} onPick={pick}/>
                </>
            )}
        </div>
    )
}
