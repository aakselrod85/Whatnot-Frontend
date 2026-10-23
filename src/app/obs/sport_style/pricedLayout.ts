// Pure layout maths for `board:sport_priced`: a `cols`-wide grid with the football in the middle
// row, `ballCols` cells wide, and value fanning out from it — the most valuable unsold team takes
// the seat nearest the ball, sold imprints and custom spots end up on the edges and corners.
//
// Unlike board:sport_style's `gridSlots`/`layoutCentred` (centreLayout.ts), whose ball slot is a
// TOP-centre block, the ball here sits in the board's CENTRE ROW so value can surround it on all
// sides. Rows are `ceil((n + ballCols) / cols)`; any seats left over (n doesn't fill the grid) are
// the furthest-ranked ones, so the empties land in the corners, symmetric as far as the count
// allows. A sale re-deals the board (same accepted consequence as sport_style's 'centered' mode).

import {sortCells, type FlatCell} from '../layout/elements/board-cobra-flat/layout'
import {hasLogo} from './teamPalette'

export type PricedSeat = {row: number; col: number}
export type PricedGrid = {rows: number; ballRow: number; ballStart: number; ballCols: number; seats: PricedSeat[]}

/** Grid shape for `n` teams. `seats` are every non-ball cell, ranked nearest-to-the-ball first
 *  (2-D distance in CELL units scaled by `aspect`, so a wide tile's horizontal neighbour isn't
 *  ranked as close as its vertical one), ties broken by row then column for determinism. */
export function pricedGrid(n: number, cols: number, ballCols: number, aspect: number): PricedGrid {
    const bc = Math.max(0, Math.min(cols - 1, Math.round(ballCols)))
    const rows = n > 0 ? Math.max(1, Math.ceil((n + bc) / cols)) : 0
    const ballRow = Math.floor((rows - 1) / 2)
    const ballStart = Math.floor((cols - bc) / 2)
    const cx = (cols - 1) / 2
    const seats: (PricedSeat & {d2: number})[] = []
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (bc > 0 && row === ballRow && col >= ballStart && col < ballStart + bc) continue
            const dx = (col - cx) * aspect
            const dy = row - ballRow
            seats.push({row, col, d2: dx * dx + dy * dy})
        }
    }
    seats.sort((a, b) => a.d2 - b.d2 || a.row - b.row || a.col - b.col)
    return {rows, ballRow, ballStart, ballCols: bc, seats: seats.map(({row, col}) => ({row, col}))}
}

/** `cells` in dealing order: `sortCells`' value order (cobra_flat's, shared with sport_style), then
 *  stably grouped unsold teams, unsold custom spots, sold teams, sold custom spots — the same
 *  grouping as centreLayout.ts's `layoutCentred`, so unsold always outranks sold. */
export function pricedOrder(cells: readonly FlatCell[]): FlatCell[] {
    const bySortOrder = sortCells(cells)
    const group = (c: FlatCell) => (c.sold ? 2 : 0) + (hasLogo(c.team) ? 0 : 1)
    return [0, 1, 2, 3].flatMap((g) => bySortOrder.filter((c) => group(c) === g))
}

/** Side Card price text: the series' default price shortened to its floor — "$50-$149" → "$50+"
 *  (a full range doesn't fit a tile at a readable size). Anything without a leading dollar amount
 *  is returned unchanged. */
export function shortRange(price: string): string {
    const m = /^\s*(\$\s?\d[\d,]*)\s*[-–—]/.exec(price)
    return m ? `${m[1].replace(/\s/g, '')}+` : price.trim()
}
