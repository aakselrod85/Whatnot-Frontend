// Geometry for the 'flip_art' back's SHAPES (FlipArtOverlay.tsx draws them). Plain maths, no React,
// so a static test page can run the very same code.
//
// A shape is a connected group of settled sold cells — cells that share a SIDE (touching only at a
// corner = two shapes). It can be any outline: an L, a T, a ring with an unsold cell inside (a
// "hole"). Everything is worked out cell by cell from which of its four neighbours are in the
// shape, so outlines and holes need no special tracing:
//   - a side with no neighbour is on the outline and gets a straight gold band;
//   - a cell corner whose two sides are both on the outline is an outer (convex) corner;
//   - a grid point with exactly three of its four surrounding cells in the shape is an inner
//     (concave) corner — the fourth, empty cell is the one the inner-corner sprite hangs over.
//     The four corners of a hole are such points, so a hole is framed from the inside for free.
//
// All numbers below are in ART px (the frame PNGs' own pixels); `framePx / FRAME_SLICE` turns them
// into screen px, exactly like the old CSS 9-slice (34 art px = `--art-frame-px` on screen).

export type GridCell = {row: number; col: number}

// FlipArtCell.png — 412x374. The four outer corners are its 34x34 corners (the old 9-slice's slice,
// RipsFlatCell.css `.rfb-art-frame`), the straight bands are its edges between them, stretched
// along the run. Only the outer 16 px of an edge are used for a band: the gold is 11 px wide with
// ~2 px of transparent margin outside it (3 on the right), so 16 covers it with room to spare.
export const FRAME_SRC = '/images/rips_tiles/FlipArtCell.png'
export const FRAME_W = 412
export const FRAME_H = 374
export const FRAME_SLICE = 34
export const BAND_DEPTH = 16

// FlipArtFrameInnerCorner.png — 60x60, the inner corner whose EMPTY cell is up-left of the grid
// point. Measured (alpha >= 50%, 2026-10-23): its vertical band spans x 47.5..58.7 and its
// horizontal band y 47.7..59.0 — the same profile and offset as FlipArtCell's left / top band
// measured from a cell edge (1.4..12.7 / 1.6..13.0) when the grid point sits at (46, 46) in the
// sprite. So the sprite is drawn with its pixel (46, 46) on the grid point; it reaches 14 px into
// the shape and 46 px back over the empty cell's corner. Its bands fade in from the far ends
// (alpha 0 at the sprite edge, solid ~24 px in) — a deliberate soft blend, drawn whole over the
// straight band: the straight band runs on under the fade and stops `INNER_BAND_STOP` px short of
// the grid point, where the sprite is solid and has not yet started to bend.
// The sprite's two bands are lit like the frame's LEFT and TOP bands, so the other three corners
// are MIRRORS of it (not rotations) — mirrored left-right its vertical band matches the frame's
// right band, mirrored top-bottom its horizontal band sits where the bottom band does (the bottom
// band's highlight is on its inner side, the sprite's on its outer one; the fade softens that).
// FlipArtCell's right band is 1.6 px further in from the cell edge than its left one, the bottom
// band ~0.3 px further than the top one, so a mirrored sprite is nudged by that much into the shape.
export const INNER_SRC = '/images/rips_tiles/FlipArtFrameInnerCorner.png'
export const INNER_SIZE = 60
export const INNER_ORIGIN = 46
export const INNER_BAND_STOP = 20
const INNER_SHIFT_RIGHT = 1.6
const INNER_SHIFT_BOTTOM = 0.3

// The painting's mask, tucked ~2 px under the gold everywhere (same numbers as the old octagon,
// RipsFlatCell.css `.rfb-art`): 4 px in from an outline side; at an outer corner cut along
// x + y = 30 from the corner. At an inner corner it goes OUT over the empty cell along the sprite's
// diagonal: the gold diagonal's shape-side edge runs along x + y = 86.5 in the sprite (= -5.5 from
// the grid point), so the mask's diagonal is x + y = -9 from the grid point (2.5 px under the gold).
const MASK_INSET = 4
const MASK_CORNER_CUT = 30
const MASK_INNER_DIAG = -9

// Screen px the mask pieces of neighbouring cells overlap by, and a straight band runs under an
// outer corner piece — so no hairline can open where two pieces meet.
const OVERLAP = 0.5

export type Side = 'top' | 'right' | 'bottom' | 'left'
export type Corner = 'tl' | 'tr' | 'br' | 'bl'

