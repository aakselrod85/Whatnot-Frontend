// Static art for the `frame` element's 'rips' style (schema.ts `FRAME_STYLES`), following the
// other elements' asset-manifest convention (price-sign/assets.ts, cards/frameAssets.ts). Both
// files live in public/images/static/rips and must not be moved — public/images/rips_board holds
// unrelated scenes' art.
//
//   - `back` — the opaque marble surround, 941x1672. The canvas is 1080x1920 (schema.ts `CANVAS`),
//     so it is simply stretched edge to edge: the aspect ratios differ by under 0.1%, which is not
//     worth a cover/crop. FrameElement.tsx masks one rectangular cut-out (the resolved `borders`)
//     out of it so content underneath stays fully visible.
//   - `gold` — the gold frame, 1080x1080 with a fully transparent centre and an opaque border
//     exactly `RIPS_FRAME_BAND` px thick on every side, square corners. Drawn as a CSS 9-slice
//     (`border-image`, slice = band, stretch) around the cut-out, so it fits any hole size with
//     its native 16x16 corners.
//
// Re-measure `RIPS_FRAME_BAND` if the gold art is replaced: it is both the slice inset and the
// drawn border width, and the frame is positioned so its inner edge coincides with the hole edge.

export const RIPS_FRAME_ASSETS = {
    back: { src: '/images/static/rips/BackFlat.png', w: 941, h: 1672 },
    gold: { src: '/images/static/rips/FrameForTheMarble.png', w: 1080, h: 1080 },
} as const

// Thickness of the gold band in the art, in px. Not a setting (obs-layout-plan.md §2.5 rips
// subsection): the frame is always this wide, so the only geometry the operator moves is `borders`.
export const RIPS_FRAME_BAND = 16

// registry.ts's `preload` list for `frame:static` — preloaded whatever style the element is on,
// for the same reason as the results element's rips art (a style switch is a config edit, and the
// layout page only preloads on load/stage change; two PNGs is cheap). The default style has no art.
export const RIPS_FRAME_PRELOAD: string[] = [RIPS_FRAME_ASSETS.back.src, RIPS_FRAME_ASSETS.gold.src]
