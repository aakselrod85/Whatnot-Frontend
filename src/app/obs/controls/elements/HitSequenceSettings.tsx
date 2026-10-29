'use client'

// Settings for `hitSequence` (hit-sequence-plan.md §5). Every write is `onPatchElement(elementKey,
// { ... })` with the full next value — no backend side effects, so no `useSettingWrite` (the config
// push is the whole story, same reasoning as ObsToggleSettings.tsx). This panel only BROWSES OBS
// (scenes/items for the pickers, over the controls page's own connection) and emits rehearsal
// cues; the sequence itself runs on the layout page.
//
// Copied, not shared: the OBS-name fetch/refresh shape from ObsToggleSettings.tsx and the
// channel -> stream -> break events fetch from useLayoutData.tsx.

import { useCallback, useEffect, useState } from 'react'
import type { Element, HitStep, LayoutConfig, TransientCue, VideoPlacement, VideoVariant } from '@/app/obs/layout/schema'
import type { MyOBSWebsocket } from '@/app/entity/my_obs_websocket'
import type { Event, WNChannel, WNStream, GetEventsByBreakResponse } from '@/app/entity/entities'
import { getEndpoints, isBackendFailure, post } from '@/app/lib/backend'
import { TIER_LABEL, type Tier } from '@/app/obs/layout/elements/board-cobra/pricing'
import { isHitBoard } from '@/app/obs/layout/elements/hit-sequence/targets'
import type { PatchElement } from './ElementBlock'

type Props = {
    channelId: number
    elementKey: string
    element: Element
    config: LayoutConfig
    onPatchElement: PatchElement
    onEmitCue?: (cue: TransientCue) => void
    obs: MyOBSWebsocket | null
    isConnected: boolean
}

type StepKind = HitStep['kind']

const randomId = () => Math.random().toString(36).slice(2, 10)

// Default `src` placeholders for the helpers only (plan header): the element never hard-codes them.
const DEFAULT_FLY_SRC = '/images/sports_hit_sequence/ball_fly.webm'
const DEFAULT_FALL_SRC = '/images/sports_hit_sequence/ball_fall_from_left.webm'

const DEFAULT_PIVOT_PLACEMENT: Extract<VideoPlacement, { mode: 'pivot' }> = {
    mode: 'pivot',
    anchor: 'cell',
    match: 'size',
    sizeFactor: 1,
    scale: 1,
    offset: { dx: 0, dy: 0 },
}

function newVariant(src: string, withPivot: boolean): VideoVariant {
    return { id: randomId(), label: '', src, when: 'always', ...(withPivot ? { pivot: { x: 0, y: 0, d: 100 } } : {}) }
}

function newStep(kind: StepKind, existing: HitStep[]): HitStep {
    const base = { id: randomId(), startAt: 'prevEnd' as const, delayMs: 0 }
    switch (kind) {
        case 'video': {
            const first = !existing.some((s) => s.kind === 'video')
            return {
                ...base,
                kind: 'video',
                placement: { ...DEFAULT_PIVOT_PLACEMENT, anchor: first ? 'ball' : 'cell' },
                variants: [newVariant(first ? DEFAULT_FLY_SRC : DEFAULT_FALL_SRC, true)],
            }
        }
        case 'obs':
            return { ...base, kind: 'obs', action: 'show', items: [{ scene: '', source: '' }], holdMs: 500 }
        case 'reveal':
            return { ...base, kind: 'reveal' }
        case 'ball':
            return { ...base, kind: 'ball', action: 'hide' }
        case 'wait':
            return { ...base, kind: 'wait', durationMs: 500 }
    }
}

const num = (raw: string, fallback = 0) => {
    const v = parseFloat(raw)
    return Number.isFinite(v) ? v : fallback
}

/** The file's native size, read from a hidden metadata-only <video> so the operator can sanity-check pivot numbers. */
function NativeSize({ src }: { src: string }) {
    const [size, setSize] = useState<string>('loading…')
    return (
        <span className="small text-secondary">
            native size: {size}
            <video
                key={src}
                src={src}
                preload="metadata"
                muted
                style={{ display: 'none' }}
                onLoadedMetadata={(e) => {
                    const v = e.currentTarget
                    setSize(`${v.videoWidth} × ${v.videoHeight}, ${v.duration.toFixed(2)} s`)
                }}
                onError={() => setSize('not found')}
            />
        </span>
    )
}

