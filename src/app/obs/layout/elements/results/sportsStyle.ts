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

/** The yard numbers are text in the Aguante-Regular font (public/fonts/Aguante-Regular.otf), not
 *  sprites. The font file is declared in ResultsSports.css under the family name 'Sports-Numbers';
 *  to try another font change the file there and the font numbers below (they depend on the font). */
export const SPORTS_NUMBER_FONT_FAMILY = "'Sports-Numbers', sans-serif"

/** Font size at the reference scale, art px (same units as the two size constants below). Aguante's
 *  digits are 0.8 of the font size tall, and the old sprites' white digits were 89 art px tall,
 *  so 89 / 0.8 = 111.25 gives numbers of exactly the old size. Raise = bigger numbers. */
export const SPORTS_NUMBER_FONT_SIZE_ART = 111.25

/** Vertical nudge of the digits, in font sizes (negative = up). 0 for Aguante, whose digits sit
 *  exactly on the middle of their line box. */
export const SPORTS_NUMBER_FONT_DY_EM = 0

/** Every "0" in a number is drawn as this letter instead (Aguante's own zero has a slash through
 *  it). Same height as the digits. Set to '0' to use the font's zero. */
export const SPORTS_NUMBER_ZERO_GLYPH = 'o'

/** Thickness of the black outline around each digit, art px, measured outward from the white
 *  shape (the old sprites had about 5.5). Raise = fatter outline. */
export const SPORTS_NUMBER_OUTLINE_ART = 5.5

/** Fill and outline colours of the numbers. */
export const SPORTS_NUMBER_FILL = '#ffffff'
export const SPORTS_NUMBER_OUTLINE_COLOR = '#000000'

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
 *  stripe is 0.02). A nickname longer than what is left is cut at these edges and runs (see
 *  SPORTS_SCROLL_* below). */
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
// Running nicknames. Every nickname has the same letter size; one that does not fit its text
// area is cut there (with soft edges) and runs left like a ticker, a second copy following it —
// same behaviour as resultsThin. All running names of the board move in step: they set off
// together, each slides by its own length, the short ones wait for the longest one, then PAUSE,
// then the next round. Values copied from resultsThin (results-thin/scrollStyle.ts) and kept
// separate, so the two can be tuned apart.
// ---------------------------------------------------------------------------------------------

/** Speed, px per second (element px). */
export const SPORTS_SCROLL_SPEED = 15

/** Empty space, px, between the END of one copy of the name and the START of the next. */
export const SPORTS_SCROLL_GAP_PX = 15

/** How long everything stands still before the very first round, ms (comes back whenever a name
 *  appears, changes or the board is resized). */
export const SPORTS_SCROLL_START_PAUSE_MS = 2000

/** The wait between rounds, ms, counted from the moment the LONGEST name has arrived. */
export const SPORTS_SCROLL_PAUSE_MS = 2000

/** Width of the soft fade at the left and right edge of a running nickname, fraction of the
 *  element width (0.01 = ~11 px on a 1080-wide board). 0 = hard cut. */
export const SPORTS_SCROLL_FADE = 0.01

// ---------------------------------------------------------------------------------------------
// Big buyers — checkbox "show buyers with big amount of orders" in the Results settings.
// A buyer who bought at least SPORTS_BIG_BUYER_MIN slots in this break (giveaways and unsold
// spots do not count) gets a gold, glowing, thicker nickname with GoldLine.png under it, in every
// one of their cells. Sizes marked "em" are shares of the nickname's own letter size, so they
// follow the nickname when it grows or shrinks.
// ---------------------------------------------------------------------------------------------

export const SPORTS_GOLD_LINE_SRC = `${ART_DIR}/GoldLine.png`

/** How many bought slots in one break make a buyer "big". */
export const SPORTS_BIG_BUYER_MIN = 5

/** Plain letter colour of a big buyer's nickname (when SPORTS_BIG_GRADIENT is empty): rgb(red, green, blue), each 0-255. */
export const SPORTS_BIG_COLOR = 'rgb(244, 236, 121)'

