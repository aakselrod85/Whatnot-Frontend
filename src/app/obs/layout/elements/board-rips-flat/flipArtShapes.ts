// Geometry for the 'flip_art' back's SHAPES (FlipArtOverlay.tsx draws them). Plain maths, no React,
// so a static test page can run the very same code.
//
// A shape is a connected group of settled sold cells — cells that share a SIDE (touching only at a
// corner = two shapes). It can be any outline: an L, a T, a ring with an unsold cell inside (a
// "hole"). Everything is worked out cell by cell from which of its four neighbours are in the
// shape, so outlines and holes need no special tracing:
//   - a side with no neighbour is on the outline and runs just inside the cell edge;
//   - a cell corner whose two sides are both on the outline is an outer (convex) corner, cut off;
//   - a grid point with exactly three of its four surrounding cells in the shape is an inner
//     (concave) corner — the fourth, empty cell's corner is filled with a small chamfer.
//     The four corners of a hole are such points, so a hole is rounded off from the inside for free.
//
// There is no gold frame any more: the painting itself is the whole look, cut to the outline with a thin gap at the edge.
// Numbers are in ART px (the old frame art's pixels); `framePx / FRAME_SLICE` turns them into
// screen px, the same scale RipsFlatCell.css `.rfb-art` uses for the solo cell's octagon.

export type GridCell = {row: number; col: number}

export const FRAME_SLICE = 34

// The painting's mask: 4 art px in from an outline side (a thin gap shows between neighbouring
// shapes, as it did under the old frame); at an outer corner cut along x + y = 30 from the corner.
// At an inner corner it goes OUT over the empty cell along a diagonal parallel to the cut corner
// of that cell's front stone (FRONT_TILE_CUT, the same 20% as scripts/rips-tiles/tiles.html's
// `cut`), as far from it as the straight sides are from their neighbours (the inset).
const MASK_INSET = 4
const MASK_CORNER_CUT = 30
const FRONT_TILE_CUT = 0.2

// Screen px the mask pieces of neighbouring cells overlap by, so no hairline can open where two
// pieces meet.
const OVERLAP = 0.5

const key = (r: number, c: number) => `${r},${c}`

export type FlipArtShape = {
    key: string
    cells: number
    // SVG path of the painting's mask: one clockwise loop per cell plus one per inner corner, all
    // overlapping — filled with the non-zero rule they add up to the shape (holes left open).
    clip: string
}

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

// One shape's mask, for cells `cellPx` wide; `framePx` is the corner-cut scale (34 art px = framePx).
export function shapeGeometry(cells: GridCell[], cellPx: number, framePx: number): FlipArtShape {
    const k = framePx / FRAME_SLICE
    const set = new Set(cells.map((c) => key(c.row, c.col)))
    const has = (r: number, c: number) => set.has(key(r, c))
    const s = cellPx
    const inset = MASK_INSET * k
    const cut = (MASK_CORNER_CUT - MASK_INSET) * k

    const loops: string[] = []
    const innerSeen = new Set<string>()

    for (const {row: r, col: c} of cells) {
        const x0 = c * s, y0 = r * s, x1 = x0 + s, y1 = y0 + s
        const up = !has(r - 1, c), down = !has(r + 1, c), left = !has(r, c - 1), right = !has(r, c + 1)

        // Mask: the cell square, pulled in on outline sides, pushed out a hair into the neighbour
        // elsewhere, outer corners cut off.
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

        // Inner corners: each grid point around the cell with exactly 3 of its 4 cells in the shape.
        for (const [R0, C0] of [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]]) {
            const id = key(R0, C0)
            if (innerSeen.has(id)) continue
            innerSeen.add(id)
            const ul = has(R0 - 1, C0 - 1), ur = has(R0 - 1, C0), dl = has(R0, C0 - 1), dr = has(R0, C0)
            if (+ul + +ur + +dl + +dr !== 3) continue
            const sx: 1 | -1 = !ul || !dl ? 1 : -1
            const sy: 1 | -1 = !ul || !ur ? 1 : -1
            const vx = C0 * s, vy = R0 * s
            // Mask over the empty cell's corner: the triangle between the two cell edges and the
            // diagonal, grown by OVERLAP into the shape's cells. Local px from the grid point
            // (positive = into the shape), mirrored onto the screen. The stone's cut runs along
            // x + y = -stoneCut there; the diagonal sits `inset` away from it, perpendicular.
            const m = inset + OVERLAP
            const d = -FRONT_TILE_CUT * s + inset * Math.SQRT2
            const local: Pt[] = [[m, m], [m, d - m], [d - m, m]]
            loops.push(loop(local.map(([lx, ly]) => [vx + sx * lx, vy + sy * ly] as Pt)))
        }
    }

    const first = cells.reduce((a, b) => (b.row < a.row || (b.row === a.row && b.col < a.col) ? b : a), cells[0])
    return {
        key: first ? key(first.row, first.col) : 'empty',
        cells: cells.length,
        clip: loops.join(''),
    }
}