export default function HitSequenceSettings({ channelId, elementKey, element, config, onPatchElement, onEmitCue, obs, isConnected }: Props) {
    const seq = element.kind === 'hitSequence' ? element : null
    const steps: HitStep[] = seq?.steps ?? []

    // ---- OBS picker data: scenes and the items of every scene (plan §5) -------------------------
    const [sceneItems, setSceneItems] = useState<Record<string, string[]>>({})
    const refreshObs = useCallback(() => {
        if (!obs || !isConnected) {
            setSceneItems({})
            return
        }
        obs.getSceneList()
            .then((scenes) =>
                Promise.all(
                    scenes.map((s) =>
                        obs.getSceneItemList(s).then((items) => [s.name, items.map((i) => i.name)] as const)
                    )
                )
            )
            .then((pairs) => setSceneItems(Object.fromEntries(pairs)))
            .catch(() => setSceneItems({}))
    }, [obs, isConnected])
    useEffect(() => {
        refreshObs()
    }, [refreshObs])
    const sceneNames = Object.keys(sceneItems)

    // ---- rehearsal team list: channel -> stream -> break events, one shot + Refresh ------------
    const [teams, setTeams] = useState<Event[]>([])
    const [teamId, setTeamId] = useState<number | null>(null)
    const [teamsError, setTeamsError] = useState<string | null>(null)
    const refreshTeams = useCallback(async () => {
        try {
            const channel = (await post(getEndpoints().channel_get, { id: channelId })) as WNChannel
            if (isBackendFailure(channel) || !channel?.active_stream_id) {
                setTeams([])
                setTeamsError('no active stream')
                return
            }
            const stream = (await post(getEndpoints().stream_get, { id: channel.active_stream_id })) as WNStream
            if (isBackendFailure(stream) || !stream?.active_break_id) {
                setTeams([])
                setTeamsError('no active break')
                return
            }
            const resp = (await post(getEndpoints().break_events, { break_id: stream.active_break_id })) as GetEventsByBreakResponse
            if (isBackendFailure(resp)) {
                setTeams([])
                setTeamsError('events failed to load')
                return
            }
            setTeams((resp.events ?? []).filter((e) => !e.is_giveaway && !e.note))
            setTeamsError(null)
        } catch {
            setTeamsError('events failed to load')
        }
    }, [channelId])
    useEffect(() => {
        void refreshTeams()
    }, [refreshTeams])

    if (!seq) return null

    // ---- writes ---------------------------------------------------------------------------------
    const commit = (next: HitStep[]) => onPatchElement(elementKey, { steps: next })
    const patchStep = (i: number, patch: Record<string, unknown>) =>
        commit(steps.map((s, idx) => (idx === i ? ({ ...s, ...patch } as HitStep) : s)))
    const moveStep = (i: number, d: -1 | 1) => {
        const j = i + d
        if (j < 0 || j >= steps.length) return
        const next = steps.slice()
        ;[next[i], next[j]] = [next[j], next[i]]
        commit(next)
    }
    const removeStep = (i: number) => commit(steps.filter((_, idx) => idx !== i))
    const addStep = (kind: StepKind) => commit([...steps, newStep(kind, steps)])

    // ---- target info ----------------------------------------------------------------------------
    const boardKeys = Object.entries(config.elements)
        .filter(([, el]) => isHitBoard(el))
        .map(([key]) => key)
    const resolvedTargetKey = seq.target ?? boardKeys[0]
    const targetEl = resolvedTargetKey ? config.elements[resolvedTargetKey] : undefined
    const targetReveal = targetEl?.kind === 'board' && targetEl.soldReveal === 'gated' ? 'gated' : 'immediate'
    const targetMissing = !!seq.target && !boardKeys.includes(seq.target)

    // ---- step bodies ----------------------------------------------------------------------------
    function renderVideo(step: Extract<HitStep, { kind: 'video' }>, i: number) {
        const p = step.placement
        const pivotMode = p.mode === 'pivot'
        const setPlacement = (patch: Record<string, unknown>) => patchStep(i, { placement: { ...p, ...patch } })
        const setVariants = (variants: VideoVariant[]) => patchStep(i, { variants })
        const patchVariant = (j: number, patch: Partial<VideoVariant>) =>
            setVariants(step.variants.map((v, idx) => (idx === j ? { ...v, ...patch } : v)))
        return (
            <>
                <div className="d-flex flex-wrap gap-2 align-items-end">
                    <div>
                        <label className="form-label mb-0 small">Placement</label>
                        <select
                            className="form-select form-select-sm"
                            value={p.mode}
                            onChange={(e) =>
                                patchStep(i, {
                                    placement:
                                        e.target.value === 'screen'
                                            ? { mode: 'screen' }
                                            : { ...DEFAULT_PIVOT_PLACEMENT },
                                    // pivot mode needs a pivot on every variant (validator); seed missing ones
                                    variants: step.variants.map((v) => (v.pivot ? v : { ...v, pivot: { x: 0, y: 0, d: 100 } })),
                                })
                            }
                        >
                            <option value="screen">full screen</option>
                            <option value="pivot">pivot on anchor</option>
                        </select>
                    </div>
                    {p.mode === 'pivot' && (
                        <>
                            <div>
                                <label className="form-label mb-0 small">Anchor</label>
                                <select className="form-select form-select-sm" value={p.anchor} onChange={(e) => setPlacement({ anchor: e.target.value })}>
                                    <option value="ball">ball</option>
                                    <option value="cell">hit cell</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label mb-0 small">Match</label>
                                <select className="form-select form-select-sm" value={p.match} onChange={(e) => setPlacement({ match: e.target.value })}>
                                    <option value="size">match anchor size</option>
                                    <option value="none">fixed scale</option>
                                </select>
                            </div>
                            {p.match === 'size' ? (
                                <div>
                                    <label className="form-label mb-0 small">Size factor</label>
                                    <input type="number" step={0.05} min={0.05} className="form-control form-control-sm" style={{ width: 90 }} value={p.sizeFactor}
                                        onChange={(e) => { const v = num(e.target.value, 1); if (v > 0) setPlacement({ sizeFactor: v }) }} />
                                </div>
                            ) : (
                                <div>
                                    <label className="form-label mb-0 small">Scale</label>
                                    <input type="number" step={0.05} min={0.05} className="form-control form-control-sm" style={{ width: 90 }} value={p.scale}
                                        onChange={(e) => { const v = num(e.target.value, 1); if (v > 0) setPlacement({ scale: v }) }} />
                                </div>
                            )}
                            <div>
                                <label className="form-label mb-0 small">Offset dx</label>
                                <input type="number" className="form-control form-control-sm" style={{ width: 80 }} value={p.offset.dx}
                                    onChange={(e) => setPlacement({ offset: { ...p.offset, dx: num(e.target.value) } })} />
                            </div>
                            <div>
                                <label className="form-label mb-0 small">dy</label>
                                <input type="number" className="form-control form-control-sm" style={{ width: 80 }} value={p.offset.dy}
                                    onChange={(e) => setPlacement({ offset: { ...p.offset, dy: num(e.target.value) } })} />
                            </div>
                        </>
                    )}
                    <div>
                        <label className="form-label mb-0 small" title="Blank = the file's natural length">Duration ms</label>
                        <input type="number" min={0} className="form-control form-control-sm" style={{ width: 100 }} placeholder="natural"
                            value={step.durationMs ?? ''}
                            onChange={(e) => patchStep(i, { durationMs: e.target.value === '' ? undefined : Math.max(0, num(e.target.value)) })} />
                    </div>
                    <div>
                        <label className="form-label mb-0 small" title="playback rate; the natural duration shrinks or grows with it, an explicit duration does not">Speed</label>
                        {/* Uncontrolled + commit on blur: a controlled field would reject the "0" typed on the way to "0.5". */}
                        <input type="number" min={0.1} max={4} step={0.05} className="form-control form-control-sm" style={{ width: 80 }} placeholder="1"
                            key={`${step.id}-${step.speed ?? ''}`}
                            defaultValue={step.speed ?? ''}
                            onBlur={(e) => {
                                if (e.target.value === '') return patchStep(i, { speed: undefined })
                                patchStep(i, { speed: Math.max(0.1, Math.min(4, num(e.target.value, 1))) })
                            }} />
                        <div className="small text-secondary" style={{ maxWidth: 220 }}>playback rate; the natural duration shrinks or grows with it, an explicit duration does not</div>
                    </div>
                </div>

                <div className="small fw-semibold mt-2">Variants</div>
                {pivotMode && (
                    <div className="small text-secondary">
                        Pivot: ball centre and diameter in THIS file&apos;s pixels at the frame that must match the board: first frame
                        for a fly-in, last frame for a fall.
                    </div>
                )}
                {step.variants.map((v, j) => (
                    <div key={v.id} className="border rounded p-2 mt-1">
                        <div className="d-flex flex-wrap gap-2 align-items-end">
                            <div>
                                <label className="form-label mb-0 small">Label</label>
                                <input type="text" className="form-control form-control-sm" style={{ width: 120 }} value={v.label ?? ''}
                                    onChange={(e) => patchVariant(j, { label: e.target.value || undefined })} />
                            </div>
                            <div className="flex-grow-1">
                                <label className="form-label mb-0 small">src</label>
                                <input type="text" className="form-control form-control-sm" value={v.src} onChange={(e) => patchVariant(j, { src: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label mb-0 small">When</label>
                                <select className="form-select form-select-sm" value={v.when} onChange={(e) => patchVariant(j, { when: e.target.value as VideoVariant['when'] })}>
                                    <option value="always">always</option>
                                    <option value="cellLeftOfBall">cell left of ball</option>
                                    <option value="cellRightOfBall">cell right of ball</option>
                                </select>
                            </div>
                            {pivotMode && (['x', 'y', 'd'] as const).map((axis) => (
                                <div key={axis}>
                                    <label className="form-label mb-0 small">pivot {axis}</label>
                                    <input type="number" className="form-control form-control-sm" style={{ width: 80 }} value={v.pivot?.[axis] ?? 0}
                                        onChange={(e) => {
                                            const cur = v.pivot ?? { x: 0, y: 0, d: 100 }
                                            const value = num(e.target.value)
                                            if (axis === 'd' && value <= 0) return
                                            patchVariant(j, { pivot: { ...cur, [axis]: value } })
                                        }} />
                                </div>
                            ))}
                            <button type="button" className="btn btn-sm btn-outline-danger" disabled={step.variants.length <= 1}
                                onClick={() => setVariants(step.variants.filter((_, idx) => idx !== j))}>
                                ✕
                            </button>
                        </div>
                        <NativeSize src={v.src} />
                    </div>
                ))}
                <button type="button" className="btn btn-sm btn-outline-primary mt-1"
                    onClick={() => setVariants([...step.variants, newVariant(DEFAULT_FALL_SRC, pivotMode)])}>
                    + variant
                </button>
            </>
        )
    }

    function renderObs(step: Extract<HitStep, { kind: 'obs' }>, i: number) {
        const setItems = (items: { scene: string; source: string }[]) => patchStep(i, { items })
        const patchItem = (j: number, patch: Partial<{ scene: string; source: string }>) =>
            setItems(step.items.map((it, idx) => (idx === j ? { ...it, ...patch } : it)))
        return (
            <>
                <div className="d-flex flex-wrap gap-2 align-items-end">
                    <div>
                        <label className="form-label mb-0 small">Action</label>
                        <select className="form-select form-select-sm" value={step.action} onChange={(e) => patchStep(i, { action: e.target.value })}>
                            <option value="show">show</option>
                            <option value="hide">hide</option>
                            <option value="play">play media</option>
                            <option value="showPlay">make visible and play</option>
                        </select>
                    </div>
                    {step.action === 'show' && (
                        <div>
                            <label className="form-label mb-0 small">Hold ms (then auto-hide)</label>
                            <input type="number" min={0} className="form-control form-control-sm" style={{ width: 120 }} placeholder="stay"
                                value={step.holdMs ?? ''}
                                onChange={(e) => patchStep(i, { holdMs: e.target.value === '' ? undefined : Math.max(0, num(e.target.value)) })} />
                        </div>
                    )}
                    {step.action === 'play' && (
                        <div className="form-check mb-1">
                            <input type="checkbox" className="form-check-input" id={`${elementKey}-${step.id}-wfe`} checked={!!step.waitForEnd}
                                onChange={(e) => patchStep(i, { waitForEnd: e.target.checked || undefined })} />
                            <label className="form-check-label small" htmlFor={`${elementKey}-${step.id}-wfe`}>Wait for playback end</label>
                        </div>
                    )}
                </div>
                {step.action === 'showPlay' && (
                    <div className="small text-secondary mt-1">
                        the item must be a media source with &apos;Restart playback when source becomes active&apos; on; it is hidden again when OBS reports playback ended (15 s safety)
                    </div>
                )}
                {step.items.map((it, j) => {
                    const sources = sceneItems[it.scene] ?? []
                    return (
                        <div key={j} className="d-flex flex-wrap gap-2 align-items-end mt-1">
                            {sceneNames.length > 0 ? (
                                <select className="form-select form-select-sm" style={{ width: 180 }} value={it.scene} onChange={(e) => patchItem(j, { scene: e.target.value })}>
                                    <option value="">Select scene</option>
                                    {it.scene && !sceneNames.includes(it.scene) && <option value={it.scene}>{it.scene} (missing)</option>}
                                    {sceneNames.map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                            ) : (
                                <input type="text" className="form-control form-control-sm" style={{ width: 180 }} placeholder="scene" value={it.scene} onChange={(e) => patchItem(j, { scene: e.target.value })} />
                            )}
                            {sceneNames.length > 0 && (
                                <select className="form-select form-select-sm" style={{ width: 200 }} value={sources.includes(it.source) ? it.source : ''} onChange={(e) => e.target.value && patchItem(j, { source: e.target.value })}>
                                    <option value="">Select source</option>
                                    {sources.map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                            )}
                            {/* Always-available free text: the only way to type a `{team}` pattern, and the fallback when OBS is not connected. */}
                            <input type="text" className="form-control form-control-sm" style={{ width: 220 }} placeholder="source (may contain {team})" value={it.source}
                                onChange={(e) => patchItem(j, { source: e.target.value })} />
                            {it.source && sceneNames.length > 0 && it.scene && !it.source.includes('{team}') && !sources.includes(it.source) && (
                                <span className="small text-warning">{it.source} (missing)</span>
                            )}
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setItems(step.items.filter((_, idx) => idx !== j))}>✕</button>
                        </div>
                    )
                })}
                <div className="d-flex gap-2 mt-1">
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setItems([...step.items, { scene: '', source: '' }])}>+ item</button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={refreshObs}>Refresh</button>
                </div>
                <div className="small text-secondary mt-1">
                    Items inside groups/nested scenes are not found; <code>{'{team}'}</code> in a source name is replaced by the hit team.
                </div>
            </>
        )
    }

    return (
        <div className="d-flex flex-column gap-3">
            <div className="d-flex flex-wrap gap-3 align-items-end">
                <div>
                    <label className="form-label mb-0 small">Target board</label>
                    <select className="form-select form-select-sm" value={seq.target ?? ''} onChange={(e) => onPatchElement(elementKey, { target: e.target.value || undefined })}>
                        <option value="">(first sport board)</option>
                        {targetMissing && <option value={seq.target}>{seq.target} (missing)</option>}
                        {boardKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label mb-0 small">Queue cap</label>
                    <input type="number" min={1} max={10} className="form-control form-control-sm" style={{ width: 80 }} value={seq.queueCap ?? 3}
                        onChange={(e) => onPatchElement(elementKey, { queueCap: Math.max(1, Math.min(10, Math.round(num(e.target.value, 3)))) })} />
                </div>
                <div>
                    <label className="form-label mb-0 small">Play for</label>
                    <select className="form-select form-select-sm" value={seq.minTier ?? 'mid'} onChange={(e) => onPatchElement(elementKey, { minTier: e.target.value as Tier })}>
                        <option value="regular">Every team</option>
                        <option value="mid">{TIER_LABEL.mid} and above</option>
                        <option value="good">{TIER_LABEL.good} and above</option>
                        <option value="best">{TIER_LABEL.best} only</option>
                    </select>
                </div>
            </div>
            <div className="small text-secondary">
                Teams below this are marked sold immediately, with no animation. A series without prices has only Side Card teams.
            </div>
            <div className="small text-secondary">
                {resolvedTargetKey ? `Board sold reveal: ${targetReveal}` : 'No sport style / sport priced board in this layout'}
                {resolvedTargetKey && targetReveal === 'immediate' && ' — set to gated for the fall video to land on the cell'}
            </div>

            <div className="d-flex flex-column gap-2">
                {steps.length === 0 && <div className="small text-secondary">No steps: hits are detected and revealed immediately, nothing plays.</div>}
                {steps.map((step, i) => (
                    <div key={step.id} className="border rounded p-2">
                        <div className="d-flex flex-wrap gap-2 align-items-end mb-1">
                            <span className="badge text-bg-secondary">{i + 1}. {step.kind}</span>
                            <div>
                                <label className="form-label mb-0 small">Label</label>
                                <input type="text" className="form-control form-control-sm" style={{ width: 140 }} value={step.label ?? ''}
                                    onChange={(e) => patchStep(i, { label: e.target.value || undefined })} />
                            </div>
                            <div>
                                <label className="form-label mb-0 small">Starts</label>
                                <select className="form-select form-select-sm" value={step.startAt} onChange={(e) => patchStep(i, { startAt: e.target.value })}>
                                    <option value="prevEnd">after previous ends</option>
                                    <option value="prevStart">with previous start</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label mb-0 small">Delay ms</label>
                                <input type="number" min={0} className="form-control form-control-sm" style={{ width: 90 }} value={step.delayMs}
                                    onChange={(e) => patchStep(i, { delayMs: Math.max(0, num(e.target.value)) })} />
                            </div>
                            <div className="btn-group btn-group-sm">
                                <button type="button" className="btn btn-outline-secondary" disabled={i === 0} onClick={() => moveStep(i, -1)}>▲</button>
                                <button type="button" className="btn btn-outline-secondary" disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)}>▼</button>
                                <button type="button" className="btn btn-outline-danger" onClick={() => removeStep(i)}>✕</button>
                            </div>
                        </div>
                        {step.kind === 'video' && renderVideo(step, i)}
                        {step.kind === 'obs' && renderObs(step, i)}
                        {step.kind === 'wait' && (
                            <div>
                                <label className="form-label mb-0 small">Duration ms</label>
                                <input type="number" min={0} className="form-control form-control-sm" style={{ width: 110 }} value={step.durationMs}
                                    onChange={(e) => patchStep(i, { durationMs: Math.max(0, num(e.target.value)) })} />
                            </div>
                        )}
                        {step.kind === 'ball' && (
                            <div>
                                <label className="form-label mb-0 small">Action</label>
                                <select className="form-select form-select-sm" style={{ width: 160 }} value={step.action} onChange={(e) => patchStep(i, { action: e.target.value })}>
                                    <option value="hide">hide ball</option>
                                    <option value="show">show ball</option>
                                </select>
                            </div>
                        )}
                        {step.kind === 'reveal' && <div className="small text-secondary">Flips the hit cell to sold.</div>}
                    </div>
                ))}
                <div className="dropdown">
                    <button type="button" className="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">+ step</button>
                    <ul className="dropdown-menu">
                        {(['video', 'obs', 'reveal', 'ball', 'wait'] as const).map((k) => (
                            <li key={k}><button type="button" className="dropdown-item" onClick={() => addStep(k)}>{k}</button></li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="border rounded p-2">
                <div className="small fw-semibold mb-1">Rehearse</div>
                <div className="d-flex flex-wrap gap-2 align-items-end">
                    <select className="form-select form-select-sm" style={{ width: 220 }} value={teamId ?? teams[0]?.id ?? ''} onChange={(e) => setTeamId(parseInt(e.target.value, 10))}>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.team}{t.customer ? ' (sold)' : ''}</option>)}
                    </select>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void refreshTeams()}>Refresh</button>
                    <button type="button" className="btn btn-sm btn-primary" disabled={!onEmitCue || teams.length === 0}
                        onClick={() => {
                            const id = teamId ?? teams[0]?.id
                            if (id !== undefined) onEmitCue?.({ kind: 'hit-sequence-test', elementKey, eventId: id })
                        }}>
                        Play on this team
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" disabled={!onEmitCue}
                        onClick={() => onEmitCue?.({ kind: 'hit-sequence-abort', elementKey })}>
                        Abort
                    </button>
                </div>
                {teamsError && <div className="small text-secondary mt-1">{teamsError}</div>}
            </div>
        </div>
    )
}
