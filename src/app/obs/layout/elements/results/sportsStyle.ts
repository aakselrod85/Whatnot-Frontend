// The 'sports' skin of the `results` element (schema.ts `RESULTS_STYLES`): an American-football
// field. Art lives in public/images/results/sports; THIS FILE is the only place that names a file
// or holds a geometry number — SportsResults.tsx turns these into pixels and ResultsSports.css
// only paints what it is handed. To move something on screen, change a number here.
//
// Units. Almost everything is a FRACTION OF THE ELEMENT'S WIDTH (`box.w`), including vertical
// distances, so the whole design scales as one piece and only the field's height absorbs a
// taller or shorter box. The fractions were measured on a design where the green panel is 833 px
// wide: "0.006" means "5 px at that width". Values marked "art px" are pixels inside the PNG itself and only change if that PNG
// is re-exported.

const ART_DIR = '/images/results/sports'

// File names are the artist's, typos included ("Lable", "Straingt") — do not "fix" them here
// without renaming the files.
export const SPORTS_BASE_SRC = `${ART_DIR}/Base.png`
export const SPORTS_LABEL_SRC = `${ART_DIR}/ResultsLable.png`
export const SPORTS_LINE_SRC = `${ART_DIR}/LaneStraingt.png`
export const SPORTS_STRIPE_SRC = `${ART_DIR}/LaneCircled.png`
export const SPORTS_GRASS_SRC = `${ART_DIR}/Grass.png`

// ---------------------------------------------------------------------------------------------
// Base — the dark green panel with the gold border (Base.png, 873x1308), drawn as a 9-slice.
// ---------------------------------------------------------------------------------------------

/** Art px cut off each side of Base.png for the 9-slice. Must cover the rounded corner (radius
 *  ~45) and the gold border (~16) so neither is ever stretched; only the green inside moves. */
export const SPORTS_BASE_SLICE = { top: 64, right: 64, bottom: 64, left: 64 } as const

/** Thickness of the gold border / size of the rounded corners. The border is drawn at the art's
 *  own size when the element is this many px wide and scales with the width from there (873 = the
 *  width of Base.png, which is how the design looks). SMALLER number = THICKER border. */
export const SPORTS_BASE_ART_WIDTH = 873

// ---------------------------------------------------------------------------------------------
// Field — the white rectangle holding the rows.
// ---------------------------------------------------------------------------------------------

/**
 * Distance from the element's edges to the OUTER edge of the field's white rectangle, as
 * fractions of the element WIDTH.
 *  - `side`   — the gutter on the left and on the right where the yard numbers stand.
 *  - `top`    — room under the RESULTS plate.
 *  - `bottom` — strip of bare panel under the field.
 */
export const SPORTS_FIELD_INSET = { top: 0.06, side: 0.09, bottom: 0.045 } as const

/** Thickness of every white field line (outer rectangle and the lines between rows), fraction of
 *  the element width. Rounded to whole px, never thinner than 1. */
export const SPORTS_LINE_THICKNESS = 0.006

// ---------------------------------------------------------------------------------------------
// RESULTS plate (ResultsLable.png, 883x259).
// ---------------------------------------------------------------------------------------------

/** Where the visible gold plate sits inside its PNG, art px from the PNG's top-left corner (the
 *  rest is transparent padding and soft shadow). Re-measure only if the PNG is re-exported. */
export const SPORTS_LABEL_VISIBLE = { left: 14, top: 59, right: 869, bottom: 212 } as const
/** Size of the PNG itself, art px. */
export const SPORTS_LABEL_ART = { w: 883, h: 259 } as const

/** Width of the visible plate. 1 = exactly from the centre of the left number column to the
 *  centre of the right one (the approved rule); 1.05 = 5% wider, 0.9 = 10% narrower. Height
 *  follows, the plate is never squashed. */
export const SPORTS_LABEL_WIDTH_SCALE = 1

/** How far the plate's bottom edge dips BELOW the element's top edge (i.e. overlaps the panel),
 *  fraction of the element width. Everything else of the plate sticks out above the element.
 *  Bigger = plate sits lower; 0 = plate stands exactly on the top edge. */
