'use client'

// The `board:sport_priced` registry component — board:sport_style's football field with a PRICE on
// every tile, for the priced sports stream (it replaces `board:cobra` there; neither cobra nor
// sport_style is changed). Wide tiles (logo + price) on the same turf painter (turfTexture.ts), the
// football in the centre of the middle row, and value fanning out from it (pricedLayout.ts).
//
// Tiers come from the same `assignTiers` call (and the same channel-wide thresholds and series
// default price) as board:cobra/cobra_flat/sport_style, so a team lands on the same tier everywhere.
// God/Giant/Chaser wear gold/silver/copper (priceMaterials.ts) with their price left rounded up to
// $25 — cobra's own display price; Side Cards are one plain chalk for every team and show the series
// default price shortened to its floor ("$50-$149" → "$50+").
//
// Geometry: the operator sets the box WIDTH, `cols`, `ballCols` and `cellAspect` (tile width ÷
// height); the cell size, row count and field height are derived, the field is vertically centred
// in the box and the settings panel's Fit height sizes the box to it — same model as sport_style.
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

import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
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
import {pricedTierLayout} from '@/app/obs/sport_style/pricedTierLayout'
import {pricedGrid, pricedOrder, shortRange} from '@/app/obs/sport_style/pricedLayout'
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
export const DEFAULT_BALL_COLS = 3
export const DEFAULT_CELL_ASPECT = 2

const BALL_SRC = '/images/sport_style/ball.png'
// Fraction of ball.png's width the ball itself covers (opaque bounds 92..1684 of 1774) — same
// constant as SportStyleBoard.tsx; the file is 2:1.
const BALL_ART_FILL = 1592 / 1774
const FALLBACK_BACKGROUND: RGB = [40, 40, 40]
// Conservative Barlow Condensed 600 advance, with room for the widest digits and the + suffix.
const PRICE_EM_PER_CHAR = 0.48

// hit-sequence-plan.md §2.3: the sold gate's safety net — a gated cell that was seen sold but never
// got a `reveal-sold` cue (sequence aborted, hitSequence missing from the stage, queue overflow in
// another tab) turns sold on its own after this long, so a mis-set-up gate can never freeze a cell.
const GATE_TIMEOUT_MS = 90_000

// One turf seed per page load, re-rolled by the panel's Regenerate turf (the same
// `sport-style-regenerate` cue sport_style listens to).
const seeds = {turf: Math.floor(Math.random() * 2 ** 31)}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Field height for `n` teams in a `boxW`-wide box — the board's own geometry, exported so the
 *  settings panel's Fit height uses the same numbers. */
export function pricedFieldSize(boxW: number, n: number, cols: number, ballCols: number, aspect: number, margin: number, tierCounts?: {best: number; good: number}) {
    const innerW = Math.max(1, boxW - 2 * margin)
    const edgeGap = Math.max(8, Math.round(innerW * 0.016))
    const cellW = Math.max(1, Math.floor((innerW - 2 * edgeGap) / cols))
    const cellH = Math.max(1, Math.floor(cellW / aspect))
    let rows = pricedGrid(n, cols, ballCols, aspect).rows
    let innerH = rows > 0 ? rows * cellH + 2 * edgeGap : 0
    if (tierCounts && n > 0) {
        const best = Math.max(0, Math.min(n, Math.round(tierCounts.best)))
        const good = Math.max(0, Math.min(n - best, Math.round(tierCounts.good)))
        const tiers: Tier[] = Array.from({length: n}, (_, i) => i < best ? 'best' : i < best + good ? 'good' : 'regular')
        const pad = Math.max(2, Math.round(cellH * 0.06))
        const layout = pricedTierLayout(tiers, cols * cellW - 2 * pad, Math.max(1, cellW - 2 * pad), Math.max(1, cellH - 2 * pad), 2 * pad, ballCols * cellW)
        rows = layout.rows
        innerH = layout.height + 2 * edgeGap + 2 * pad
    }
    return {innerW, innerH, edgeGap, cellW, cellH, rows, fieldH: rows > 0 ? innerH + 2 * margin : 0}
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
    sold: boolean
}

// Gold's breathing halo, on top of the tile's own static glow.
const GOLD_HALO = '0 0 20px 7px rgba(255,198,24,0.9), 0 0 34px 11px rgba(255,147,0,0.5)'

