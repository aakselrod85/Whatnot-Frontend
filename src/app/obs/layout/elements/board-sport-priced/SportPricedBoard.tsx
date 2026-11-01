'use client'

// The `board:sport_priced` registry component — board:sport_style's football field with a PRICE on
// every tile, for the priced sports stream (it replaces `board:cobra` there; neither cobra nor
// sport_style is changed). Wide tiles (logo + price) on the same turf painter (turfTexture.ts), the
// football as one seat of the bottom row, and cobra's top-down value order (pricedFillLayout.ts).
//
// Tiers come from the same `assignTiers` call (and the same channel-wide thresholds and series
// default price) as board:cobra/cobra_flat/sport_style, so a team lands on the same tier everywhere.
// God/Giant/Chaser wear gold/silver/copper (priceMaterials.ts) with their price left rounded up to
// $25 — cobra's own display price; Side Cards are one plain chalk for every team and show the series
// default price shortened to its floor ("$50-$149" → "$50+").
//
// Geometry (priced-board-fill-plan.md): the box is the field. Sold teams LEAVE the board (fade and
// shrink in place, then the rest glide to their new rects) and the unsold ones are re-solved to the
// largest tile that fills the box (pricedFillLayout.ts), rows centred vertically in the field with the short
// row on top. The football is one tile-sized seat in the bottom row; `cols`/`cellAspect` only size the field ticks and padding; the ball is always present.
// Every rect is whole px (a fractional edge rasterises soft in OBS's CEF).
//
// Stream-safe: no dashed stitch, no quarter hash ticks, no seam ticks — one solid tick per column
// line, a midfield line and the border. The turf recipe is the operator's (`turf` JSON, same blob
// as sport_style); its stream-safe preset is the playground's.
//
// Shine (`shine`, default on): continuous overlapping champagne sweeps across gold and a strong permanent halo; a bright
// silver sweep every seven seconds. Negative staggered delays start every tile mid-cycle immediately.
//
// Anchors: `field`, `grid`, `ball` and the dynamic `cell:<eventId>` family, the same names
// board:sport_style publishes, so an overlay aimed at one board can be aimed at this one.

import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import type {ElementProps} from '../../registry'
import {useLayoutData} from '../../useLayoutData'
import {useCueBus} from '../../cueBus'
import {usePublishAnchors, type Shape} from '../../anchors'
import type {Event} from '@/app/entity/entities'
import {TeamIconSrc} from '@/app/common/teams'
import {getSpotAbbreviation} from '@/app/common/spot_label'
import {renderTurf} from '@/app/obs/sport_style/turfTexture'
import {mix, type RGB} from '@/app/obs/sport_style/patchColors'
import {hasLogo, useTeamPalette} from '@/app/obs/sport_style/teamPalette'
import {DEFAULT_PATCH, DEFAULT_PRICED_TURF} from '@/app/obs/sport_style/fieldConstants'
import PricePatchCell, {tileMetrics} from '@/app/obs/sport_style/PricePatchCell'
import {TIER_MATERIALS} from '@/app/obs/sport_style/priceMaterials'
import {fillGeometry, pricedFillLayout} from '@/app/obs/sport_style/pricedFillLayout'
import {pricedOrder, shortRange} from '@/app/obs/sport_style/pricedLayout'
import {
    assignTiers,
    BEST_THRESHOLD,
    DEFAULT_PRICE,
    GOOD_THRESHOLD,
    MID_THRESHOLD,
    type Tier,
} from '../board-cobra/pricing'
import type {FlatCell} from '../board-cobra-flat/layout'
import './SportPricedBoard.css'

export const DEFAULT_PRICED_COLS = 7
export const DEFAULT_CELL_ASPECT = 2

const BALL_SRC = '/images/sport_style/ball.png'
const FALLBACK_BACKGROUND: RGB = [40, 40, 40]
// Conservative Barlow Condensed 600 advance, with room for the widest digits and the + suffix.
const PRICE_EM_PER_CHAR = 0.48

// hit-sequence-plan.md §2.3: the sold gate's safety net — a gated cell that was seen sold but never
// got a `reveal-sold` cue (sequence aborted, hitSequence missing from the stage, queue overflow in
// another tab) turns sold on its own after this long, so a mis-set-up gate can never freeze a cell.
const GATE_TIMEOUT_MS = 90_000

// Exit (fade + shrink) and reflow (FLIP glide) durations.
const EXIT_MS = 500
const REFLOW_MS = 500

