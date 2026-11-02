// Dealing order and price text for `board:sport_priced`; the layout itself is pricedFillLayout.ts.
// `pricedOrder` is the value order the solver ranks into ball-nearest seats.

import {sortCells, type FlatCell} from '../layout/elements/board-cobra-flat/layout'
import {hasLogo} from './teamPalette'

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
