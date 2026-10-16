// The 'rips' skin of the `resultsThin` element (schema.ts `RESULTS_THIN_STYLES`): the art in
// public/images/results_mini/rips and the geometry that art dictates. Sibling of
// elements/results/ripsStyle.ts, kept separate so the two elements' skins can diverge. The board
// the cells and the board's corner ornaments are skinned here. This is the ONLY file that names an
// image or holds a geometry number for the skin: tune here, nowhere else.
//
// The board is a 9-slice (RIPS_THIN_BOARD_SLICE) at a fixed scale, so its border keeps one
// thickness at any box size; the cell art is painted in fill mode (`background-size: 100% 100%`).

const ART_DIR = '/images/results_mini/rips'

/** Background of the whole element box: dark-blue marble field with a gold band all around
 *  (751x279), drawn as a 9-slice. */
export const RIPS_THIN_BOARD_SRC = `${ART_DIR}/ResultsThin.png`

/**
 * 9-slice cuts of ResultsThin.png (art px from each edge of the 751x279 file, 2026-10-16 evening
 * art). This art has a plain gold band with mitred corners and no ornaments (the ornaments are the
 * separate RIPS_THIN_CORNER sprite), so the cut only has to contain the band: ~13 px at the left,
 * ~11 px at the right, ~9–10 px top and bottom. 16 everywhere covers it with margin; the corners
 * are drawn unstretched, the edges stretch along their length, the blue middle both ways.
 * MUST be re-measured if the board art is replaced.
 */
export const RIPS_THIN_BOARD_SLICE = { top: 16, right: 16, bottom: 16, left: 16 } as const

/**
 * Canvas px per art px for the board's 9-slice corners/edges; the corners never resize with the
 * box. Picked to bring the board's gold band close to the `frame` element's rips gold
 * (FrameForTheMarble.png, drawn 1:1: ~18–20 px at the sides, ~16 px top/bottom). The board art's
 * band is ~13 px at the sides and ~9–10 px top/bottom, so one scale cannot match both exactly.
 * Bigger = thicker border. Also scales the corner sprites (RIPS_THIN_CORNER) and their overhang.
 */
export const RIPS_THIN_BOARD_SCALE = 1.1

/**
 * Where the cell grid lives INSIDE the board, in art px from each edge (multiplied by
 * RIPS_THIN_BOARD_SCALE on screen, so it follows the border thickness). The blue field starts
 * ~10 px from the top/bottom and ~12–14 px in from the sides; these carry extra so cells clear
 * the gold.
 */
export const RIPS_THIN_GRID_INSETS = { top: 16, right: 26, bottom: 18, left: 26 } as const

/**
 * Meander ornament laid over each corner of the board, ABOVE the board and the cells. The PNG
 * (40x42 art px) is the TOP-LEFT corner; the other three are the same file mirrored so each
 * ornament faces into the board: top-right flipped horizontally, bottom-left vertically,
 * bottom-right both ways. Drawn at RIPS_THIN_BOARD_SCALE like the board.
 */
export const RIPS_THIN_CORNER = { src: `${ART_DIR}/ResultsThinCorner.png`, w: 40, h: 42 } as const

/** How far each corner ornament sticks OUT past the board's edges (art px, × RIPS_THIN_BOARD_SCALE
 *  on screen): `x` past the left/right edges, `y` past the top/bottom edges. */
export const RIPS_THIN_CORNER_OVERHANG = { x: 8, y: 3 } as const

/** Background of one cell: dark-blue plate with a gold rounded rim (500x143). The rim is ~14px
 *  (2.8%) wide at the sides, so ThinResultsRips.css pads the cell content past it. */
export const RIPS_THIN_CELL_SRC = `${ART_DIR}/ResultsCell.png`

// registry.ts's `preload` list for the `resultsThin` entry — static art only (ADDING_AN_ELEMENT.md
// §2).
export const RIPS_RESULTS_THIN_PRELOAD: string[] = [
    RIPS_THIN_BOARD_SRC,
    RIPS_THIN_CELL_SRC,
    RIPS_THIN_CORNER.src,
]