// Everything in screen px relative to the grid's top-left (cell (0,0)'s corner).
export type StraightPiece = {side: Side; x: number; y: number; w: number; h: number}
export type CornerPiece = {corner: Corner; x: number; y: number; size: number}
// An inner corner: the grid point, the mirror (sx -1 = the empty cell is on the right, sy -1 = it
// is below) and the sprite's nudge (art px, in the sprite's own unmirrored axes).
export type InnerPiece = {x: number; y: number; sx: 1 | -1; sy: 1 | -1; dx: number; dy: number}

export type FlipArtShape = {
    key: string
    cells: number
    // SVG path of the painting's mask: one clockwise loop per cell plus one per inner corner, all
    // overlapping — filled with the non-zero rule they add up to the shape (holes left open).
    clip: string
    straight: StraightPiece[]
    corners: CornerPiece[]
    inner: InnerPiece[]
}

const key = (r: number, c: number) => `${r},${c}`

// Connected groups of cells by shared sides (4-neighbour flood fill).
export function connectedShapes(cells: GridCell[]): GridCell[][] {
    const byKey = new Map(cells.map((c) => [key(c.row, c.col), c]))
    const seen = new Set<string>()
    const shapes: GridCell[][] = []
    for (const start of cells) {
        const k0 = key(start.row, start.col)
        if (seen.has(k0)) continue
        seen.add(k0)
        const stack = [start]
        const shape: GridCell[] = []
        while (stack.length > 0) {
            const cur = stack.pop()!
            shape.push(cur)
            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const k = key(cur.row + dr, cur.col + dc)
                const n = byKey.get(k)
                if (n && !seen.has(k)) {
                    seen.add(k)
                    stack.push(n)
                }
            }
        }
        shapes.push(shape)
    }
    return shapes
}

type Pt = [number, number]

