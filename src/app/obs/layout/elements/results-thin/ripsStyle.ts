// The 'rips' skin of the `resultsThin` element (schema.ts `RESULTS_THIN_STYLES`): the art in
// public/images/results_mini/rips and the geometry that art dictates. Sibling of
// elements/results/ripsStyle.ts, kept separate so the two elements' skins can diverge. The board
// and the cells are skinned here, and so is the optional top decoration (RipsTopDecoration.tsx —
// the ledge/medallion above the box and the chains up to the canvas top). This is the ONLY file
// that names an image or holds a geometry number for the skin: tune here, nowhere else.
//
// Board and cell are painted in fill mode (`background-size: 100% 100%`), by the user's choice over
// a 9-slice: the element box is operator-sized, so the art stretches to whatever proportion the box
// has. The decoration sprites are NOT stretched (except the marble strip, horizontally) — they are
// drawn at the board art's own scale, shown at a fixed DECORATION_SCALE.

const ART_DIR = '/images/results_mini/rips'

/** Background of the whole element box: dark-blue marble field with a cream marble + gold border
 *  all around (1473x515). */
export const RIPS_THIN_BOARD_SRC = `${ART_DIR}/ResultsThin.png`

/**
 * 9-slice cuts of ResultsThin.png (art px from each edge of the 1473x515 file). The four corners
 * (with the meander ornaments) are drawn unstretched; the four edges stretch along their length
 * only; the blue middle stretches both ways. Measured off the art: the top-left/right ornaments
 * end at y≈80 and x≈92, the bottom ones start ≈98 from the bottom. MUST be re-measured if the
 * board art is replaced.
 */
export const RIPS_THIN_BOARD_SLICE = { top: 80, right: 92, bottom: 98, left: 92 } as const

/** Canvas px per art px for the board's 9-slice corners/edges. Same as the top decoration's scale
 *  so the board's gold and marble match the parts standing on it; the corners never resize with
 *  the box. */
export const RIPS_THIN_BOARD_SCALE = 0.5

/**
 * Where the cell grid lives INSIDE the board, in art px from each edge (multiplied by
 * RIPS_THIN_BOARD_SCALE on screen, so the gap to the marble border is the same at any box size).
 * The blue field starts ≈59 px from the top, ends ≈62 px from the bottom and ≈90 px in from each
 * side; these carry a little extra so cells clear the thin gold line along the marble.
 * Converted from the previous fill-mode fractions (0.125 / 0.055 / 0.14 / 0.055 of 515 / 1473).
 */
export const RIPS_THIN_GRID_INSETS = { top: 64, right: 81, bottom: 72, left: 81 } as const

/** Background of one cell: dark-blue plate with a gold rounded rim (500x143). The rim is ~14px
 *  (2.8%) wide at the sides, so ThinResultsRips.css pads the cell content past it. */
export const RIPS_THIN_CELL_SRC = `${ART_DIR}/ResultsCell.png`

// ---------------------------------------------------------------------------------------------
// Top decoration (RipsTopDecoration.tsx): drawn ABOVE the box, outside it. Switched by the
// element's `topDecoration` field (schema.ts; absent = on), rips style only.
// ---------------------------------------------------------------------------------------------

/**
 * Fixed scale of the whole top decoration (side pieces, strip height, medallion, chain links,
 * brackets): canvas px per art px. It does NOT depend on the box size — resizing the box only
 * moves the parts (side pieces follow the box edges, medallion follows its centre, chains follow
 * the rings) and stretches the strip's width. 1 = the PNGs' natural size, 0.5 = half.
 * Every size/offset below is in art px and is multiplied by this at render time.
 */
export const DECORATION_SCALE = 0.5

/** A decoration sprite: its file and its natural size in art px (multiplied by DECORATION_SCALE on screen). */
export type ArtSprite = { readonly src: string; readonly w: number; readonly h: number }

/** Gold pedestal with a ring on top and a marble ledge extending to the RIGHT. Drawn twice at
 *  natural size: left as is at the box's left edge, right mirrored at the box's right edge. */
export const RIPS_THIN_TOP_SIDE: ArtSprite = { src: `${ART_DIR}/ResultsThinTopPartSide.png`, w: 321, h: 144 }

/** Marble strip between the two side pieces. Fixed height, stretched horizontally (the one
 *  decoration sprite that is stretched — intended). */
