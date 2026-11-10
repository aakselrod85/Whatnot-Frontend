// The 'sports' skin of the `resultsThin` element (schema.ts `RESULTS_THIN_STYLES`): a green
// football board with a winged ball on top. Art lives in public/images/results_mini/sports; THIS
// FILE is the only place that names a file or holds a geometry number for the skin — tune here.
//
// BOARD: always as wide as the element, at the art's own proportions (scale = box width / art
// width), so the ball and the gold never distort. Only the HEIGHT adapts to the box: the top band
// (ball, wings, chamfered corners) and the bottom band are drawn whole, the plain green middle
// between them stretches vertically.
//
// CELL: a 9-slice whose scale follows the ROW HEIGHT (scale = row height / art height), so the
// slanted sides, the chamfers and the gold rim keep their shape; only the middle stretches
// sideways to the cell width.

const ART_DIR = '/images/results_mini/sports'

/** Board art (1067x446): green field in a gold frame, winged football on top. */
export const SPORTS_THIN_BOARD_SRC = `${ART_DIR}/ResultsMiniBoard.png`
/** Art size of the board PNG, px. */
export const SPORTS_THIN_BOARD_ART = { w: 1067, h: 446 } as const

/**
 * Where the board is cut, art px from the top / bottom of the PNG. Everything above `top` (ball,
 * wings, top gold, chamfered top corners — those end ~150) and below `bottom` (bottom gold and its
 * chamfers — they start ~400) is drawn whole; the strip between stretches with the box height.
 * Must be re-measured if the art is replaced.
 */
export const SPORTS_THIN_BOARD_SLICE = { top: 160, bottom: 50 } as const

/**
 * Where the cell grid sits inside the board, art px from each edge of the PNG (scaled with the
 * board on screen). The green field starts ~124 from the top (under the top gold), ~26 in from
 * the sides, and ends ~26 above the bottom; these carry extra so the cells clear the gold and the
 * chamfered corners. Bigger number = more empty green between the frame and the cells.
 */
export const SPORTS_THIN_GRID_INSETS = { top: 140, right: 35, bottom: 30, left: 35 } as const

/** Space between two rows of cells, canvas px. */
export const SPORTS_THIN_ROW_GAP = 2

/** Space between two columns of cells, canvas px. May be NEGATIVE: the cells are slanted, so
 *  they can overlap a little and sit closer than a plain gap of 0 allows. */
export const SPORTS_THIN_COLUMN_GAP = -10

/** Cell art (211x56): a slanted green plate with a gold rim; only the last pixel row is transparent. */
export const SPORTS_THIN_CELL_SRC = `${ART_DIR}/ResultsMinicell.png`
/** Art height of the cell PNG, px — the cell's 9-slice is scaled by (row height / this). */
export const SPORTS_THIN_CELL_ART_H = 56

/** 9-slice cuts of the cell, art px from each edge. Left/right cover the slanted sides, top/bottom
 *  the gold rim. Re-measure if the PNG is replaced. */
export const SPORTS_THIN_CELL_SLICE = { top: 7, right: 39, bottom: 9, left: 34 } as const

/** Space between the cell art's outer edge and the logo (left) / the end of the name (right), art
 *  px (scaled like the slice). Bigger = more room between the gold and the content. Top/bottom
 *  centre the content on the visible plate (it sits ~1–54 of the 56 px art). The right side is
 *  wider because the plate's right edge slants inwards towards the bottom. */
export const SPORTS_THIN_CELL_PAD = { top: 8, right: 30, bottom: 9, left: 24 } as const

/** Logo (or abbreviation tile) size, share of the row height. */
export const SPORTS_THIN_LOGO = 0.7
/** Nickname letter size, share of the row height. */
export const SPORTS_THIN_FONT = 0.36

/**
 * Vertical position of the content inside the cell, share of the row height: 0 = centred as the
 * cell padding (SPORTS_THIN_CELL_PAD) puts it, positive = lower, negative = higher. The logo and
 * the nickname move independently. 0.05 = 5% of the row height.
 */
export const SPORTS_THIN_LOGO_OFFSET_Y = -0.02
export const SPORTS_THIN_TEXT_OFFSET_Y = -0.02

/**
 * Shadow under the logo and the nickname, straight down — same look as the big Results board's
 * sports shadow. `offsetY` and `blur` are shares of the row height; `color`'s last number is the
 * shadow's strength (0 = invisible, 1 = solid black).
 */
export const SPORTS_THIN_SHADOW = { offsetY: 0.05, blur: 0.03, color: 'rgba(0, 0, 0, 1)' } as const

// registry.ts's `preload` list for the `resultsThin` entry — static art only.
export const SPORTS_RESULTS_THIN_PRELOAD: string[] = [SPORTS_THIN_BOARD_SRC, SPORTS_THIN_CELL_SRC]
