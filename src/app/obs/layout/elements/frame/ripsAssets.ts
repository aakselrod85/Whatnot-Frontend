// Static art for the `frame` element's 'rips' style (schema.ts `FRAME_STYLES`), following the
// other elements' asset-manifest convention (price-sign/assets.ts, cards/frameAssets.ts). Both
// files live in public/images/static/rips and must not be moved — public/images/rips_board holds
// unrelated scenes' art.
//
//   - `back` — the opaque marble surround, 941x1672. The canvas is 1080x1920 (schema.ts `CANVAS`),
//     so it is simply stretched edge to edge: the aspect ratios differ by under 0.1%, which is not
//     worth a cover/crop. FrameElement.tsx masks one rectangular cut-out (the resolved `borders`)
//     out of it so content underneath stays fully visible.
//   - `gold` — the gold frame, 1080x1080 with a fully transparent centre. Measured (2026-10-16
//     art): ornamented corners reaching ~64px in from each edge; top/bottom band 16px flush with
//     the edge; left/right band 20px with a 5px fully transparent strip OUTSIDE it. Drawn as a CSS
//     9-slice (`border-image`, slice = `RIPS_FRAME_SLICE`, stretch) so the corners stay native and
//     only the straight runs between them stretch to the hole size.
//
// Re-measure both constants below if the gold art is replaced.

export const RIPS_FRAME_ASSETS = {
    back: { src: '/images/static/rips/BackFlat.png', w: 941, h: 1672 },
    gold: { src: '/images/static/rips/FrameForTheMarble.png', w: 1080, h: 1080 },
} as const

// 9-slice inset, in px of the art, equal on all four sides: everything within this distance of a
// corner is drawn 1:1 and never stretched, so it must cover the whole corner ornament (~64px).
// Also used as the drawn border width, so the art renders at native scale. Not a setting
// (obs-layout-plan.md §2.5 rips subsection): the only geometry the operator moves is `borders`.
export const RIPS_FRAME_SLICE = 64

// How far the gold frame's outer edge reaches OUT past the cut-out, over the marble, in canvas px.
// Hides the art's transparent/anti-aliased outer pixels so no sliver of content shows between the
// marble and the gold. Note the left/right sides have 5 transparent px in the art, so at 3 a 2px
// gap can remain there; raise this to 5 if it does.
export const RIPS_FRAME_OVERLAP = 3

// registry.ts's `preload` list for `frame:static` — preloaded whatever style the element is on,
// for the same reason as the results element's rips art (a style switch is a config edit, and the
// layout page only preloads on load/stage change; two PNGs is cheap). The default style has no art.
export const RIPS_FRAME_PRELOAD: string[] = [RIPS_FRAME_ASSETS.back.src, RIPS_FRAME_ASSETS.gold.src]
