// Variable-sized rows for the priced board. Normal tiles retain their original dimensions;
// larger tiers wrap instead of overlapping or shrinking the rest of the board.
import type {Tier} from '../layout/elements/board-cobra/pricing'

export const PRICED_TIER_SCALE: Record<Tier, number> = {best: 1.2, good: 1.1, mid: 1, regular: 1}
export type PricedRect = {x: number; y: number; w: number; h: number}

export function pricedTierLayout(tiers: readonly Tier[], width: number, tileW: number, tileH: number, gap: number, ballWidth: number) {
    width = Math.max(1, Math.floor(width))
    const sizes = tiers.map(tier => {
        const scale = Math.min(PRICED_TIER_SCALE[tier], width / tileW)
        return {w: Math.max(1, Math.round(tileW * scale)), h: Math.max(1, Math.round(tileH * scale))}
    })
    const boxes: PricedRect[] = []
    const remaining = tiers.map((_, i) => i)
    const flank: number[][] = [[], []]
    const bw = Math.min(width, Math.max(0, ballWidth))
    const sideWidth = Math.max(0, Math.floor((width - bw) / 2) - gap)
    // Keep the outermost, least valuable cells beside the ball. The highest tiers fill the
    // full rows immediately above and below it, where their larger prices have room to breathe.
    if (bw > 0) {
        for (let side = 0; side < 2; side++) {
            let used = 0
            while (remaining.length) {
                const i = remaining[remaining.length - 1]
                const next = used + (flank[side].length ? gap : 0) + sizes[i].w
                if (next > sideWidth) break
                flank[side].push(remaining.pop()!)
                used = next
            }
        }
    }
    const rows: number[][] = []
    while (remaining.length) {
        const row: number[] = []
        let used = 0
        while (remaining.length) {
            const i = remaining[0]
            const next = used + (row.length ? gap : 0) + sizes[i].w
            if (row.length && next > width) break
            row.push(remaining.shift()!)
            used = next
        }
        rows.push(row)
    }
    // First row nearest the centre; subsequent rows alternate above/below it.
    const above = rows.filter((_, i) => i % 2 === 0).reverse()
    const below = rows.filter((_, i) => i % 2 === 1)
    let y = 0
    const placeRow = (ids: number[], left: number, available: number, rowHeight?: number) => {
        const h = rowHeight ?? Math.max(tileH, ...ids.map(i => sizes[i].h))
        const order: number[] = []
        ids.forEach((id, i) => i % 2 ? order.push(id) : order.unshift(id))
        const total = order.reduce((sum, i) => sum + sizes[i].w, 0) + Math.max(0, order.length - 1) * gap
        let x = left + Math.floor((available - total) / 2)
        for (const i of order) {
            boxes[i] = {x, y: y + Math.floor((h - sizes[i].h) / 2), ...sizes[i]}
            x += sizes[i].w + gap
        }
        return h
    }
    for (const row of above) y += placeRow(row, 0, width) + gap
    let ball: PricedRect | undefined
    if (bw > 0 && tiers.length) {
        const h = Math.max(tileH, ...flank.flat().map(i => sizes[i].h))
        ball = {x: Math.floor((width - bw) / 2), y, w: bw, h}
        placeRow(flank[0], 0, sideWidth, h)
        placeRow(flank[1], width - sideWidth, sideWidth, h)
        y += h + gap
    }
    for (const row of below) y += placeRow(row, 0, width) + gap
    return {boxes, ball, height: Math.max(0, y - gap), rows: rows.length + (ball ? 1 : 0)}
}
