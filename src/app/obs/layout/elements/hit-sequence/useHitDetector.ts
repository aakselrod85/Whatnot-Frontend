'use client'

// Sold detection for `hitSequence` (hit-sequence-plan.md §3.3): the events-poll diff with a mount
// baseline — the rule pending-sold-cards-plan.md §2.1 and FlatBoard's "settled" snapshot use, copied
// in shape, not code. Giveaways and noted events never trigger (the board does not show them either).
// Nothing is persisted: a refresh re-baselines, so a sale during a refresh is lost to the sequence
// (the board's gate timeout still reveals it — accepted in the plan).
import { useEffect, useRef } from 'react'
import type { Event } from '@/app/entity/entities'

export function useHitDetector(args: {
    events: Event[]
    activeBreakId: number | null
    enabled: boolean
    onHit: (event: Event) => void
}): void {
    const { events, activeBreakId, enabled, onHit } = args
    const onHitRef = useRef(onHit)
    onHitRef.current = onHit
    // customer per event id as of the previous array; null = no baseline yet.
    const prevRef = useRef<Map<number, string> | null>(null)
    const breakRef = useRef<number | null | undefined>(undefined)

    useEffect(() => {
        if (!enabled || activeBreakId === null) {
            prevRef.current = null
            breakRef.current = undefined
            return
        }
        // A new break (or a re-enable) re-baselines.
        if (breakRef.current !== activeBreakId) {
            breakRef.current = activeBreakId
            prevRef.current = null
        }
        // Events of the previous break linger until the new fetch lands — only the ACTIVE break's count.
        const current = events.filter((e) => e.break_id === activeBreakId && !e.is_giveaway && !e.note)
        const next = new Map(current.map((e) => [e.id, e.customer]))
        const prev = prevRef.current
        if (prev === null) {
            if (current.length === 0) return // first NON-EMPTY array is the baseline
            prevRef.current = next
            return
        }
        prevRef.current = next
        for (const e of current) {
            const before = prev.get(e.id)
            if (e.customer !== '' && (before === undefined || before === '')) onHitRef.current(e)
        }
    }, [events, activeBreakId, enabled])
}
