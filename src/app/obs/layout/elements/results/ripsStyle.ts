// The 'rips' skin of the `results` element (schema.ts `RESULTS_STYLES`): the art in
// public/images/results/rips and the geometry that art dictates. Everything the skin needs that is
// not plain CSS lives here so swapping art is a one-file change.
//
// All three images are painted in fill mode (`background-size: 100% 100%`) — the frame was drawn
// at 928x1663, the same portrait proportion as the 1080x1920 canvas (CLAUDE.md "OBS layout
// canvas"), so filling the element's default full-canvas box does not distort it.

import type { Tier } from './tiers'

const ART_DIR = '/images/results/rips'

/** Background of the whole element box. Its header already reads "RESULT", so the text title the
 *  default style draws is not rendered in this skin. */
export const RIPS_FRAME_SRC = `${ART_DIR}/ResultFrameAllInOne.png`

/**
 * Where the cell grid lives INSIDE the frame art, as fractions of the box. Measured off
 * ResultFrameAllInOne.png: the RESULT header with its meander band occupies the top ~19%, the
 * gilt border the bottom ~4% and ~5% on either side. MUST be re-measured if the frame is replaced.
 */
export const RIPS_GRID_INSETS = { top: 0.18, right: 0.05, bottom: 0.04, left: 0.05 } as const

/** Art for one cell: the cell background and the plate the buyer's name sits on. */
export type RipsTierArt = { cell: string; name: string }

const SHARED_TIER_ART: RipsTierArt = {
    cell: `${ART_DIR}/CellFrame.png`,
    name: `${ART_DIR}/CellNameFrame.png`,
}

/**
 * One art slot per price-rank tier (tiers.ts). The default style says the rank with the frame
 * colour; this skin says it with the art — but only one gold frame has been delivered so far, so
 * every tier currently points at the same two files. When tiered art arrives only the paths here
 * change; `Record<Tier, …>` makes a tier without art a compile error.
 */
export const RIPS_TIER_ART: Record<Tier, RipsTierArt> = {
    gold: SHARED_TIER_ART,
    silver: SHARED_TIER_ART,
    bronze: SHARED_TIER_ART,
    grey: SHARED_TIER_ART,
}

// registry.ts's `preload` list for the `results` entry — static art only (ADDING_AN_ELEMENT.md
// §2). De-duplicated because every tier shares the same files today.
export const RIPS_RESULTS_PRELOAD: string[] = Array.from(
    new Set([RIPS_FRAME_SRC, ...Object.values(RIPS_TIER_ART).flatMap((a) => [a.cell, a.name])])
)
