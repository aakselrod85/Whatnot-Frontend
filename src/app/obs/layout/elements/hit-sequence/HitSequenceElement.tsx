'use client'

// The `hitSequence` registry component (hit-sequence-plan.md §3). Invisible except while a sequence
// plays: when a team sells on the target `board:sport_style`, it plays the operator's step list
// (webm videos drawn here, OBS scene-item actions through the layout page's own obs-websocket,
// ball hide/show and the final `reveal-sold`) and only then lets the board turn the cell sold.
//
// Decisions worth knowing before editing (all from the plan):
// - Targets a board like the wrap animations do and reads geometry ONLY through anchors.tsx
//   (`ball`, `cell:<id>`); it never imports from board-sport-style/.
// - Videos are drawn on the FE, not as OBS media sources (§header decisions): their position
//   depends on anchors only the layout knows. They are mounted hidden at mount, per variant, which
//   doubles as the preload of the big webm files.
// - Anchors/metadata are read at each video step's START via refs (the hole or cell may have moved
//   if the board re-laid out), and `element.steps` is re-read at each run start, never mid-run.
// - The cleanup pass (run end OR abort) always restores the ball and hides OBS items still shown;
//   if OBS is down at that moment it is remembered and run on the next connect.
// - Simultaneous sales queue FIFO up to `queueCap`; past the cap the cell is revealed immediately.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ElementProps } from '../../registry'
import type { HitStep, VideoVariant } from '../../schema'
import { CANVAS } from '../../schema'
import { useLayoutData } from '../../useLayoutData'
import { useCueBus } from '../../cueBus'
import { useResolvedAnchor, useTargetShape, type Shape } from '../../anchors'
import { useLayoutObs } from '../../obsConnection'
import type { Event } from '@/app/entity/entities'
import { runSteps, type ObsStep, type RunHandle, type VideoStep } from './runner'
import { chooseVariant, videoRect, type VideoMeta } from './placement'
import { executeObsStep, hideShown, type ShownItem } from './obsSteps'
import { useHitDetector } from './useHitDetector'
import './HitSequence.css'

const QUEUE_GAP_MS = 500
const VIDEO_FALLBACK_MS = 3000
const DEFAULT_QUEUE_CAP = 3

type Active = { runId: number; event: Event; test: boolean }

type RunCtx = {
    runId: number
    event: Event
    test: boolean
    handle: RunHandle | null
    shown: Map<string, ShownItem>
    ballHidden: boolean
    revealEmitted: boolean
    videoByStep: Map<string, string> // step id -> chosen variant id
}