/** One tile, in its own component so `useTeamPalette` (a hook) runs once per event. */
function PricedCell({event, x, y, w, h, tier, price, priceFontPx, shine, shineDelayS, sold}: CellProps) {
    const withLogo = hasLogo(event.team)
    const palette = useTeamPalette(event.team)
    const background = palette
        ? (DEFAULT_PATCH.mixEnabled ? mix(palette.background, palette.secondary, DEFAULT_PATCH.mixRatio) : palette.background)
        : FALLBACK_BACKGROUND
    return (
        <div className="spp-cell" style={{left: x, top: y, width: w, height: h}}>
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
    const ballCols = Math.max(0, Math.min(cols - 1, Math.round(boardElement?.ballCols ?? DEFAULT_BALL_COLS)))
    const rawAspect = boardElement?.cellAspect
    const aspect = typeof rawAspect === 'number' && Number.isFinite(rawAspect) && rawAspect > 0 ? rawAspect : DEFAULT_CELL_ASPECT
    const margin = Math.max(0, boardElement?.margin ?? 0)
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

    const {innerW, innerH: uniformInnerH, edgeGap, cellW, cellH, rows: uniformRows, fieldH: uniformFieldH} = pricedFieldSize(box.w, events.length, cols, ballCols, aspect, margin)
    const grid = useMemo(() => pricedGrid(events.length, cols, ballCols, aspect), [events.length, cols, ballCols, aspect])
    const gridLeft = Math.floor((innerW - cols * cellW) / 2)
    const gridTop = edgeGap
    const pad = Math.max(2, Math.round(cellH * 0.06))
    const tileW = Math.max(1, cellW - 2 * pad)
    const tileH = Math.max(1, cellH - 2 * pad)

    // Deal the value-ordered cells into the ball-ranked seats.
    const placed = useMemo(() => {
        const eventById = new Map(events.map((e) => [e.id, e]))
        const flat: FlatCell[] = events.map((e) => ({
            eventId: e.id,
            team: e.team,
            tier: cellByTeam.get(e.team)?.tier ?? 'regular',
            sold: isShownSold(e),
            priceLeft: priceLeftByTeam.get(e.team) ?? 0,
        }))
        return pricedOrder(flat).map((c, rank) => ({event: eventById.get(c.eventId)!, tier: c.sold ? 'regular' as Tier : c.tier, seat: grid.seats[rank]}))
            .filter((p) => p.seat !== undefined)
        // `isShownSold` is rebuilt every render; its inputs are the deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, cellByTeam, priceLeftByTeam, grid, gated, revealed])

    const tiered = useMemo(() => boardElement?.tierSizing
        ? pricedTierLayout(placed.map(p => p.tier), cols * cellW - 2 * pad, tileW, tileH, 2 * pad, ballCols * cellW)
        : undefined, [boardElement?.tierSizing, placed, cols, cellW, pad, tileW, tileH, ballCols])
    const innerH = tiered ? tiered.height + 2 * edgeGap + 2 * pad : uniformInnerH
    const fieldH = tiered ? (events.length ? innerH + 2 * margin : 0) : uniformFieldH
    const rows = tiered?.rows ?? uniformRows

    const priceOf = (e: Event) => cellByTeam.get(e.team)?.price ?? shortRange(defaultPrice)
    // Fit to the longest price; tier sizing increases the font with each larger plate.
    const priceUnits = (price: string) => price.length - (price.startsWith('$') ? 0.4 : 0)
    const maxLen = placed.reduce((m, p) => (!isShownSold(p.event) ? Math.max(m, priceUnits(priceOf(p.event))) : m), 3.6)
    const priceFontPx = Math.max(8, Math.floor(Math.min(tileH * 0.92, tileMetrics(tileW, tileH).priceRoom / (maxLen * PRICE_EM_PER_CHAR))))

    // Shine stagger: `placed` runs from the ball outward, so the n-th tile of a tier is the n-th
    // closest. Both tiers start mid-cycle, spread evenly, so they never flash in unison.
    const tierCount = {best: 0, good: 0, mid: 0, regular: 0} as Record<Tier, number>
    for (const p of placed) tierCount[p.tier]++
    const tierSeen = {best: 0, good: 0, mid: 0, regular: 0} as Record<Tier, number>
    const cells = placed.map((p, i) => {
        const n = tierSeen[p.tier]++
        const cycle = TIER_MATERIALS[p.tier].shine?.cycleS ?? 0
        const shineDelayS = cycle > 0 ? -((n + 0.5) * cycle) / Math.max(1, tierCount[p.tier]) : 0
        const rect = tiered?.boxes[i] ?? {x: p.seat.col * cellW, y: p.seat.row * cellH, w: tileW, h: tileH}
        const font = Math.max(8, Math.floor(Math.min(rect.h * 0.92, tileMetrics(rect.w, rect.h).priceRoom / (maxLen * PRICE_EM_PER_CHAR))))
        return {...p, shineDelayS: Math.round(shineDelayS * 100) / 100,
            x: gridLeft + rect.x + pad, y: gridTop + rect.y + pad, w: rect.w, h: rect.h, priceFontPx: tiered ? font : priceFontPx}
    })

    const ballSpan = tiered ? (tiered.ball ? {...tiered.ball, x: gridLeft + pad + tiered.ball.x, y: gridTop + pad + tiered.ball.y} : undefined) : grid.ballCols > 0
        ? {x: gridLeft + grid.ballStart * cellW, y: gridTop + grid.ballRow * cellH, w: grid.ballCols * cellW, h: cellH}
        : undefined
    const ballW = ballSpan ? Math.round(Math.min(ballSpan.w * 0.5, cellH * 1.6) / BALL_ART_FILL) : 0
    const ballRect = ballSpan
        ? {x: Math.round(ballSpan.x + (ballSpan.w - ballW) / 2), y: Math.round(ballSpan.y + (ballSpan.h - ballW / 2) / 2), w: ballW, h: Math.round(ballW / 2)}
        : undefined

    const fieldRadius = Math.round(cellH * 0.25)
    const borderW = Math.max(2, Math.round(cellH * 0.05))
    const lineW = Math.max(2, Math.round(cellH * 0.05))
    const tickW = Math.max(3, Math.round(cellH * 0.065))
    const tickH = Math.max(4, Math.round(edgeGap * 0.6))
    const borderInset = Math.max(2, Math.round(edgeGap * 0.3))

    const fieldOffsetY = Math.floor((box.h - fieldH) / 2)
    const originX = box.x + margin
    const originY = box.y + fieldOffsetY + margin
    const anchors = useMemo(() => {
        if (rows === 0) return {}
        const out: Record<string, Shape> = {
            field: {x: originX, y: originY, w: innerW, h: innerH, rx: fieldRadius, ry: fieldRadius},
            grid: {x: originX + gridLeft, y: originY + gridTop, w: cols * cellW, h: innerH - 2 * edgeGap, rx: 0, ry: 0},
        }
        // Square so `match: 'size'` hands off the video ball at the same size as on sport_style;
        // the art itself is `ballW × ballW/2`.
        if (ballRect) out.ball = {x: originX + ballRect.x, y: originY + ballRect.y + ballRect.h / 2 - ballRect.w / 2, w: ballRect.w, h: ballRect.w, rx: ballRect.w / 2, ry: ballRect.w / 2}
        for (const c of cells) out[`cell:${c.event.id}`] = {x: originX + c.x, y: originY + c.y, w: c.w, h: c.h, rx: 0, ry: 0}
        return out
        // `cells`/`ballRect` are rebuilt every render; their inputs are the deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, originX, originY, innerW, innerH, fieldRadius, gridLeft, gridTop, cols, cellW, cellH, placed, tileW, tileH, ballW, tiered])
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
        setRevealed(new Set(current.filter((e) => e.customer !== '').map((e) => e.id)))
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
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx || rows === 0) return
        ctx.clearRect(0, 0, innerW, innerH)
        if (!turf.enabled) return
        // Recipe-level keys the painter doesn't take (field shape/line knobs of sport_style's geometry).
        const {enabled: _e, edgeGap: _g, ticksAreaHeight: _t, turfMargin: _m, tickHFactor: _th, seamTickHFactor: _sh, seamTicks: _s, cornerWidth: _cw, cornerRoundness: _cr, borderWidth: _bw, ...params} = turf
        renderTurf(ctx, {width: innerW, height: innerH, cellPx: cellW, gridLeft, cols, seed: seeds.turf, params, field: {x: 0, y: 0, w: innerW, h: innerH}})
        // `turfKey` stands in for `turf` (a fresh object every render).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [innerW, innerH, cellW, gridLeft, cols, rows, turfKey, turfTick])

    const waitingFontSize = Math.max(16, box.h * 0.03)
    if (!stream) return <div className="spp-root"><span className="spp-waiting" style={{fontSize: waitingFontSize}}>No active stream</span></div>
    if (!stream.active_break_id) return <div className="spp-root"><span className="spp-waiting" style={{fontSize: waitingFontSize}}>No active break</span></div>
    if (rows === 0) return <div className="spp-root" />

    const lineColor = 'rgba(255,255,255,0.8)'
    const yardFont = Math.round(cellH * 0.62)

    return (
        <div className="spp-root">
            <div className="spp-field" style={{width: box.w, height: fieldH, top: fieldOffsetY}}>
                <div className="spp-inner" style={{left: margin, top: margin, width: innerW, height: innerH, borderRadius: fieldRadius}}>
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

                    {/* Painted midfield numbers either side of the ball. */}
                    {ballSpan && grid.ballCols >= 3 && [grid.ballStart, grid.ballStart + grid.ballCols - 1].map((c) => (
                        <div key={`yd-${c}`} className="spp-yard" style={{left: c === grid.ballStart ? ballSpan.x : ballSpan.x + ballSpan.w - cellW, top: ballSpan.y, width: cellW, height: cellH, fontSize: yardFont}}>50</div>
                    ))}

                    {cells.map(({event, tier, x, y, w, h, priceFontPx, shineDelayS}) => (
                        <PricedCell key={event.id} event={event} x={x} y={y} w={w} h={h} tier={tier} price={priceOf(event)} priceFontPx={priceFontPx} shine={shine} shineDelayS={shineDelayS} sold={isShownSold(event)} />
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