// One turf seed per page load, re-rolled by the panel's Regenerate turf (the same
// `sport-style-regenerate` cue sport_style listens to).
const seeds = {turf: Math.floor(Math.random() * 2 ** 31)}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

type CellProps = {
    event: Event
    x: number
    y: number
    w: number
    h: number
    tier: Tier
    price: string
    priceFontPx: number
    shine: boolean
    shineDelayS: number
    leaving: boolean
    nodeRef?: (el: HTMLDivElement | null) => void
}

// Gold's breathing halo, on top of the tile's own static glow.
const GOLD_HALO = '0 0 20px 7px rgba(255,198,24,0.9), 0 0 34px 11px rgba(255,147,0,0.5)'

/** One tile, in its own component so `useTeamPalette` (a hook) runs once per event. */
function PricedCell({event, x, y, w, h, tier, price, priceFontPx, shine, shineDelayS, leaving, nodeRef}: CellProps) {
    const sold = false
    const withLogo = hasLogo(event.team)
    const palette = useTeamPalette(event.team)
    const background = palette
        ? (DEFAULT_PATCH.mixEnabled ? mix(palette.background, palette.secondary, DEFAULT_PATCH.mixRatio) : palette.background)
        : FALLBACK_BACKGROUND
    return (
        <div ref={nodeRef} className={leaving ? 'spp-cell spp-cell--leaving' : 'spp-cell'} style={{left: x, top: y, width: w, height: h}}>
            {shine && !sold && tier === 'best' && (
                <div className="spp-halo" style={{borderRadius: tileMetrics(w, h).radius, boxShadow: GOLD_HALO, animationDelay: `${shineDelayS}s`}} />
            )}
            <PricePatchCell
                w={w}
                h={h}
                background={background}
                logoSrc={withLogo ? TeamIconSrc(event.team) : ''}
                label={withLogo ? undefined : getSpotAbbreviation(event.team)}
                price={price}
                priceFontPx={priceFontPx}
                material={TIER_MATERIALS[tier]}
                sold={sold}
                shine={shine}
                shineDelayS={shineDelayS}
            />
        </div>
    )
}