export const SPORTS_LABEL_OVERLAP = 0.04

// ---------------------------------------------------------------------------------------------
// Column dividers — stacks of short rounded stripes (LaneCircled.png, 36x10) between columns.
// ---------------------------------------------------------------------------------------------

/** Width of one stripe, fraction of the element width. The stripe never stretches with the row:
 *  taller rows simply get more stripes. */
export const SPORTS_STRIPE_W = 0.04

/** Height of one stripe relative to its width (the PNG's own proportion, 10 / 36). The gap
 *  between stripes and the minimum space above the first / below the last are always exactly one
 *  stripe height, so this also sets how densely the stripes are stacked. */
export const SPORTS_STRIPE_ASPECT = 10 / 36

/** A short last row is centred, so its cells do not line up with the columns above. `false`:
 *  stripes only BETWEEN the cells of that row. `true`: also on the two outer sides of the centred
 *  group. */
export const SPORTS_SHORT_ROW_OUTER_DIVIDERS = false

// ---------------------------------------------------------------------------------------------
// Yard numbers in the side gutters: 0 10 20 30 40 50 40 30 20 10 0, a short tick between each.
// ---------------------------------------------------------------------------------------------

/** Where the centre of a number column sits across its gutter: 0 = on the element's edge, 1 = on
 *  the field's white line, 0.5 = half-way. (0.58 rather than 0.5 because the gold border eats
 *  into the outer side of the gutter.) Also sets the RESULTS plate's width, see above. */
export const SPORTS_NUMBER_CENTER = 0.58

/** Size of the numbers: width of the widest one ("40", white part only) as a share of the gutter
 *  width (`SPORTS_FIELD_INSET.side`). All numbers share one scale. */
export const SPORTS_NUMBER_GUTTER_FILL = 0.55

/** Safety cap for few / short rows, where the numbers get close together: a number (black
 *  outline included) may take at most this share of the distance between two neighbouring
 *  numbers' centres; the rest is left for the tick and the air around it. Numbers and ticks
 *  shrink together once this is hit. Lower = more air, smaller numbers when cramped. */
export const SPORTS_NUMBER_MAX_SLOT_FILL = 0.62

/** Only when there is exactly ONE row (the top and bottom "0" would otherwise land on the same
 *  spot): the first and last "0" are placed this far inside the field's top and bottom, as a
 *  fraction of the field height. 1/22 gives each of the 11 numbers an equal slice of the gutter. */
export const SPORTS_SINGLE_ROW_NUMBER_INSET = 1 / 22

/** Length of the tick between two numbers, as a share of the gutter width. */
export const SPORTS_TICK_W = 0.32

/** Thickness of that tick, fraction of the element width. */
export const SPORTS_TICK_THICKNESS = 0.0045

/** Top-to-bottom order of the numbers in each gutter. */
export const SPORTS_NUMBER_SEQUENCE = [0, 10, 20, 30, 40, 50, 40, 30, 20, 10, 0] as const

export type SportsNumber = (typeof SPORTS_NUMBER_SEQUENCE)[number]

/** One number PNG: its size and the centre of its white digits, all art px. The PNGs have uneven
 *  transparent padding (and a baked shadow underneath), so they are centred on the digits, not on
 *  the file. Re-measure only if a PNG is re-exported. */
export type SportsNumberArt = { src: string; w: number; h: number; cx: number; cy: number }

export const SPORTS_NUMBER_ART: Record<SportsNumber, SportsNumberArt> = {
    0: { src: `${ART_DIR}/0.png`, w: 76, h: 111, cx: 38, cy: 52.5 },
    10: { src: `${ART_DIR}/10.png`, w: 127, h: 116, cx: 63, cy: 54.5 },
    20: { src: `${ART_DIR}/20.png`, w: 143, h: 136, cx: 73, cy: 55.5 },
    30: { src: `${ART_DIR}/30.png`, w: 142, h: 124, cx: 70, cy: 53.5 },
    40: { src: `${ART_DIR}/40.png`, w: 149, h: 117, cx: 74.5, cy: 53.5 },
    50: { src: `${ART_DIR}/50.png`, w: 143, h: 123, cx: 70.5, cy: 55.5 },
}