/** Letter GRADIENT, top to bottom: a list of colours, rgb(red, green, blue). Two or more colours =
 *  gradient, used instead of SPORTS_BIG_COLOR. Empty list [] = plain SPORTS_BIG_COLOR.
 *  A colour may carry its own position: 'rgb(255, 255, 255) 30%' = this colour at 30% height. */
export const SPORTS_BIG_GRADIENT: string[] = ['rgb(255, 252, 214)', 'rgb(255, 251, 0) 45%', 'rgb(240, 194, 1)']

/** How much bigger the letters are than a normal nickname (1.2 = 20% bigger). A long nickname
 *  still shrinks to fit its cell, so this mostly shows on short ones. */
export const SPORTS_BIG_FONT_SCALE = 1.1

/** How much WIDER a big buyer's text area is than a normal one (1.1 = 10% wider). It never gets
 *  closer to the column stripes than SPORTS_TEXT_STRIPE_GAP. */
export const SPORTS_BIG_TEXT_WIDTH = 1.1

/** Smallest gap between a nickname's edge and the column stripe next to it, fraction of the
 *  element width (0.002 = ~2 px). Only limits the wider big-buyer text area. */
export const SPORTS_TEXT_STRIPE_GAP = 0.002

/** How much SMALLER the logo and its area are in a big buyer's cell (0.1 = 10% smaller). The
 *  freed height becomes space between the logo and the nickname. */
export const SPORTS_BIG_LOGO_SHRINK = 0.2

/** Outline AROUND the letters (drawn outside them, so the letters themselves are not eaten).
 *  - `width` — outline thickness, em. 0 = no outline; 0.05 = clearly visible; above ~0.12 the
 *              holes in "a", "e", "o" start to fill up.
 *  - `color` — rgb(red, green, blue). Same as SPORTS_BIG_COLOR = the letters just get fatter. */
export const SPORTS_BIG_OUTLINE = { width: 0.04, color: 'rgb(113, 067, 0)' } as const

/** Outline GRADIENT, top to bottom — same rules as SPORTS_BIG_GRADIENT. Two or more colours =
 *  used instead of SPORTS_BIG_OUTLINE's `color`; empty list [] = plain colour. */
export const SPORTS_BIG_OUTLINE_GRADIENT: string[] = ['rgb(170, 110, 10)', 'rgb(70, 47, 0)']

/** Glow behind the letters — a blurred, fattened copy of the nickname laid under it.
 *  - `color`  — rgba(red, green, blue, strength); strength 0 = no glow, 1 = full.
 *  - `blur`   — how soft the glow is and how far it spreads past the letters, em.
 *  - `spread` — how much the copy is fattened before blurring, em. Bigger = denser, brighter
 *               glow without making it spread further.
 *  - `layers` — how many such copies are stacked; each one makes the glow more saturated
 *               (1 = soft, 2-3 = rich, as in the reference).
 *  Glow reaches roughly blur + spread past the letters; with the nickname ~30 px tall,
 *  0.25 + 0.1 em is ~10 px. */
export const SPORTS_BIG_GLOW = { color: 'rgba(144, 100, 29, 0.85)', blur: 0.25, spread: 0.1, layers: 2 } as const

/** How far a big buyer's nickname is lifted, share of the cell height — makes room for the gold
 *  line under it. Only the nickname moves; the logo keeps its size and place. */
export const SPORTS_BIG_TEXT_RAISE = 0.1

/** GoldLine.png under the nickname. It always runs the full width of the cell (the picture's own
 *  ends fade out, so it reads shorter). Measured on the reference img.png: there the bright core
 *  of the line is ~11% of the cell height and its middle ~7% above the cell's bottom line; the
 *  picture's core is half its height, hence 0.22.
 *  - `height` — thickness of the picture, share of the cell height.
 *  - `y`      — where the MIDDLE of the line sits, share of the cell height from the cell's top
 *               (1 = on the bottom white line; smaller = higher). */
export const SPORTS_BIG_LINE = { height: 0.22, y: 0.93 } as const

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
        SPORTS_GOLD_LINE_SRC,
    ])
)
