// Team Breakdown — every hand-tuned number of the element in one place.
//
// All values are in PIXELS OF THE SOURCE ART (base.png is 864x1484, cell.png is 390x500), not
// canvas px: the whole element scales with its box, so these stay correct at any size.

export const ART = '/images/team_breakdown/rips'
export const BASE_SRC = `${ART}/base.png`
export const CELL_SRC = `${ART}/cell.png`
export const SEPARATOR_SRC = `${ART}/separator.png`

export const BASE_W = 864
export const BASE_H = 1484

// ── base.png 3-slice ─────────────────────────────────────────────────────────────────────────
// base.png always fills the box's width (keeping its proportions); its height follows the box.
// Rows that never stretch: the top (title, pillars, banners) and the bottom (corner ornaments).
// Everything between them is stretched to the box's height.
export const BASE_SLICE_TOP = 280 // just below the gold corner bracket under each banner (its tip is at y ≈ 277)
export const BASE_SLICE_BOTTOM = 200

// ── Area for the cells inside base.png ───────────────────────────────────────────────────────
// The blue marble runs from x 38 to x 826 and from y 224 (under the title) to y 1418.
// `bottom` is measured on the original 1484-tall base.png; when the base stretches, the area
// keeps the same distance to the base's bottom edge.
export const GRID_AREA = { left: 46, top: 250, right: 818, bottom: 1410 }

// ── Gaps between cells (base.png px) ─────────────────────────────────────────────────────────
export const GAP_X = 2 // between columns
export const GAP_Y = 6 // between rows

// ── cell.png 3-slice ─────────────────────────────────────────────────────────────────────────
export const CELL_W = 390 // cell.png is 390x500
// Rows of cell.png that never stretch: the top (with the hexagon) and the bottom (with the glow).
// Everything between them is stretched to the cell's height.
export const CELL_SLICE_TOP = 130
export const CELL_SLICE_BOTTOM = 50

// Smallest blue middle a cell keeps (cell.png px). With many rows (few columns) the cells would
// get flatter than this; instead the whole grid gets narrower and sits centred in the area.
export const MIN_MIDDLE = 200

// Logo box inside the hexagon (cell.png px, measured from the cell's top-left corner). Empty
// transparent margins of a logo file are cut off first, so every logo fills this box as far as
// its own proportions allow.
export const LOGO_BOX = { x: 138, y: 12, w: 118, h: 80 }

// Outline around the logo's shape. Width in cell.png px; 0 = no outline.
export const LOGO_OUTLINE_COLOR = '#000000' // '#ffffff' = white
export const LOGO_OUTLINE_WIDTH: number = 2

// Shadow under the logo (drawn under the outline). Offsets and blur in cell.png px;
// the last number of the colour is the opacity (0..1). Set LOGO_SHADOW_BLUR and both offsets to 0 to turn it off.
export const LOGO_SHADOW_COLOR = 'rgba(0, 0, 0, 0.75)'
export const LOGO_SHADOW_X: number = 0 // right (+) / left (-)
export const LOGO_SHADOW_Y: number = 10 // down (+) / up (-)
export const LOGO_SHADOW_BLUR: number = 5

// Text area inside the blue part of the cell (cell.png px; top from the cell top, bottom from
// the cell bottom). Names are centred vertically inside it.
export const TEXT_AREA = { left: 22, right: 22, top: 112, bottom: 24 }

// ── Text ─────────────────────────────────────────────────────────────────────────────────────
export const LINE_HEIGHT = 1.05 // × font size
export const MAX_FONT = 64 // cell.png px — the largest the names ever get
export const SEPARATOR_WIDTH = 0.75 // share of the text area's width
export const SEPARATOR_ASPECT = 33 / 400 // separator.png height / width
export const SEPARATOR_MARGIN = 0 // empty space above and below a separator, × font size

// Outline around the names. Width in cell.png px; 0 = no outline.
export const TEXT_OUTLINE_COLOR = '#000000'
export const TEXT_OUTLINE_WIDTH: number = 8

// ── Settings defaults ────────────────────────────────────────────────────────────────────────
export const DEFAULT_COLUMNS = 5
export const DEFAULT_TOPPS_DYNASTY = true