/** Art px: width of the widest number's white digits ("40") and the height of any number with
 *  its black outline. What the two size rules above are measured against. */
export const SPORTS_NUMBER_WIDEST_ART = 119
export const SPORTS_NUMBER_OUTLINE_H_ART = 102

// ---------------------------------------------------------------------------------------------
// Cell — team logo above, buyer nickname below, nothing else (no frame, no plate).
// ---------------------------------------------------------------------------------------------

/** Share of the cell's height given to the buyer nickname, at the bottom. The logo gets the rest. */
export const SPORTS_TEXT_SHARE = 0.3

/** Letter size of the nickname as a share of that bottom strip. 1 would make the line exactly as
 *  tall as the strip; 0.9 leaves a little room for tails of letters like "g" and "y". */
export const SPORTS_TEXT_FONT = 0.9

/** Biggest the nickname's letters may get, fraction of the element width. Only matters when rows
 *  are few and therefore very tall (the strip above would otherwise make short names enormous
 *  next to long ones, which shrink to fit). With ~10 rows the letters are well under this. */
export const SPORTS_TEXT_MAX_FONT = 0.045

/** Empty margin on the left and right of the nickname, fraction of the element width (same unit
 *  as the stripe width, so the text keeps clear of the stripes whatever the column count: half a
 *  stripe is 0.0192). A nickname longer than what is left shrinks to fit. */
export const SPORTS_TEXT_PAD_X = 0.03

/** Gap between the nickname and the row's bottom line, share of the cell height. 0 = the nickname
 *  strip touches the line (the letters still have their own air inside the strip). Raising it
 *  lifts the nickname; the logo area shrinks to make room. */
export const SPORTS_TEXT_BOTTOM_GAP = 0.05

/** Gap between the row's top line and the logo, share of the cell height. */
export const SPORTS_LOGO_GAP_TOP = 0.05

/** Gap between the logo and the nickname strip, share of the cell height. */
export const SPORTS_LOGO_GAP_BOTTOM = 0.04

/** Widest a logo may get, share of the cell width. Height is limited by the two gaps above and
 *  the nickname strip; whichever limit is hit first wins, the logo is never squashed. */
export const SPORTS_LOGO_MAX_W = 0.52

/** The team logo files are squares with empty margins around the drawing (a wide logo such as the
 *  Chargers' fills under half of its square's height). `true`: those margins are ignored, so the
 *  DRAWING itself is what fills the logo area — every team reads at a similar size, as in the
 *  design. `false`: the whole square is fitted, margins included (logos look smaller and uneven). */
export const SPORTS_LOGO_TRIM = true

/** Non-team spots have no logo, only a short code ("C1"): its letter size as a share of the logo
 *  area's height. It is never wider than a logo may be (SPORTS_LOGO_MAX_W) — it shrinks to fit. */
export const SPORTS_ABBR_FONT = 0.6

// ---------------------------------------------------------------------------------------------
// Shadow under nicknames, logos and numbers: straight down (no sideways shift), soft.
// ---------------------------------------------------------------------------------------------

/**
 *  - `offsetY` — how far the shadow is pushed down, fraction of the element width.
 *  - `blur`    — softness; also how much bigger than the object the shadow looks. Same unit.
 *  - `color`   — shadow colour; the last number is its strength (0 = invisible, 1 = solid black).
 */
export const SPORTS_SHADOW = { offsetY: 0.005, blur: 0.003, color: 'rgba(0, 0, 0, 1)' } as const

// ---------------------------------------------------------------------------------------------

// registry.ts's `preload` list for the `results` entry — static art only (ADDING_AN_ELEMENT.md
// §2). Grass2.png (unused) is deliberately absent.
export const SPORTS_RESULTS_PRELOAD: string[] = Array.from(
    new Set([
        SPORTS_BASE_SRC,
        SPORTS_LABEL_SRC,
        SPORTS_LINE_SRC,
        SPORTS_STRIPE_SRC,
        SPORTS_GRASS_SRC,
        ...SPORTS_NUMBER_SEQUENCE.map((n) => SPORTS_NUMBER_ART[n].src),
    ])
)