export function SportPricedBoard({elementKey, element, box}: ElementProps) {
    const {stream, events: rawEvents, series, priceRanges, teamPrices} = useLayoutData()
    const boardElement = element.kind === 'board' ? element : null

    const cols = Math.max(2, Math.round(boardElement?.cols ?? DEFAULT_PRICED_COLS))
    const shine = boardElement?.shine ?? true
    const turf = useMemo(
        () => ({...DEFAULT_PRICED_TURF, ...(isPlainObject(boardElement?.turf) ? (boardElement?.turf as Partial<typeof DEFAULT_PRICED_TURF>) : {})}),
        [boardElement?.turf]
    )

    const events = useMemo(() => rawEvents.filter((e) => !e.is_giveaway && !e.note), [rawEvents])

    // ---- sold gate (hit-sequence-plan.md §2.3), copied from SportStyleBoard ----------------------
    // `revealed` = sold event ids allowed to RENDER sold. The baseline marks everything already sold
    // at mount (or on a break change) revealed, so only sales seen afterwards are held back.
    const gated = boardElement?.soldReveal === 'gated'
    const activeBreakId = stream?.active_break_id ?? null
    const [revealed, setRevealed] = useState<Set<number>>(() => new Set())
    const baselineBreakRef = useRef<number | null>(null)
    const isShownSold = (e: Event) => e.customer !== '' && (!gated || revealed.has(e.id))

    // Same tier inputs and threshold fallbacks as SportStyleBoard/CobraFlatBoard.
    const unsoldTeamNames = useMemo(
        () => events.filter((e) => !(e.customer !== '' && (!gated || revealed.has(e.id)))).map((e) => e.team),
        [events, gated, revealed]
    )
    const defaultPrice = series?.default_price || DEFAULT_PRICE
    const bestThreshold = priceRanges.find((r) => r.tier_id === 'best')?.price_from ?? BEST_THRESHOLD
    const goodThreshold = priceRanges.find((r) => r.tier_id === 'good')?.price_from ?? GOOD_THRESHOLD
    const midThreshold = priceRanges.find((r) => r.tier_id === 'mid')?.price_from ?? MID_THRESHOLD
    const teamCells = useMemo(
        () => assignTiers(unsoldTeamNames, teamPrices, defaultPrice, {bestThreshold, goodThreshold, midThreshold}),
        [unsoldTeamNames, teamPrices, defaultPrice, bestThreshold, goodThreshold, midThreshold]
    )
    const cellByTeam = useMemo(() => {
        const m = new Map<string, {tier: Tier; price: string}>()
        for (const c of teamCells) {
            if (!m.has(c.team)) m.set(c.team, {tier: c.tier, price: c.tier === 'regular' ? shortRange(c.displayPrice) : c.displayPrice})
        }
        return m
    }, [teamCells])
    const priceLeftByTeam = useMemo(() => new Map(teamPrices.map((p) => [p.team, p.price_left])), [teamPrices])

    const geo = fillGeometry(box.w, box.h, {cols: boardElement?.cols, cellAspect: boardElement?.cellAspect, margin: boardElement?.margin, tierSizing: boardElement?.tierSizing},
        {cols: DEFAULT_PRICED_COLS, aspect: DEFAULT_CELL_ASPECT})
    const {innerW, innerH, edgeGap, refCellW: cellW, refCellH: cellH} = geo
    const gridLeft = Math.floor((innerW - cols * cellW) / 2)
    const tierSizing = !!boardElement?.tierSizing

    // ---- exit tracking ---------------------------------------------------------------------------
    // `leaving` = events that just turned shown-sold and are fading out; they keep their seat (and
    // tier) until the timer fires. Detected DURING render (set-state-in-render) so no frame ever
    // paints the tile already removed. `aliveRef` = ids dealt as unsold at the last commit.
    const [leaving, setLeaving] = useState<Set<number>>(() => new Set())
    const aliveRef = useRef<Set<number>>(new Set())
    const leaveTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
    const tierCacheRef = useRef<Map<number, {tier: Tier; price: string; priceLeft: number}>>(new Map())
    const newlySold = events.filter((e) => isShownSold(e) && aliveRef.current.has(e.id) && !leaving.has(e.id)).map((e) => e.id)
    if (newlySold.length) setLeaving(new Set([...Array.from(leaving), ...newlySold]))
    useLayoutEffect(() => {
        aliveRef.current = new Set(events.filter((e) => !isShownSold(e)).map((e) => e.id))
        // `isShownSold` is rebuilt every render; its inputs are the deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, gated, revealed])
    useEffect(() => {
        const timers = leaveTimersRef.current
        const ids = new Set(events.map((e) => e.id))
        leaving.forEach((id) => {
            if (timers.has(id)) return
            timers.set(id, setTimeout(() => {
                timers.delete(id)
                setLeaving((prev) => { const next = new Set(prev); next.delete(id); return next })
            }, EXIT_MS))
        })
        timers.forEach((t, id) => {
            if (!leaving.has(id) || !ids.has(id)) {
                clearTimeout(t)
                timers.delete(id)
                if (leaving.has(id)) setLeaving((prev) => { const next = new Set(prev); next.delete(id); return next })
            }
        })
    }, [leaving, events])
    useEffect(() => {
        const timers = leaveTimersRef.current
        return () => {
            timers.forEach((t) => clearTimeout(t))
            timers.clear()
        }
    }, [])

    // Deal the value-ordered unsold (and leaving) cells; the solver seats them.
    const dealt = useMemo(() => {
        const cache = tierCacheRef.current
        const eventById = new Map(events.map((e) => [e.id, e]))
        const flat: FlatCell[] = []
        const priceById = new Map<number, string>()
        for (const e of events) {
            const shownSold = isShownSold(e)
            if (shownSold && !leaving.has(e.id)) continue
            let tier: Tier, price: string, priceLeft: number
            if (shownSold) {
                const c = cache.get(e.id)
                tier = c?.tier ?? 'regular'
                price = c?.price ?? shortRange(defaultPrice)
                priceLeft = c?.priceLeft ?? 0
            } else {
                tier = cellByTeam.get(e.team)?.tier ?? 'regular'
                price = cellByTeam.get(e.team)?.price ?? shortRange(defaultPrice)
                priceLeft = priceLeftByTeam.get(e.team) ?? 0
                cache.set(e.id, {tier, price, priceLeft})
            }
            priceById.set(e.id, price)
            flat.push({eventId: e.id, team: e.team, tier, sold: false, priceLeft})
        }
        return pricedOrder(flat).map((c) => ({event: eventById.get(c.eventId)!, tier: c.tier, price: priceById.get(c.eventId)!}))
        // `isShownSold` is rebuilt every render; its inputs are the deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, cellByTeam, priceLeftByTeam, defaultPrice, gated, revealed, leaving])

    const layout = useMemo(() => pricedFillLayout(dealt.map((d) => d.tier), geo.opts),
        // `geo.opts` is rebuilt every render; its inputs are the deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [dealt, box.w, box.h, geo.cols, geo.aspect, geo.margin, tierSizing])
    const blockX = edgeGap
    // The block is centred vertically in the field (when the width cap leaves it shorter than the box).
    const blockY = edgeGap + Math.floor((innerH - 2 * edgeGap - layout.height) / 2)

    // Fit to the longest price; each tile's font follows its own size.
    const priceUnits = (price: string) => price.length - (price.startsWith('$') ? 0.4 : 0)
    const maxLen = dealt.reduce((m, d) => Math.max(m, priceUnits(d.price)), 3.6)

    // Shine stagger: `dealt` runs top-down in value order, so the n-th tile of a tier is the n-th
    // from the top. Both tiers start mid-cycle, spread evenly, so they never flash in unison.
    const tierCount = {best: 0, good: 0, mid: 0, regular: 0} as Record<Tier, number>
    for (const p of dealt) tierCount[p.tier]++
    const tierSeen = {best: 0, good: 0, mid: 0, regular: 0} as Record<Tier, number>
    const cells = dealt.map((p, i) => {
        const n = tierSeen[p.tier]++
        const cycle = TIER_MATERIALS[p.tier].shine?.cycleS ?? 0
        const shineDelayS = cycle > 0 ? -((n + 0.5) * cycle) / Math.max(1, tierCount[p.tier]) : 0
        const rect = layout.boxes[i]
        const font = Math.max(8, Math.floor(Math.min(rect.h * 0.92, tileMetrics(rect.w, rect.h).priceRoom / (maxLen * PRICE_EM_PER_CHAR))))
        return {...p, shineDelayS: Math.round(shineDelayS * 100) / 100,
            x: blockX + rect.x, y: blockY + rect.y, w: rect.w, h: rect.h, priceFontPx: font}
    })

    // The ball is one tile-sized seat; the 2:1 art scales with the tile (it covers ~90% of the png).
    const ballSpan = layout.ball ? {x: blockX + layout.ball.x, y: blockY + layout.ball.y, w: layout.ball.w, h: layout.ball.h} : undefined
    // The art is 2:1; fit it inside the (stretched) seat.
    const ballW = ballSpan ? Math.min(ballSpan.w, 2 * ballSpan.h) : 0
    const ballRect = ballSpan
        ? {x: Math.round(ballSpan.x + (ballSpan.w - ballW) / 2), y: Math.round(ballSpan.y + (ballSpan.h - ballW / 2) / 2), w: ballW, h: Math.round(ballW / 2)}
        : undefined

    // ---- FLIP: survivors glide from their old rect to the new one ---------------------------------
    const nodesRef = useRef<Map<number, HTMLDivElement>>(new Map())
    const prevRectsRef = useRef<Map<number, {x: number; y: number; w: number; h: number}>>(new Map())
    const nodeRefFor = useCallback((id: number) => (el: HTMLDivElement | null) => {
        if (el) nodesRef.current.set(id, el)
        else nodesRef.current.delete(id)
    }, [])
    useLayoutEffect(() => {
        const prev = prevRectsRef.current
        const next = new Map<number, {x: number; y: number; w: number; h: number}>()
        for (const c of cells) {
            const rect = {x: c.x, y: c.y, w: c.w, h: c.h}
            next.set(c.event.id, rect)
            const old = prev.get(c.event.id)
            const node = nodesRef.current.get(c.event.id)
            if (!old || !node) continue
            if (old.x === rect.x && old.y === rect.y && old.w === rect.w && old.h === rect.h) continue
            node.style.transition = 'none'
            node.style.transformOrigin = '0 0'
            node.style.transform = `translate(${old.x - rect.x}px, ${old.y - rect.y}px) scale(${old.w / rect.w}, ${old.h / rect.h})`
            node.getBoundingClientRect()
            node.style.transition = `transform ${REFLOW_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
            node.style.transform = 'none'
        }
        prevRectsRef.current = next
    })

    const fieldRadius = Math.round(cellH * 0.25)
    const borderW = Math.max(2, Math.round(cellH * 0.05))
    const lineW = Math.max(2, Math.round(cellH * 0.05))
    const tickW = Math.max(3, Math.round(cellH * 0.065))
    const tickH = Math.max(4, Math.round(edgeGap * 0.6))
    const borderInset = Math.max(2, Math.round(edgeGap * 0.3))

    const originX = box.x + geo.margin
    const originY = box.y + geo.margin
    const anchors = useMemo(() => {
        const out: Record<string, Shape> = {
            field: {x: originX, y: originY, w: innerW, h: innerH, rx: fieldRadius, ry: fieldRadius},
            grid: {x: originX + blockX, y: originY + blockY, w: layout.width, h: layout.height, rx: 0, ry: 0},
        }
        // Square so `match: 'size'` hands off the video ball at the same size as on sport_style;
        // the art itself is `ballW × ballW/2`. Cell anchors are FINAL rects, never FLIP-interpolated.
        if (ballRect) out.ball = {x: originX + ballRect.x, y: originY + ballRect.y + ballRect.h / 2 - ballRect.w / 2, w: ballRect.w, h: ballRect.w, rx: ballRect.w / 2, ry: ballRect.w / 2}
        for (const c of cells) out[`cell:${c.event.id}`] = {x: originX + c.x, y: originY + c.y, w: c.w, h: c.h, rx: 0, ry: 0}
        return out
        // `cells`/`ballRect` are rebuilt every render; their inputs are the deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [originX, originY, innerW, innerH, fieldRadius, blockX, blockY, layout, dealt, ])
    usePublishAnchors(elementKey, anchors)

    const [turfTick, setTurfTick] = useState(0)
    const cueBus = useCueBus()
    useEffect(() => {
        return cueBus.subscribe((cue) => {
            if (cue.kind !== 'sport-style-regenerate' || cue.target !== 'turf') return
            seeds.turf = Math.floor(Math.random() * 2 ** 31)
            setTurfTick((t) => t + 1)
        })
    }, [cueBus])

    // hit-sequence-plan.md §2.3: the ball art's visibility, driven by `ball-visible` cues from the
    // hitSequence element. Hidden = `visibility: hidden` only (the node and the `ball` anchor stay).
    // Back to visible on mount and on a break change.
    const [ballVisible, setBallVisible] = useState(true)
    useEffect(() => {
        setBallVisible(true)
    }, [activeBreakId])
    useEffect(() => {
        return cueBus.subscribe((cue) => {
            if (cue.kind !== 'ball-visible') return
            if (cue.boardKey !== undefined && cue.boardKey !== elementKey) return
            setBallVisible(cue.visible)
        })
    }, [cueBus, elementKey])

    // Sold gate baseline (layout effect: no painted frame shows an already-sold cell as unsold).
    // Events of a previous break can linger until the new fetch lands, so only events carrying the
    // ACTIVE break id count as the baseline.
    useLayoutEffect(() => {
        if (!gated) return
        if (activeBreakId === null) {
            baselineBreakRef.current = null
            return
        }
        if (baselineBreakRef.current === activeBreakId) return
        const current = rawEvents.filter((e) => e.break_id === activeBreakId)
        if (current.length === 0) return
        baselineBreakRef.current = activeBreakId
        const baseline = current.filter((e) => e.customer !== '').map((e) => e.id)
        // Already-sold at mount: never play an exit for them.
        baseline.forEach((id) => aliveRef.current.delete(id))
        setRevealed(new Set(baseline))
    }, [gated, activeBreakId, rawEvents])

    // `reveal-sold` cues from hitSequence.
    useEffect(() => {
        return cueBus.subscribe((cue) => {
            if (cue.kind !== 'reveal-sold') return
            if (cue.boardKey !== undefined && cue.boardKey !== elementKey) return
            setRevealed((prev) => (prev.has(cue.eventId) ? prev : new Set(prev).add(cue.eventId)))
        })
    }, [cueBus, elementKey])

    // Safety timeouts + re-arming: every gated-but-unrevealed sold id is revealed GATE_TIMEOUT_MS
    // after it was first seen; an id that goes back to unsold is dropped from `revealed` so a later
    // re-sale gates again.
    const gateTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
    useEffect(() => {
        const timers = gateTimersRef.current
        if (!gated || baselineBreakRef.current === null) return
        const soldIds = new Set(rawEvents.filter((e) => e.customer !== '').map((e) => e.id))
        for (const e of rawEvents) {
            if (e.customer === '' || revealed.has(e.id) || timers.has(e.id)) continue
            timers.set(
                e.id,
                setTimeout(() => {
                    timers.delete(e.id)
                    setRevealed((prev) => (prev.has(e.id) ? prev : new Set(prev).add(e.id)))
                }, GATE_TIMEOUT_MS)
            )
        }
        timers.forEach((t, id) => {
            if (revealed.has(id) || !soldIds.has(id)) {
                clearTimeout(t)
                timers.delete(id)
            }
        })
        if (Array.from(revealed).some((id) => !soldIds.has(id) && rawEvents.some((e) => e.id === id))) {
            setRevealed((prev) => new Set(Array.from(prev).filter((id) => soldIds.has(id) || !rawEvents.some((e) => e.id === id))))
        }
    }, [gated, rawEvents, revealed])
    useEffect(() => {
        const timers = gateTimersRef.current
        return () => {
            timers.forEach((t) => clearTimeout(t))
            timers.clear()
        }
    }, [])

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const turfKey = JSON.stringify(turf)
    // The canvas only exists once a stream + break are active (the early returns below); before
    // that this effect finds no canvas, so `fieldShown` is a dep to re-run it when the field mounts
    // (the old row count going 0 -> n used to do this job).
    const fieldShown = !!stream?.active_break_id
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, innerW, innerH)
        if (!turf.enabled) return
        // Recipe-level keys the painter doesn't take (field shape/line knobs of sport_style's geometry).
        const {enabled: _e, edgeGap: _g, ticksAreaHeight: _t, turfMargin: _m, tickHFactor: _th, seamTickHFactor: _sh, seamTicks: _s, cornerWidth: _cw, cornerRoundness: _cr, borderWidth: _bw, ...params} = turf
        renderTurf(ctx, {width: innerW, height: innerH, cellPx: cellW, gridLeft, cols, seed: seeds.turf, params, field: {x: 0, y: 0, w: innerW, h: innerH}})
        // `turfKey` stands in for `turf` (a fresh object every render).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fieldShown, innerW, innerH, cellW, gridLeft, cols, turfKey, turfTick])

    const waitingFontSize = Math.max(16, box.h * 0.03)
    if (!stream) return <div className="spp-root"><span className="spp-waiting" style={{fontSize: waitingFontSize}}>No active stream</span></div>
    if (!stream.active_break_id) return <div className="spp-root"><span className="spp-waiting" style={{fontSize: waitingFontSize}}>No active break</span></div>

    const lineColor = 'rgba(255,255,255,0.8)'

    return (
        <div className="spp-root">
            <div className="spp-field" style={{width: box.w, height: box.h, top: 0}}>
                <div className="spp-inner" style={{left: geo.margin, top: geo.margin, width: innerW, height: innerH, borderRadius: fieldRadius}}>
                    <canvas ref={canvasRef} className="spp-turf" width={innerW} height={innerH} />

                    {/* Midfield line behind the ball, and one solid tick per interior column line. */}
                    <div className="spp-line" style={{left: Math.round(innerW / 2 - lineW / 2), top: borderInset, width: lineW, height: innerH - 2 * borderInset, backgroundColor: lineColor}} />
                    {Array.from({length: cols - 1}, (_, i) => {
                        const x = gridLeft + (i + 1) * cellW - Math.floor(tickW / 2)
                        return [
                            <div key={`tt-${i}`} className="spp-line" style={{left: x, top: borderInset, width: tickW, height: tickH, backgroundColor: lineColor}} />,
                            <div key={`tb-${i}`} className="spp-line" style={{left: x, top: innerH - borderInset - tickH, width: tickW, height: tickH, backgroundColor: lineColor}} />,
                        ]
                    })}

                    {cells.map(({event, tier, price, x, y, w, h, priceFontPx, shineDelayS}) => (
                        <PricedCell key={event.id} event={event} x={x} y={y} w={w} h={h} tier={tier} price={price} priceFontPx={priceFontPx} shine={shine} shineDelayS={shineDelayS} leaving={leaving.has(event.id)} nodeRef={nodeRefFor(event.id)} />
                    ))}

                    {ballRect && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="spp-ball" src={BALL_SRC} alt="" style={{left: ballRect.x, top: ballRect.y, width: ballRect.w, height: ballRect.h, visibility: ballVisible ? 'visible' : 'hidden'}} />
                    )}

                    <div className="spp-border" style={{left: borderInset, top: borderInset, width: innerW - 2 * borderInset, height: innerH - 2 * borderInset, border: `${borderW}px solid rgba(255,255,255,0.85)`, borderRadius: Math.max(0, fieldRadius - borderInset)}} />
                </div>
            </div>
        </div>
    )
}

export default SportPricedBoard
