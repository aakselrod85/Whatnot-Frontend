// Fill solver for `board:sport_priced` (priced-board-fill-plan.md §1, §8): only the unsold teams are
// dealt, and the tiles are re-solved to the largest size that fills the element box. Pure, no React.
//
// Dealing follows board:cobra: top to bottom, left to right in value order, row sizes from cobra's
// `rowSizes` with the top rows carrying fewer tiles (so the best teams get the widest tiles). Rows
// are centred and the block is centred vertically by the board. The football is ONE tile-sized seat in
// the middle of the BOTTOM row. Every row is stretched to the full width.
import type {Tier} from '../layout/elements/board-cobra/pricing'
import {PRICED_TIER_SCALE, type PricedRect} from './pricedTierLayout'

// Seats the first rows give up (same scheme as board:cobra's ROW_DEFICITS).
const ROW_DEFICITS: readonly number[] = [2, 1]

export type FillOpts = {
    width: number          // inner field width minus 2*edgeGap (the row width)
    height: number         // inner field height minus 2*edgeGap (the block may not exceed it)
    aspect: number         // tile width ÷ height
    gap: number            // between tiles and rows
    capW: number           // max base tile width (innerW / 3)
    ball: boolean          // reserve one base-size seat in the bottom row for the football
    tierScale: boolean     // apply PRICED_TIER_SCALE per tier, else every tile is base size
}
export type FillLayout = {
    tileW: number; tileH: number
    boxes: PricedRect[]    // one per input tier, same index; relative to the block's top-left
    ball?: PricedRect      // the ball's seat (base tile size)
    rows: number
    height: number         // block height (≤ opts.height unless nothing fits)
    width: number
}

const MIN_TILE_W = 8

function rowSizes(total: number, rowCount: number): number[] {
    const deficits = Array.from({length: rowCount}, (_, i) => ROW_DEFICITS[i] ?? 0)
    const deficitSum = deficits.reduce((a, c) => a + c, 0)
    const base = Math.floor((total + deficitSum) / rowCount)
    const sizes = deficits.map((d) => Math.max(0, base - d))
    let left = total - sizes.reduce((a, c) => a + c, 0)
    for (let i = rowCount - 1; left > 0; i = i === 0 ? rowCount - 1 : i - 1) {
        sizes[i]++
        left--
    }
    // Tiny totals: the `max(0, …)` clamp can overshoot; take the surplus back from the TOP rows so
    // the bottom stays the fullest. (cobra never hits this — its N is never this small.)
    for (let i = 0; left < 0 && i < rowCount; ) {
        if (sizes[i] > 0) { sizes[i]--; left++ } else i++
    }
    return sizes
}