function loop(points: Pt[]): string {
    // Clockwise on screen (y down) = positive shoelace area; flip the others so every loop winds
    // the same way and the non-zero fill unions them.
    let area = 0
    for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i]
        const [x1, y1] = points[(i + 1) % points.length]
        area += x0 * y1 - x1 * y0
    }
    const pts = area < 0 ? [...points].reverse() : points
    return 'M' + pts.map(([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`).join('L') + 'Z'
}

// One shape's mask and frame pieces, for cells `cellPx` wide and a frame `framePx` thick on
// screen (34 art px = framePx).
export function shapeGeometry(cells: GridCell[], cellPx: number, framePx: number): FlipArtShape {
    const k = framePx / FRAME_SLICE
    const set = new Set(cells.map((c) => key(c.row, c.col)))
    const has = (r: number, c: number) => set.has(key(r, c))
    const s = cellPx
    const inset = MASK_INSET * k
    const cut = (MASK_CORNER_CUT - MASK_INSET) * k
    const depth = BAND_DEPTH * k

    const loops: string[] = []
    const corners: CornerPiece[] = []
    // Straight band pieces per outline line, merged where one cell's band runs on into the next.
    const runs = new Map<string, {side: Side; line: number; spans: [number, number][]}>()
    const innerSeen = new Set<string>()
    const inner: InnerPiece[] = []

    // How far in from a cell's corner a straight band starts at that end: under the outer corner
    // piece if the perpendicular side is on the outline too, short of the inner-corner sprite if
    // the cell diagonally beyond is in the shape, else it runs on into the neighbour's band.
    const bandEnd = (r: number, c: number, lr: number, lc: number, nr: number, nc: number) => {
        if (!has(r + lr, c + lc)) return framePx - OVERLAP
        if (has(r + lr + nr, c + lc + nc)) return INNER_BAND_STOP * k
        return 0
    }
    const addRun = (side: Side, line: number, a: number, b: number) => {
        const id = `${side}:${line}`
        const run = runs.get(id) ?? {side, line, spans: []}
        run.spans.push([a, b])
        runs.set(id, run)
    }

    for (const {row: r, col: c} of cells) {
        const x0 = c * s, y0 = r * s, x1 = x0 + s, y1 = y0 + s
        const up = !has(r - 1, c), down = !has(r + 1, c), left = !has(r, c - 1), right = !has(r, c + 1)

        // Mask: the cell square, pulled in under the band on outline sides, pushed out a hair
        // into the neighbour elsewhere, outer corners cut along the gold's diagonal.
        const L = left ? x0 + inset : x0 - OVERLAP
        const R = right ? x1 - inset : x1 + OVERLAP
        const T = up ? y0 + inset : y0 - OVERLAP
        const B = down ? y1 - inset : y1 + OVERLAP
        const pts: Pt[] = []
        if (up && left) pts.push([x0 + inset, y0 + cut], [x0 + cut, y0 + inset]); else pts.push([L, T])
        if (up && right) pts.push([x1 - cut, y0 + inset], [x1 - inset, y0 + cut]); else pts.push([R, T])
        if (down && right) pts.push([x1 - inset, y1 - cut], [x1 - cut, y1 - inset]); else pts.push([R, B])
        if (down && left) pts.push([x0 + cut, y1 - inset], [x0 + inset, y1 - cut]); else pts.push([L, B])
        loops.push(loop(pts))

        // Outer corners: the frame's own corner, framePx square, in the cell's corner.
        if (up && left) corners.push({corner: 'tl', x: x0, y: y0, size: framePx})
        if (up && right) corners.push({corner: 'tr', x: x1 - framePx, y: y0, size: framePx})
        if (down && right) corners.push({corner: 'br', x: x1 - framePx, y: y1 - framePx, size: framePx})
        if (down && left) corners.push({corner: 'bl', x: x0, y: y1 - framePx, size: framePx})

        // Straight bands (start/end trimmed per bandEnd; normal = the outward side).
        if (up) addRun('top', r, x0 + bandEnd(r, c, 0, -1, -1, 0), x1 - bandEnd(r, c, 0, 1, -1, 0))
        if (down) addRun('bottom', r, x0 + bandEnd(r, c, 0, -1, 1, 0), x1 - bandEnd(r, c, 0, 1, 1, 0))
        if (left) addRun('left', c, y0 + bandEnd(r, c, -1, 0, 0, -1), y1 - bandEnd(r, c, 1, 0, 0, -1))
        if (right) addRun('right', c, y0 + bandEnd(r, c, -1, 0, 0, 1), y1 - bandEnd(r, c, 1, 0, 0, 1))

        // Inner corners: each grid point around the cell with exactly 3 of its 4 cells in the shape.
        for (const [R0, C0] of [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]]) {
            const id = key(R0, C0)
            if (innerSeen.has(id)) continue
            innerSeen.add(id)
            const ul = has(R0 - 1, C0 - 1), ur = has(R0 - 1, C0), dl = has(R0, C0 - 1), dr = has(R0, C0)
            if (+ul + +ur + +dl + +dr !== 3) continue
            const sx: 1 | -1 = !ul || !dl ? 1 : -1
            const sy: 1 | -1 = !ul || !ur ? 1 : -1
            const dx = sx === -1 ? INNER_SHIFT_RIGHT : 0
            const dy = sy === -1 ? INNER_SHIFT_BOTTOM : 0
            const vx = C0 * s, vy = R0 * s
            inner.push({x: vx, y: vy, sx, sy, dx, dy})
            // Mask over the empty cell's corner: the triangle between the two inset lines and the
            // gold diagonal, grown by OVERLAP into the shape's cells. Sprite-local art px, then
            // mirrored onto the screen.
            const m = MASK_INSET + OVERLAP / k
            const d = MASK_INNER_DIAG + dx + dy
            const local: Pt[] = [[m, m], [m, d - m], [d - m, m]]
            loops.push(loop(local.map(([lx, ly]) => [vx + sx * lx * k, vy + sy * ly * k] as Pt)))
        }
    }

    const straight: StraightPiece[] = []
    runs.forEach(({side, line, spans}) => {
        spans.sort((a, b) => a[0] - b[0])
        const merged: [number, number][] = []
        for (const sp of spans) {
            const last = merged[merged.length - 1]
            if (last && sp[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], sp[1])
            else merged.push([...sp])
        }
        for (const [a, b] of merged) {
            if (b <= a) continue
            if (side === 'top') straight.push({side, x: a, y: line * s, w: b - a, h: depth})
            else if (side === 'bottom') straight.push({side, x: a, y: (line + 1) * s - depth, w: b - a, h: depth})
            else if (side === 'left') straight.push({side, x: line * s, y: a, w: depth, h: b - a})
            else straight.push({side, x: (line + 1) * s - depth, y: a, w: depth, h: b - a})
        }
    })

    const first = cells.reduce((a, b) => (b.row < a.row || (b.row === a.row && b.col < a.col) ? b : a), cells[0])
    return {
        key: first ? key(first.row, first.col) : 'empty',
        cells: cells.length,
        clip: loops.join(''),
        straight,
        corners,
        inner,
    }
}
