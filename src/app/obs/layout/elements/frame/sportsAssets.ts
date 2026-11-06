// Static art for the `frame` element's 'sports' style (schema.ts `FRAME_STYLES`) — the same recipe
// as the 'rips' style (ripsAssets.ts): a background stretched over the canvas with one cut-out, and
// a 9-slice frame drawn inside that cut-out. The art lives in public/images/results/sports, next
// to the results element's sports art.
//
//   - `back` — the opaque blue twill, 941x1672, stretched edge to edge like the rips marble.
//   - `gold` — the gold/green frame, 818x1342 with a transparent centre. Measured (2026-11-06 art):
//     a soft drop shadow ~35px wide OUTSIDE the gold on every side (`SPORTS_FRAME_GOLD_OFFSET`
//     is where the fully opaque gold begins), a gold band ~30px wide, and corner ornaments reaching
//     ~89px in from the art edge. The plaques in the middle of each side sit in the stretched part
//     of the 9-slice, so they stretch with the hole (chosen deliberately — no centre-pinned insert).
//
// Re-measure the constants below if the frame art is replaced.

import type { Sides } from '../../schema'

export const SPORTS_FRAME_ASSETS = {
    back: { src: '/images/results/sports/FrameBackfround.png', w: 941, h: 1672 },
    gold: { src: '/images/results/sports/Frame.png', w: 818, h: 1342 },
} as const

// 9-slice inset, in art px, on all four sides: must cover shadow + gold + corner ornament (~89px).
// Also the drawn border width, so the art renders 1:1.
export const SPORTS_FRAME_SLICE = 96

// Distance from each art edge to the first fully opaque gold pixel — i.e. the drop shadow's width.
// The frame box is pushed out by this much so the shadow falls on the background, not the content.
export const SPORTS_FRAME_GOLD_OFFSET: Sides = { top: 35, right: 33, bottom: 35, left: 37 }

// How far the gold's outer edge laps over the background past the cut-out (same idea as
// RIPS_FRAME_OVERLAP), so no sliver of content shows between background and gold.
export const SPORTS_FRAME_OVERLAP = 3

export const SPORTS_FRAME_PRELOAD: string[] = [SPORTS_FRAME_ASSETS.back.src, SPORTS_FRAME_ASSETS.gold.src]