export const RIPS_THIN_TOP_STRIP: ArtSprite = { src: `${ART_DIR}/ResultsThinTopPart.png`, w: 948, h: 58 }

/** Laurel medallion, natural size, horizontally centred on the box. The tallest part, so it sets
 *  the height of the decoration zone. */
export const RIPS_THIN_TOP_MIDDLE: ArtSprite = { src: `${ART_DIR}/ResultsThinTopPartMiddle.png`, w: 270, h: 156 }

/** Vertical shift of the medallion from its default spot (bottom edge on the box's top edge), in px
 *  at art scale (scaled with the board like every other size here). Positive moves it DOWN onto the
 *  board, negative moves it UP. 0 = default. */
export const MIDDLE_OFFSET_Y = 58

/** Two vertical chain links, natural size, repeated upwards from each side piece's ring. */
export const RIPS_THIN_CHAIN_LINK: ArtSprite = { src: `${ART_DIR}/ChainPart.png`, w: 52, h: 107 }

/** Gold ceiling bracket at the canvas top, one per chain, above every link. */
export const RIPS_THIN_CHAIN_BRACKET: ArtSprite = { src: `${ART_DIR}/ChainsBase.png`, w: 161, h: 82 }

/** Dark shadow under/behind the bracket, below every link. */
export const RIPS_THIN_CHAIN_BRACKET_BACK: ArtSprite = { src: `${ART_DIR}/ChainsBaseBack.png`, w: 83, h: 37 }

/** Height of the decoration zone above the box (art px) = the tallest part. All three parts stand
 *  with their bottom edge on the box's top edge. */
export const TOP_DECORATION_HEIGHT = RIPS_THIN_TOP_MIDDLE.h

/** How far (art px) the strip tucks UNDER each side piece: the strip's left edge sits at
 *  `(RIPS_THIN_TOP_SIDE.w − STRIP_UNDERLAP) · s` from the box's left edge, and mirror on the right. */
export const STRIP_UNDERLAP = 58

/**
 * Centre of the ring on ResultsThinTopPartSide.png, as fractions of the sprite's width/height —
 * where each chain hangs from. Measured by alpha scan of the PNG: the ring's hole spans x 166–198
 * and y 22–45 (of 321×144), so its centre is ≈ (182, 34); the ring's outer edge spans x 142–223
 * and starts at y 2. On the mirrored right piece the same fraction is measured from the box's
 * RIGHT edge. MUST be re-measured if the side art is replaced.
 */
export const CHAIN_ANCHOR = { x: 182 / 322, y: 30 / 144 } as const

/** Vertical overlap between consecutive chain links (art px): each link is placed
 *  `(RIPS_THIN_CHAIN_LINK.h − CHAIN_LINK_OVERLAP) · s` above the one below and drawn over its top. */
export const CHAIN_LINK_OVERLAP = 27

/**
 * Where ChainsBaseBack's top edge sits below the BRACKET's top edge (art px). 62 = bottom-aligned
 * with the bracket's sprite (99 − 37). Bigger = shadow lower. The bracket is full width only in its upper half and narrows to a
 * ~15px tip at y≈84–90 of 99, so with this offset the shadow's wings show beside that tip and its
 * lower rows show just below it — at top = 0 the shadow would be hidden entirely behind the
 * bracket's wide upper part.
 */
export const CHAIN_BRACKET_BACK_TOP = 40

/** Horizontal shift of ChainsBaseBack relative to the bracket (art px). 0 = both centred on the
 *  chain. Positive moves the LEFT shadow right; the right one moves left (mirror). */
export const CHAIN_BRACKET_BACK_X = 0

// registry.ts's `preload` list for the `resultsThin` entry — static art only (ADDING_AN_ELEMENT.md
// §2). The decoration sprites are included whatever `topDecoration` is set to, for the same reason
// the rips art is preloaded whatever the style: the toggle is a config edit, and the layout page
// only preloads on load/stage change — six small PNGs.
export const RIPS_RESULTS_THIN_PRELOAD: string[] = [
    RIPS_THIN_BOARD_SRC,
    RIPS_THIN_CELL_SRC,
    RIPS_THIN_TOP_SIDE.src,
    RIPS_THIN_TOP_STRIP.src,
    RIPS_THIN_TOP_MIDDLE.src,
    RIPS_THIN_CHAIN_LINK.src,
    RIPS_THIN_CHAIN_BRACKET.src,
    RIPS_THIN_CHAIN_BRACKET_BACK.src,
]
