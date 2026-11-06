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
//   outermost strip of the content and hides the art's transparent outer pixels.
// 'sports' — the same art recipe with sportsAssets.ts (blue twill + gold/green frame whose drop
//   shadow is pushed out onto the background). Both go through `ArtFrame` below. `frameWidth` is ignored in this style (the band is the art's
//   own thickness), and there is no black fill, no gradient and no inner rule. See `ripsGeometry`
//   below for how the two boxes come from `borders`.
//
// In both styles everything inside the hole is left fully transparent so the board (and
// everything else) underneath stays visible. Boxless (`hasBox: false` in registry.ts) — always
// the whole canvas — and its `z` still flips it above/below the rest of the layout via
// FrameSettings.tsx's toggle.

import type { ElementProps } from '../../registry'
import { resolveBorders, resolveFrameWidth } from '../../config'
import type { FrameStyle, Sides } from '../../schema'
import { CANVAS } from '../../schema'
import { RIPS_FRAME_ASSETS, RIPS_FRAME_OVERLAP, RIPS_FRAME_SLICE } from './ripsAssets'
import { SPORTS_FRAME_ASSETS, SPORTS_FRAME_GOLD_OFFSET, SPORTS_FRAME_OVERLAP, SPORTS_FRAME_SLICE } from './sportsAssets'
import './FrameElement.css'

// The drifting gradient layer is three canvases wide so it still covers the canvas at both ends of
// its one-loop slide — see the geometry note in FrameElement.css.
const DRIFT_SPAN = CANVAS.w * 3

// Fixed black rule on the INNER side of the gradient frame — the edge that meets the board, where
// it has something to read against (on the outer side it would just abut the black fill). Not a
// setting: it is what stops the gradient bleeding straight into the content behind the frame.
const INNER_RULE_PX = 2

// The art-based styles ('rips', 'sports') share one renderer; a skin is just the files and the
// numbers measured off them (ripsAssets.ts, sportsAssets.ts).
//   - `slice`   — 9-slice inset in art px, also the drawn border width (art at native scale);
//   - `offset`  — per side, how far in from the art edge the opaque frame begins (the art's own
//                 drop shadow, if any — zero for rips). The frame box is pushed OUT by this much
//                 so a shadow falls on the background, not on the content;
//   - `overlap` — how far the frame's opaque edge laps over the background past the hole.
type ArtSkin = { back: string; gold: string; slice: number; offset: Sides; overlap: number }

const ZERO_SIDES: Sides = { top: 0, right: 0, bottom: 0, left: 0 }

const ART_SKINS: Record<Exclude<FrameStyle, 'default'>, ArtSkin> = {
    rips: {
        back: RIPS_FRAME_ASSETS.back.src,
        gold: RIPS_FRAME_ASSETS.gold.src,
        slice: RIPS_FRAME_SLICE,
        offset: ZERO_SIDES,
        overlap: RIPS_FRAME_OVERLAP,
    },
    sports: {
        back: SPORTS_FRAME_ASSETS.back.src,
        gold: SPORTS_FRAME_ASSETS.gold.src,
        slice: SPORTS_FRAME_SLICE,
        offset: SPORTS_FRAME_GOLD_OFFSET,
        overlap: SPORTS_FRAME_OVERLAP,
    },
}

// Clamp for the art styles' cut-out so the hole always exists AND the band fits inside it: if the
// two opposite borders leave less than `holeMin` for the hole in an axis they are scaled down
// proportionally. Within range the values pass through untouched, so this never moves a sane
// setting. Deliberately small — there is no "no cut-out" toggle, a frame with no hole is a frame
// covering the content.
//
// The minimum is two slices plus 1px: the frame is drawn (mostly) INSIDE the hole (see
// artGeometry), so a hole narrower than that would make the 9-slice box smaller than its own
// corners, and CSS would squash them.
function clampPair(a: number, b: number, extent: number, holeMin: number): [number, number] {
    const maxSum = extent - holeMin
    const sum = a + b
    if (sum <= maxSum) return [a, b]
    const k = maxSum / sum
    return [a * k, b * k]
}

function clampHole(borders: Sides, holeMin: number): Sides {
    const [left, right] = clampPair(borders.left, borders.right, CANVAS.w, holeMin)
    const [top, bottom] = clampPair(borders.top, borders.bottom, CANVAS.h, holeMin)
    return { top, right, bottom, left }
}

// Art-style geometry, all in canvas px (insets from the canvas edges):
//   - hole  = the canvas minus the (clamped) borders — the one transparent cut-out in the
//     background;
//   - frame = the hole grown OUTWARDS by `offset + overlap` on each side. Its border box is the
//     9-slice, so the opaque frame starts `overlap` px outside the hole and otherwise sits inside
//     the cut-out (the chosen look — the frame sits on the picture, not on the wall), while any
//     drop shadow painted in the art (`offset`) lands on the background.
function artGeometry(borders: Sides, skin: ArtSkin) {
    const hole = clampHole(borders, skin.slice * 2 + 1)
    const grow = (side: keyof Sides) => hole[side] - skin.offset[side] - skin.overlap
    const frame: Sides = { top: grow('top'), right: grow('right'), bottom: grow('bottom'), left: grow('left') }
    return { hole, frame }
}

function ArtFrame({ borders, skin }: { borders: Sides; skin: ArtSkin }) {
    const { hole, frame } = artGeometry(borders, skin)
    return (
        <div className="frm-root">
            {/* The background, stretched over the whole canvas. Its padding is the hole's insets
                and FrameElement.css masks the layer down to exactly that padding ring (the same
                border-box-minus-content-box mask as `.frm-mat`), so the content box — the hole —
                is fully transparent. */}
            <div
                className="frm-rips-marble"
                style={{
                    backgroundImage: `url(${skin.back})`,
                    paddingTop: hole.top,
                    paddingRight: hole.right,
                    paddingBottom: hole.bottom,
                    paddingLeft: hole.left,
                }}
            />
            {/* The frame: a 9-slice border on the hole grown by offset + overlap. Slice and width
                come from the skin; repeat lives in FrameElement.css. */}
            <div
                className="frm-rips-gold"
                style={{
                    borderImageSource: `url(${skin.gold})`,
                    borderImageSlice: skin.slice,
                    borderImageWidth: `${skin.slice}px`,
                    borderWidth: skin.slice,
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
    // `borders` is the surround's reach in from each screen edge in every style — resolved once,
    // here, so the art styles' cut-out honours per-stage overrides exactly as the default fill does.
    const fill = resolveBorders(element, phase)

    const style = element.style ?? 'default'
    if (style !== 'default') return <ArtFrame borders={fill} skin={ART_SKINS[style]} />

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