function build(tiers: readonly Tier[], o: FillOpts, tileW: number, strict: boolean): FillLayout | null {
    const n = tiers.length
    const {width, gap} = o
    const tileH = Math.max(1, Math.round(tileW / o.aspect))
    // Row capacity. The ball row must be ODD (ball centred) and, like every row, at least as full
    // as the row above it — so with an even natural capacity every row holds one tile fewer (rows
    // stretch to the full width anyway, so nothing is left empty).
    const natural = Math.floor((width + gap) / (tileW + gap))
    const perRow = o.ball && natural % 2 === 0 ? natural - 1 : natural
    if (perRow < 1) return null
    const N = n + (o.ball ? 1 : 0)
    let R = N > 0 ? 1 : 0
    const ded = (r: number) => ROW_DEFICITS.slice(0, r).reduce((a, c) => a + c, 0)
    while (R > 0 && R * perRow - ded(R) < N) R++
    // Like cobra's buildRows, an empty row is dropped (tiny N with deficits).
    const sizes = (R > 0 ? rowSizes(N, R) : []).filter((c) => c > 0)
    if (sizes.some((c) => c > perRow)) return null
    // The ball must be centred: its row needs an ODD seat count (equal tiles each side). An even
    // bottom row takes one team from the row above (so it stays the fullest row); the rows above
    // are then re-sorted ascending so "lower row ≥ the one above" still holds. With a single row
    // the one team moves up instead (ball alone below it).
    if (o.ball && sizes.length > 0 && sizes[sizes.length - 1] % 2 === 0) {
        if (sizes.length >= 2) {
            sizes[sizes.length - 1]++
            sizes[sizes.length - 2]--
            const above = sizes.slice(0, -1).filter((c) => c > 0).sort((a, c) => a - c)
            sizes.splice(0, sizes.length - 1, ...above)
        } else {
            sizes[0]--
            sizes.unshift(1)
        }
    }
    R = sizes.length
    if (sizes.reduce((a, c) => a + c, 0) !== N) return null

    // Seats per row, top to bottom, left to right; the ball takes index floor(count/2) of the
    // bottom row (the fullest one, so the best teams keep the top row to themselves).
    const ballRow = R - 1
    const ballIdx = o.ball ? Math.floor(sizes[ballRow] / 2) : -1
    const rowTiers: (number | 'ball')[][] = []
    let next = 0
    sizes.forEach((count, r) => {
        const row: (number | 'ball')[] = []
        for (let k = 0; k < count; k++) row.push(r === ballRow && k === ballIdx ? 'ball' : next++)
        rowTiers.push(row)
    })

    const boxes: PricedRect[] = new Array(n)
    let ball: PricedRect | undefined
    const rowH: number[] = []
    // The ball row ignores tier scale so the two sides of the ball stay mirror images.
    const rowW: {w: number; h: number}[][] = rowTiers.map((row, r) => row.map((id) => {
        if (id === 'ball' || !o.tierScale || r === ballRow) return {w: tileW, h: tileH}
        const sc = PRICED_TIER_SCALE[tiers[id]]
        return {w: Math.max(1, Math.round(tileW * sc)), h: Math.max(1, Math.round(tileH * sc))}
    }))
    let fits = true
    rowTiers.forEach((row, r) => {
        rowH.push(Math.max(1, ...rowW[r].map((z) => z.h)))
        const total = rowW[r].reduce((a, c) => a + c.w, 0) + (row.length - 1) * gap
        if (total > width) fits = false
    })
    if (!fits) return null
    // Stretch: every row fills the full width (cobra-style), so a short row's tiles are WIDER than
    // the base tile. Heights stay, so only the aspect changes. Widths scale in proportion to their
    // natural size (tier scale kept), with the rounding remainder handed to the last tile.
    rowTiers.forEach((row, r) => {
        if (row.length === 0) return
        const avail = width - (row.length - 1) * gap
        const natural = rowW[r].reduce((a, c) => a + c.w, 0)
        rowW[r].forEach((z) => { z.w = Math.max(1, Math.floor((z.w * avail) / natural)) })
        // Rounding remainder: one px to the middle tile first, then to mirrored pairs outward, so a
        // symmetric row (the ball row) keeps its centre exactly on the midline.
        let rem = avail - rowW[r].reduce((a, c) => a + c.w, 0)
        const mid = (row.length - 1) / 2
        const recipients: number[] = []
        if (row.length % 2 === 1) recipients.push(mid)
        for (let d = row.length % 2 === 1 ? 1 : 0.5; recipients.length < row.length; d++) recipients.push(mid - d, mid + d)
        for (let i = 0; rem > 0; i++) {
            const k = recipients[i % recipients.length]
            rowW[r][k].w++
            rem--
        }
    })
    let y = 0
    rowTiers.forEach((row, r) => {
        const total = rowW[r].reduce((a, c) => a + c.w, 0) + (row.length - 1) * gap
        let x = Math.floor((width - total) / 2)
        row.forEach((id, k) => {
            const z = rowW[r][k]
            const rect = {x, y: y + Math.floor((rowH[r] - z.h) / 2), w: z.w, h: z.h}
            if (id === 'ball') ball = rect
            else boxes[id] = rect
            x += z.w + gap
        })
        y += rowH[r] + gap
    })
    const height = R > 0 ? y - gap : 0
    if (strict && height > o.height) return null
    return {tileW, tileH, boxes, ball, rows: R, height, width}
}

