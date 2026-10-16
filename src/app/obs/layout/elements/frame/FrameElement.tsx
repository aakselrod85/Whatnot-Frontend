'use client'

// The `frame:static` registry component (obs-layout-plan.md §1.7, rewritten in §2.5, 'rips' style
// added in §2.5's rips subsection). Used to render a single `<img>` stretched over the whole
// canvas; now has two skins, picked by `element.style` (schema.ts `FRAME_STYLES`, absent =
// 'default'):
//
// 'default' — code-drawn, as two stacked bands working in from the canvas edge:
//   - plain black fill, per-side and per-stage-resolvable (`resolveBorders` in ../../config.ts,
//     which mirrors `resolveBox`'s `placements[phase] ?? placements.all` rule exactly);
//   - the gradient frame just inside it, one thickness on all four sides (`resolveFrameWidth`),
//     filled with a single canvas-wide diagonal gradient: black at the top-right and bottom-left
//     corners, bronze through the middle. That gradient is global — one gradient across the whole
//     1080x1920 canvas, of which only the frame band is painted — so opposite sides pick up
//     different parts of it instead of each repeating the ramp, and it drifts left to right on a
//     seamless loop (see FrameElement.css for the geometry that makes the loop join invisible).
//
// 'rips' — art-based (ripsAssets.ts): the marble `back` PNG stretched over the whole canvas with
//   ONE rectangular cut-out — the canvas minus the same resolved `borders` — masked out of it, and
//   the gold `gold` PNG drawn as a CSS 9-slice (`RIPS_FRAME_SLICE`) sitting INSIDE that hole —
//   its outer edge `RIPS_FRAME_OVERLAP` px past the hole edge, over the marble, so it covers the
//   outermost strip of the content and hides the art's transparent outer pixels. `frameWidth` is ignored in this style (the band is the art's
//   own thickness), and there is no black fill, no gradient and no inner rule. See `ripsGeometry`
//   below for how the two boxes come from `borders`.
//
// In both styles everything inside the hole is left fully transparent so the board (and
// everything else) underneath stays visible. Boxless (`hasBox: false` in registry.ts) — always
// the whole canvas — and its `z` still flips it above/below the rest of the layout via
// FrameSettings.tsx's toggle.

import type { ElementProps } from '../../registry'
import { resolveBorders, resolveFrameWidth } from '../../config'
import type { Sides } from '../../schema'
import { CANVAS } from '../../schema'
import { RIPS_FRAME_ASSETS, RIPS_FRAME_OVERLAP, RIPS_FRAME_SLICE } from './ripsAssets'
import './FrameElement.css'

// The drifting gradient layer is three canvases wide so it still covers the canvas at both ends of
// its one-loop slide — see the geometry note in FrameElement.css.
const DRIFT_SPAN = CANVAS.w * 3

// Fixed black rule on the INNER side of the gradient frame — the edge that meets the board, where
// it has something to read against (on the outer side it would just abut the black fill). Not a
// setting: it is what stops the gradient bleeding straight into the content behind the frame.
const INNER_RULE_PX = 2

// Clamp for the 'rips' cut-out so the hole always exists AND the band fits inside it: if the two
// opposite borders leave less than `RIPS_HOLE_MIN` for the hole in an axis they are scaled down
// proportionally. Within range the values pass through untouched, so this never moves a sane
// setting. Deliberately small — there is no "no cut-out" toggle, a frame with no hole is a frame
// covering the content.
//
// The minimum is two slices plus 1px: the gold frame is drawn INSIDE the hole (see ripsGeometry),
// so a hole narrower than that would make the 9-slice box smaller than its own corners, and CSS
// would squash them.
const RIPS_HOLE_MIN = RIPS_FRAME_SLICE * 2 + 1

function clampPair(a: number, b: number, extent: number): [number, number] {
    const maxSum = extent - RIPS_HOLE_MIN
    const sum = a + b
    if (sum <= maxSum) return [a, b]
    const k = maxSum / sum
    return [a * k, b * k]
}

function clampHole(borders: Sides): Sides {
    const [left, right] = clampPair(borders.left, borders.right, CANVAS.w)
    const [top, bottom] = clampPair(borders.top, borders.bottom, CANVAS.h)
    return { top, right, bottom, left }
}