export function HitSequenceElement({ elementKey, element }: ElementProps) {
    const seq = element.kind === 'hitSequence' ? element : null
    const { config, events, stream } = useLayoutData()
    const cueBus = useCueBus()
    const obs = useLayoutObs()
    const activeBreakId = stream?.active_break_id ?? null

    // Default target: the first sport-style board in the config (the only variant that publishes
    // the anchors this element needs).
    const firstSportStyleKey = useMemo(
        () => Object.entries(config.elements).find(([, el]) => el.kind === 'board' && el.variant === 'sport_style')?.[0],
        [config]
    )
    const targetKey = seq?.target ?? firstSportStyleKey

    const [active, setActive] = useState<Active | null>(null)
    const ballShape = useResolvedAnchor(targetKey ?? '', 'ball')
    const boxShape = useTargetShape(targetKey ?? '', undefined)
    const cellShape = useResolvedAnchor(targetKey ?? '', active ? `cell:${active.event.id}` : undefined)

    // Latest values for the runner's callbacks (read at each step's start, not at run start).
    const latest = useRef({ ballShape, boxShape, cellShape, obs, seq, targetKey, events })
    latest.current = { ballShape, boxShape, cellShape, obs, seq, targetKey, events }

    const videoEls = useRef<Map<string, HTMLVideoElement>>(new Map())
    const metaRef = useRef<Map<string, VideoMeta & { durationMs: number }>>(new Map())
    const queueRef = useRef<Event[]>([])
    const activeRef = useRef<RunCtx | null>(null)
    // True between `setActive` and the effect that starts the run, so two hits in one tick cannot
    // both be dequeued into the same slot.
    const startingRef = useRef(false)
    const runCounter = useRef(0)
    const startedRunRef = useRef(0)
    const pumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const pendingCleanup = useRef<Map<string, ShownItem>>(new Map())

    const log = useCallback((message: string) => console.info(`[hitSequence] ${message}`), [])

    const emitReveal = useCallback(
        (eventId: number) => cueBus.emit({ kind: 'reveal-sold', eventId, boardKey: latest.current.targetKey }),
        [cueBus]
    )

    // ---- video elements (one hidden <video> per VARIANT of every video step; also the preload) ----
    const variants = useMemo(() => {
        const out: { stepId: string; variant: VideoVariant }[] = []
        for (const step of seq?.steps ?? []) {
            if (step.kind !== 'video') continue
            for (const variant of step.variants) out.push({ stepId: step.id, variant })
        }
        return out
    }, [seq?.steps])

    function recordMeta(variantId: string, v: HTMLVideoElement) {
        if (v.videoWidth > 0 && Number.isFinite(v.duration)) {
            metaRef.current.set(variantId, { w: v.videoWidth, h: v.videoHeight, durationMs: v.duration * 1000 })
        }
    }

    function hideVideo(variantId: string) {
        const v = videoEls.current.get(variantId)
        if (!v) return
        v.pause()
        v.style.visibility = 'hidden'
    }

    // ---- cleanup pass (plan §3.6/§3.7) -------------------------------------------------------------
    const cleanupPass = useCallback(
        (ctx: RunCtx) => {
            if (ctx.ballHidden) {
                ctx.ballHidden = false
                cueBus.emit({ kind: 'ball-visible', visible: true, boardKey: latest.current.targetKey })
            }
            ctx.videoByStep.forEach((variantId) => hideVideo(variantId))
            void hideShown(latest.current.obs, ctx.shown, log).then((clean) => {
                if (!clean) ctx.shown.forEach((item, key) => pendingCleanup.current.set(key, item))
            })
        },
        [cueBus, log]
    )

    // Run leftovers on the next connect (OBS was down when the cleanup pass ran).
    useEffect(() => {
        if (!obs) return
        return obs.onConnected(() => {
            if (pendingCleanup.current.size === 0) return
            void hideShown(latest.current.obs, pendingCleanup.current, log)
        })
    }, [obs, log])

    // ---- run lifecycle -----------------------------------------------------------------------------
    const pump = useCallback(() => {
        if (activeRef.current || startingRef.current || pumpTimer.current) return
        const next = queueRef.current.shift()
        if (!next) return
        startingRef.current = true
        const runId = ++runCounter.current
        setActive({ runId, event: next, test: false })
    }, [])

    const finishRun = useCallback(
        (ctx: RunCtx, aborted: boolean) => {
            if (activeRef.current !== ctx) return
            cleanupPass(ctx)
            // No `reveal` step (mis-configured list) or an abort of a real run: reveal now so the
            // gated board never waits for its 90 s safety. A rehearsal never reveals.
            if (!ctx.test && !ctx.revealEmitted) {
                ctx.revealEmitted = true
                emitReveal(ctx.event.id)
            }
            activeRef.current = null
            setActive(null)
            log(`${aborted ? 'aborted' : 'finished'} ${ctx.test ? 'rehearsal' : 'hit'} on ${ctx.event.team}`)
            if (pumpTimer.current) clearTimeout(pumpTimer.current)
            pumpTimer.current = setTimeout(() => {
                pumpTimer.current = null
                pump()
            }, QUEUE_GAP_MS)
        },
        [cleanupPass, emitReveal, log, pump]
    )

    const startRun = useCallback(
        (a: Active) => {
            startingRef.current = false
            const steps: HitStep[] = latest.current.seq?.steps ?? [] // re-read per run start
            const ctx: RunCtx = {
                runId: a.runId,
                event: a.event,
                test: a.test,
                handle: null,
                shown: new Map(),
                ballHidden: false,
                revealEmitted: false,
                videoByStep: new Map(),
            }
            activeRef.current = ctx
            log(`${a.test ? 'rehearsal' : 'hit'} on ${a.event.team} (${steps.length} steps)`)
            if (steps.length === 0) {
                // Nothing to play: detect and reveal immediately (plan §3.2).
                finishRun(ctx, false)
                return
            }
            const hooks = {
                startVideo: (step: VideoStep) => {
                    const l = latest.current
                    const anchors = { ball: l.ballShape, cell: l.cellShape }
                    const variant = chooseVariant(step.variants, anchors)
                    log(`video "${step.label ?? step.id}" -> variant "${variant.label ?? variant.id}"`)
                    ctx.videoByStep.set(step.id, variant.id)
                    const el = videoEls.current.get(variant.id)
                    if (el) recordMeta(variant.id, el)
                    const meta = metaRef.current.get(variant.id)
                    const screen: Shape = { x: 0, y: 0, w: CANVAS.w, h: CANVAS.h, rx: 0, ry: 0 }
                    if (!meta) log(`no metadata yet for "${variant.src}", playing at screen`)
                    const rect = meta
                        ? videoRect(step.placement, variant, meta, { screen, ...anchors, box: l.boxShape }, log)
                        : { x: 0, y: 0, w: CANVAS.w, h: CANVAS.h }
                    if (el) {
                        el.style.left = `${rect.x}px`
                        el.style.top = `${rect.y}px`
                        el.style.width = `${rect.w}px`
                        el.style.height = `${rect.h}px`
                        el.style.visibility = 'visible'
                        el.currentTime = 0
                        el.playbackRate = step.speed ?? 1
                        el.play().catch((e) => log(`play() rejected for "${variant.src}": ${String(e)}`))
                    }
                    // An explicit override is real clock time; the natural length scales with the speed.
                    return step.durationMs ?? (meta ? meta.durationMs / (step.speed ?? 1) : VIDEO_FALLBACK_MS)
                },
                stopVideo: (step: VideoStep) => {
                    const id = ctx.videoByStep.get(step.id)
                    if (id) hideVideo(id)
                },
                obs: (step: ObsStep) => executeObsStep(step, ctx.event.team, latest.current.obs, log, ctx.shown),
                reveal: () => {
                    if (ctx.test || ctx.revealEmitted) return
                    ctx.revealEmitted = true
                    emitReveal(ctx.event.id)
                },
                ball: (visible: boolean) => {
                    ctx.ballHidden = !visible
                    cueBus.emit({ kind: 'ball-visible', visible, boardKey: latest.current.targetKey })
                },
                log,
            }
            const handle = runSteps(steps, hooks)
            ctx.handle = handle
            void handle.done.then(() => finishRun(ctx, false))
        },
        [cueBus, emitReveal, finishRun, log]
    )

    // Starts the run for a newly committed `active` (state, so the `cell:<id>` anchor subscription
    // exists before the first video step reads it). Guarded by run id: StrictMode runs effects twice.
    useEffect(() => {
        if (!active || startedRunRef.current === active.runId) return
        startedRunRef.current = active.runId
        startRun(active)
    }, [active, startRun])

    const abortAll = useCallback(() => {
        // Queued hits would otherwise sit gated until the board's safety timeout.
        const queued = queueRef.current.splice(0)
        queued.forEach((e) => emitReveal(e.id))
        const ctx = activeRef.current
        if (ctx) {
            ctx.handle?.abort()
            finishRun(ctx, true)
        } else {
            // Idle: still make sure the ball is back (plan §6.8).
            cueBus.emit({ kind: 'ball-visible', visible: true, boardKey: latest.current.targetKey })
        }
    }, [cueBus, emitReveal, finishRun])

    // ---- detection ---------------------------------------------------------------------------------
    const queueCap = Number.isInteger(seq?.queueCap) ? (seq?.queueCap as number) : DEFAULT_QUEUE_CAP
    const onHit = useCallback(
        (event: Event) => {
            if (queueRef.current.length < queueCap) {
                queueRef.current.push(event)
                pump()
            } else {
                log(`queue full (${queueCap}), revealing ${event.team} without a sequence`)
                emitReveal(event.id)
            }
        },
        [queueCap, pump, emitReveal, log]
    )
    useHitDetector({ events, activeBreakId, enabled: !!targetKey, onHit })

    // ---- rehearsal / abort cues --------------------------------------------------------------------
    useEffect(() => {
        return cueBus.subscribe((cue) => {
            if (cue.kind === 'hit-sequence-test') {
                if (cue.elementKey !== elementKey) return
                if (activeRef.current || startingRef.current) {
                    log('rehearsal ignored: a sequence is already running')
                    return
                }
                const event = latest.current.events.find((e) => e.id === cue.eventId)
                if (!event) {
                    log(`rehearsal ignored: event ${cue.eventId} not found`)
                    return
                }
                startingRef.current = true
                setActive({ runId: ++runCounter.current, event, test: true })
            } else if (cue.kind === 'hit-sequence-abort') {
                if (cue.elementKey !== undefined && cue.elementKey !== elementKey) return
                abortAll()
            }
        })
    }, [cueBus, elementKey, abortAll, log])

    // Unmount (stage switch, config change): stop everything without revealing — the board's gate
    // timeout covers any hit still pending, and the ball must never stay hidden.
    useEffect(() => {
        return () => {
            if (pumpTimer.current) clearTimeout(pumpTimer.current)
            const ctx = activeRef.current
            if (ctx) {
                ctx.handle?.abort()
                if (ctx.ballHidden) cueBus.emit({ kind: 'ball-visible', visible: true, boardKey: latest.current.targetKey })
                void hideShown(latest.current.obs, ctx.shown, () => {})
                activeRef.current = null
            }
            queueRef.current = []
        }
    }, [cueBus])

    return (
        <div className="hitseq-root">
            {variants.map(({ variant }) => (
                <video
                    key={variant.id}
                    ref={(el) => {
                        if (el) {
                            videoEls.current.set(variant.id, el)
                            recordMeta(variant.id, el)
                        } else {
                            videoEls.current.delete(variant.id)
                        }
                    }}
                    className="hitseq-video"
                    src={variant.src}
                    muted
                    playsInline
                    preload="auto"
                    onLoadedMetadata={(e) => recordMeta(variant.id, e.currentTarget)}
                />
            ))}
        </div>
    )
}

export default HitSequenceElement
