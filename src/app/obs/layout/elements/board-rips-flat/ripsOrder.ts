// Where each team sits on board:rips_flat (README "Rips board marble tiles", "Order"). Pure maths,
// no React. Two settings from /obs/controls drive it:
//   - `cellOrder`:   'tier'     — tier 1 in the centre, then tier 2, tier 3 toward the edges (the
//                                 centre-out deal of board:cobra_flat, layout.ts §3.3); alphabetical
//                                 inside a tier.
//                    'alphabet' — alphabetical, read like text: left to right, row by row; the 32 NFL
//                                 teams (`IsTeam`) first, then custom spots (Miscellaneous included).
//   - `soldPlacement`: 'sides'  — sold cells take the outermost slots (the tail of the centre-out
//                                 deal, as cobra_flat does it) and the rest re-deal around them.
//                      'stay'   — every cell is dealt as if unsold, so a sale never moves anything.
// Prices play no part: the order depends only on the teams and their fixed tiers, so every page
// (OBS, the controls preview, a reload) deals the same board.

import {IsTeam} from '@/app/common/teams'
import {centreOutOrder, MAX_COLS, splitRows} from '../board-cobra-flat/layout'

export const RIPS_CELL_ORDERS = ['tier', 'alphabet'] as const
export type RipsCellOrder = typeof RIPS_CELL_ORDERS[number]
export const DEFAULT_RIPS_CELL_ORDER: RipsCellOrder = 'tier'

export const RIPS_SOLD_PLACEMENTS = ['sides', 'stay'] as const
export type RipsSoldPlacement = typeof RIPS_SOLD_PLACEMENTS[number]
export const DEFAULT_RIPS_SOLD_PLACEMENT: RipsSoldPlacement = 'sides'

// Team tiers, 1 = best. Every team not listed is tier 3. Keys are `event.team` (the logo names).
// Also picks the 'marble_auto' frame (RipsFlatCell.tsx).
export type RipsTier = 1 | 2 | 3
const TIER_OF: Record<string, RipsTier> = {
    'Chicago Bears': 1,
    'Kansas City Chiefs': 1,
    'Los Angeles Rams': 1,
    'San Francisco 49ers': 1,
    'Dallas Cowboys': 1,
    'Los Angeles Chargers': 1,
    'New England Patriots': 1,
    'Buffalo Bills': 1,
    'Cincinnati Bengals': 1,
    'Pittsburgh Steelers': 1,
    'Miscellaneous': 1,
    'Baltimore Ravens': 1,
    'New York Giants': 1,
    'Green Bay Packers': 2,
    'Minnesota Vikings': 2,
    'Detroit Lions': 2,
    'Denver Broncos': 2,
    'Washington Commanders': 2,
    'Philadelphia Eagles': 2,
    'Las Vegas Raiders': 2,
    'Atlanta Falcons': 2,
}
export const ripsTierOf = (team: string): RipsTier => TIER_OF[team] ?? 3

export type RipsCell = {eventId: number; team: string; sold: boolean}
export type RipsPlaced = {eventId: number; row: number; col: number}

function compare(order: RipsCellOrder) {
    return (a: RipsCell, b: RipsCell) => {
        if (order === 'tier') {
            const t = ripsTierOf(a.team) - ripsTierOf(b.team)
            if (t !== 0) return t
        } else {
            const aIsTeam = IsTeam(a.team)
            if (aIsTeam !== IsTeam(b.team)) return aIsTeam ? -1 : 1
        }
        const byName = a.team.localeCompare(b.team)
        return byName !== 0 ? byName : a.eventId - b.eventId
    }
}

// Slots in centre-out dealing order (layout.ts dealCells' sequence): every row's centre first, top
// to bottom, then every row's next step outward, and so on.
function centreOutSlots(rowSizes: number[]): {row: number; col: number}[] {
    const rowOrders = rowSizes.map(centreOutOrder)
    const steps = rowSizes.length > 0 ? Math.max(...rowSizes) : 0
    const slots: {row: number; col: number}[] = []
    for (let step = 0; step < steps; step++) {
        rowSizes.forEach((_, row) => {
            if (step < rowOrders[row].length) slots.push({row, col: rowOrders[row][step]})
        })
    }
    return slots
}

// The board's rows (fuller rows on top, splitRows), each left to right by column; `col` is within
// the row (the board centres a short row itself).
export function placeRipsCells(
    cells: readonly RipsCell[],
    order: RipsCellOrder,
    soldPlacement: RipsSoldPlacement,
    maxCols: number = MAX_COLS
): RipsPlaced[][] {
    const rowSizes = splitRows(cells.length, maxCols)
    const cmp = compare(order)
    const pushSold = soldPlacement === 'sides'
    const unsold = cells.filter((c) => !pushSold || !c.sold).sort(cmp)
    const sold = pushSold ? cells.filter((c) => c.sold).sort(cmp) : []

    const slots = centreOutSlots(rowSizes)
    // Sold cells take the last (outermost) slots of the centre-out deal in either order.
    const soldSlots = slots.slice(slots.length - sold.length)
    let unsoldSlots = slots.slice(0, slots.length - sold.length)
    // Alphabet: the remaining slots are filled like text instead of from the centre.
    if (order === 'alphabet') unsoldSlots = [...unsoldSlots].sort((a, b) => a.row - b.row || a.col - b.col)

    const grid: RipsPlaced[][] = rowSizes.map(() => [])
    const put = (c: RipsCell, s: {row: number; col: number}) => grid[s.row].push({eventId: c.eventId, row: s.row, col: s.col})
    unsold.forEach((c, i) => put(c, unsoldSlots[i]))
    sold.forEach((c, i) => put(c, soldSlots[i]))
    return grid.map((row) => row.sort((a, b) => a.col - b.col))
}