// 'rips' geometry, all in canvas px (insets from the canvas edges):
//   - hole  = the canvas minus the (clamped) borders — the one transparent cut-out in the marble;
//   - frame = the hole grown OUTWARDS by `RIPS_FRAME_OVERLAP` on every side. Its border box is the
//     9-slice, so the gold sits inside the cut-out (the chosen look — the frame sits on the
//     picture, not on the wall) except for that thin overlap over the marble, which hides the
//     art's transparent outer pixels. `clampHole` keeps the hole at least two slices wide/tall so
//     the corners never squash.
function ripsGeometry(borders: Sides) {
    const hole = clampHole(borders)
    const frame: Sides = {
        top: hole.top - RIPS_FRAME_OVERLAP,
        right: hole.right - RIPS_FRAME_OVERLAP,
        bottom: hole.bottom - RIPS_FRAME_OVERLAP,
        left: hole.left - RIPS_FRAME_OVERLAP,
    }
    return { hole, frame }
}

function RipsFrame({ borders }: { borders: Sides }) {
    const { hole, frame } = ripsGeometry(borders)
    return (
        <div className="frm-root">
            {/* The marble, stretched over the whole canvas. Its padding is the hole's insets and
                FrameElement.css masks the layer down to exactly that padding ring (the same
                border-box-minus-content-box mask as `.frm-mat`), so the content box — the hole —
                is fully transparent. */}
            <div
                className="frm-rips-marble"
                style={{
                    backgroundImage: `url(${RIPS_FRAME_ASSETS.back.src})`,
                    paddingTop: hole.top,
                    paddingRight: hole.right,
                    paddingBottom: hole.bottom,
                    paddingLeft: hole.left,
                }}
            />
            {/* The gold frame: a 9-slice border on the hole grown by the overlap. Slice and width
                come from ripsAssets.ts (one source of truth); repeat lives in FrameElement.css. */}
            <div
                className="frm-rips-gold"
                style={{
                    borderImageSource: `url(${RIPS_FRAME_ASSETS.gold.src})`,
                    borderImageSlice: RIPS_FRAME_SLICE,
                    borderImageWidth: `${RIPS_FRAME_SLICE}px`,
                    borderWidth: RIPS_FRAME_SLICE,
                    top: frame.top,
                    right: frame.right,
                    bottom: frame.bottom,
                    left: frame.left,
                }}
            />
        </div>
    )
}

export function FrameElement({ element, phase }: ElementProps) {
    if (element.kind !== 'frame') return null
    // `borders` is the surround's reach in from each screen edge in both styles — resolved once,
    // here, so the rips cut-out honours per-stage overrides exactly as the default fill does.
    const fill = resolveBorders(element, phase)

    if ((element.style ?? 'default') === 'rips') return <RipsFrame borders={fill} />

    // Default style: the black fill is `fill`; the frame sits inside it, and the inner rule inside
    // that again — so a side is fill, then frame, then 2px.
    const frameWidth = resolveFrameWidth(element)
    const innerRule = {
        top: fill.top + frameWidth,
        right: fill.right + frameWidth,
        bottom: fill.bottom + frameWidth,
        left: fill.left + frameWidth,
    }

    return (
        <div className="frm-root">
            {/* The black fill outside the frame. Drawn as borders so the four sides mitre
                themselves and a side set to 0 simply disappears. */}
            <div
                className="frm-black"
                style={{
                    inset: 0,
                    borderTopWidth: fill.top,
                    borderRightWidth: fill.right,
                    borderBottomWidth: fill.bottom,
                    borderLeftWidth: fill.left,
                }}
            />
            {/* The gradient frame: inset by the black fill, `frameWidth` thick. The width is fed
                in as padding — FrameElement.css masks `.frm-mat` down to exactly that padding
                ring, so the drifting gradient inside it paints on the frame and nowhere else. */}
            <div
                className="frm-mat"
                style={{
                    top: fill.top,
                    right: fill.right,
                    bottom: fill.bottom,
                    left: fill.left,
                    padding: frameWidth,
                }}
            >
                {/* Sized and offset in canvas units, NOT percentages of the inset ring above, so
                    the gradient stays anchored to the canvas however wide the black fill is. */}
                <div
                    className="frm-drift"
                    style={{
                        width: DRIFT_SPAN,
                        height: CANVAS.h,
                        left: -fill.left,
                        top: -fill.top,
                    }}
                />
            </div>
            {/* The 2px rule closing the frame off on the inside — same bordered-ring trick as the
                fill, inset past the frame and uniform on all four sides. */}
            <div
                className="frm-black"
                style={{
                    top: innerRule.top,
                    right: innerRule.right,
                    bottom: innerRule.bottom,
                    left: innerRule.left,
                    borderWidth: INNER_RULE_PX,
                }}
            />
        </div>
    )
}

export default FrameElement