export function pricedFillLayout(tiers: readonly Tier[], opts: FillOpts): FillLayout {
    const hi = Math.max(1, Math.min(opts.capW, opts.width))
    if (tiers.length === 0) return build(tiers, opts, hi, false) ?? {tileW: hi, tileH: Math.max(1, Math.round(hi / opts.aspect)), boxes: [], rows: 0, height: 0, width: opts.width}
    const lo0 = Math.min(MIN_TILE_W, hi)
    let best: FillLayout | null = null
    let lo = lo0
    let up = hi
    while (lo <= up) {
        const mid = (lo + up) >> 1
        const l = build(tiers, opts, mid, true)
        if (l) { best = l; lo = mid + 1 } else up = mid - 1
    }
    if (best) {
        // Guard against non-monotone rounding.
        for (let t = best.tileW + 1; t <= Math.min(hi, best.tileW + 4); t++) {
            const l = build(tiers, opts, t, true)
            if (l) best = l
        }
        return best
    }
    // Nothing fits at all: best effort at the minimum size.
    return build(tiers, opts, lo0, false) ?? {tileW: lo0, tileH: Math.max(1, Math.round(lo0 / opts.aspect)), boxes: [], rows: 0, height: 0, width: opts.width}
}

export type FillSettings = {
    cols?: number; cellAspect?: number; margin?: number; tierSizing?: boolean
}

/** The board's own geometry from the element settings (shared by the board, the settings panel and
 *  the setup page so they agree). The ball is always one seat of the bottom row. */
export function fillGeometry(boxW: number, boxH: number, s: FillSettings, defaults: {cols: number; aspect: number}) {
    const cols = Math.max(2, Math.round(s.cols ?? defaults.cols))
    const rawAspect = s.cellAspect
    const aspect = typeof rawAspect === 'number' && Number.isFinite(rawAspect) && rawAspect > 0 ? rawAspect : defaults.aspect
    const margin = Math.max(0, s.margin ?? 0)
    const innerW = Math.max(1, boxW - 2 * margin)
    const innerH = Math.max(1, boxH - 2 * margin)
    const edgeGap = Math.max(8, Math.round(innerW * 0.016))
    const refCellW = Math.max(1, Math.floor((innerW - 2 * edgeGap) / cols))
    const refCellH = Math.max(1, Math.floor(refCellW / aspect))
    const pad = Math.max(2, Math.round(refCellH * 0.06))
    const opts: FillOpts = {
        width: Math.max(1, innerW - 2 * edgeGap),
        height: Math.max(1, innerH - 2 * edgeGap),
        aspect,
        gap: 2 * pad,
        capW: Math.max(1, Math.floor(innerW / 3)),
        ball: true,
        tierScale: !!s.tierSizing,
    }
    return {cols, aspect, margin, innerW, innerH, edgeGap, refCellW, refCellH, pad, opts}
}

/** Settings-panel / setup-page readout: tile size and row count for `n` slots. */
export function fillSummary(n: number, boxW: number, boxH: number, s: FillSettings, defaults: {cols: number; aspect: number}, tierCounts?: {best: number; good: number}) {
    const g = fillGeometry(boxW, boxH, s, defaults)
    const best = tierCounts ? Math.max(0, Math.min(n, Math.round(tierCounts.best))) : 0
    const good = tierCounts ? Math.max(0, Math.min(n - best, Math.round(tierCounts.good))) : 0
    const tiers: Tier[] = Array.from({length: n}, (_, i) => i < best ? 'best' : i < best + good ? 'good' : 'regular')
    const l = pricedFillLayout(tiers, g.opts)
    return {tileW: l.tileW, tileH: l.tileH, rows: l.rows}
}
