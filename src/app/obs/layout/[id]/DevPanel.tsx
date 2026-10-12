'use client'

// ?dev=1 debug overlay — rendered outside the scaled <Stage> canvas so it stays legible
// regardless of window size. Nothing here touches the backend: the phase buttons are a
// local-only override (obs-layout-plan.md §1.4).

import {useEffect, useState} from 'react'
import type {Phase, Stage} from '../schema'
import {useLayoutData} from '../useLayoutData'
import {useCueBus} from '../cueBus'
import {SCENE_EVENTS} from '../sceneEvents'
import {useLayoutObsInfo} from '../obsConnection'

function agoLabel(now: number | null, at: number | undefined): string {
    if (now === null) return '-'
    if (at === undefined) return 'never'
    const seconds = Math.max(0, Math.round((now - at) / 1000))
    return `${seconds}s ago`
}

export function DevPanel({
    phase,
    stages,
    seq,
    lastBusEventAt,
    onSetPhase,
    hitSequenceKeys = [],
}: {
    phase: Phase
    stages: Stage[]
    seq: number
    lastBusEventAt: number | null
    onSetPhase: (phase: Phase) => void
    // Keys of the config's `hitSequence` elements (hit-sequence-plan.md §7); the block below only
    // renders when there is at least one.
    hitSequenceKeys?: string[]
}) {
    const {lastFetched, events} = useLayoutData()
    const obsInfo = useLayoutObsInfo()
    const [hitKey, setHitKey] = useState('')
    const [hitEventId, setHitEventId] = useState<number | null>(null)
    const [showObsLog, setShowObsLog] = useState(false)
    const hitElementKey = hitSequenceKeys.includes(hitKey) ? hitKey : hitSequenceKeys[0]
    const hitEvents = events.filter((e) => !e.is_giveaway && !e.note)
    const hitEvent = hitEvents.find((e) => e.id === hitEventId) ?? hitEvents[0]
    const cueBus = useCueBus()

    // Date.now()/localStorage must not run during render (SSR has neither) — seed both in
    // effects so the first client render still matches the server's markup.
    const [now, setNow] = useState<number | null>(null)

    useEffect(() => {
        setNow(Date.now())
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="lay-dev-panel">
            <div className="lay-dev-row">
                <span className="lay-dev-label">phase</span>
                <div className="lay-dev-phase-buttons">
                    {stages.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            className={`lay-dev-phase-btn${s.id === phase ? ' lay-dev-phase-btn--active' : ''}`}
                            onClick={() => onSetPhase(s.id)}
                        >
                            {s.id}
                        </button>
                    ))}
                </div>
            </div>
            <div className="lay-dev-row">
                <span className="lay-dev-label">seq</span>
                <span>{seq}</span>
            </div>
            <div className="lay-dev-row">
                <span className="lay-dev-label">last bus event</span>
                <span>{agoLabel(now, lastBusEventAt ?? undefined)}</span>
            </div>
            <div className="lay-dev-row">
                <span className="lay-dev-label">events</span>
                <div className="lay-dev-event-buttons">
                    {SCENE_EVENTS.map((ev) => (
                        <button
                            key={ev.name}
                            type="button"
                            className="lay-dev-event-btn"
                            title={`Emit "${ev.name}" locally, same path as a bus cue`}
                            onClick={() => cueBus.emit({kind: 'event', name: ev.name})}
                        >
                            {ev.label}
                        </button>
                    ))}
                </div>
            </div>
            {hitSequenceKeys.length > 0 && (
                <div className="lay-dev-sources">
                    <div className="lay-dev-row">
                        <span className="lay-dev-label">hit sequence</span>
                        <span>
                            {obsInfo
                                ? `${obsInfo.status} · ${obsInfo.attempts} · ${obsInfo.lastError ?? 'no error'}`
                                : 'obs off (?obs=0)'}
                        </span>
                    </div>
                    <div className="lay-dev-row">
                        {hitSequenceKeys.length > 1 && (
                            <select value={hitElementKey} onChange={(e) => setHitKey(e.target.value)}>
                                {hitSequenceKeys.map((k) => (
                                    <option key={k} value={k}>{k}</option>
                                ))}
                            </select>
                        )}
                        <select value={hitEvent?.id ?? ''} onChange={(e) => setHitEventId(parseInt(e.target.value, 10))}>
                            {hitEvents.map((e) => (
                                <option key={e.id} value={e.id}>{e.team}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="lay-dev-event-btn"
                            disabled={!hitEvent}
                            onClick={() => hitEvent && cueBus.emit({kind: 'hit-sequence-test', elementKey: hitElementKey, eventId: hitEvent.id})}
                        >
                            Play
                        </button>
                        <button
                            type="button"
                            className="lay-dev-event-btn"
                            onClick={() => cueBus.emit({kind: 'hit-sequence-abort', elementKey: hitElementKey})}
                        >
                            Abort
                        </button>
                    </div>
                    <div className="lay-dev-row">
                        <button type="button" className="lay-dev-event-btn" onClick={() => setShowObsLog((v) => !v)}>
                            {showObsLog ? 'Hide' : 'Show'} OBS log
                        </button>
                    </div>
                    {showObsLog && obsInfo && (
                        <pre style={{margin: 0, whiteSpace: 'pre-wrap', fontSize: 11}}>{obsInfo.log.join('\n') || '(empty)'}</pre>
                    )}
                </div>
            )}
            <div className="lay-dev-sources">
                {Object.entries(lastFetched)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, at]) => (
                        <div key={key} className="lay-dev-row">
                            <span className="lay-dev-label">{key}</span>
                            <span>{agoLabel(now, at)}</span>
                        </div>
                    ))}
            </div>
        </div>
    )
}
