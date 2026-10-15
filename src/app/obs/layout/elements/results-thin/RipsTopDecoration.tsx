'use client'

// The 'rips' style's decoration ABOVE the `resultsThin` box — outside it. ThinResults.tsx mounts
// this (as a sibling of `.rest-frame` under `.rest-root`) only for the rips style with the
// element's `topDecoration` on. It draws a marble ledge with a laurel medallion standing on the
// box's top edge, and two chains rising from the ledge's rings to brackets at the top of the
// canvas. EVERY number (file, sprite size, anchor, overlap) lives in ripsStyle.ts; this file only
// scales and places sprites. Nothing here is interactive (`pointer-events: none` on the layer,
// ThinResultsRips.css) so the builder is not affected.
//
// Coordinates are the element's own: absolute px inside `.rest-root`, so local (0,0) is the box's
// top-left and canvas y = box.y + local y — the canvas top is local y = -box.y. Negative offsets
// are fine: the registry entry is `unclipped`, so ElementFrame does not clip, and `.rest-root`
// has no overflow rule (only `.rest-frame` clips, and this layer is outside it).
//
// Layering — z-index inside `.rest-deco`, lowest first:
//   1      strip        ResultsThinTopPart, stretched between the side pieces and tucked
//                       STRIP_UNDERLAP under each of them
//   2      side pieces  ResultsThinTopPartSide at natural size, the right one mirrored
//   3      middle       ResultsThinTopPartMiddle at natural size, centred on the box
//   4      bracket backs (ChainsBaseBack) — the shadow under each bracket, below every link
//   5…     chain links, bottom link first; each link is one layer above the one below it so the
//          upper link is drawn over the lower one's top (CHAIN_LINK_OVERLAP)
//   last   brackets (ChainsBase) at the canvas top, above all links
// Link count is derived from box.y so the top link always passes the canvas top; brackets are
// drawn even when the box is so high that no link fits.

import type {CSSProperties} from 'react'
import type {Box} from '../../schema'
import {
    CHAIN_ANCHOR,
    CHAIN_BRACKET_BACK_TOP,
    CHAIN_BRACKET_BACK_X,
    CHAIN_LINK_OVERLAP,
    DECORATION_SCALE,
    MIDDLE_OFFSET_Y,
    RIPS_THIN_CHAIN_BRACKET,
    RIPS_THIN_CHAIN_BRACKET_BACK,
    RIPS_THIN_CHAIN_LINK,
    RIPS_THIN_TOP_MIDDLE,
    RIPS_THIN_TOP_SIDE,
    RIPS_THIN_TOP_STRIP,
    STRIP_UNDERLAP,
} from './ripsStyle'

type Sprite = {
    key: string
    src: string
    // Element-local px (see file header).
    x: number
    y: number
    w: number
    h: number
    z: number
    mirror?: boolean
}

// Z layers of the fixed parts; the chains start above them (see file header).
const Z_STRIP = 1
const Z_SIDE = 2
const Z_MIDDLE = 3
const Z_BRACKET_BACK = 4
const Z_FIRST_LINK = 5

export function RipsTopDecoration({box}: {box: Box}) {
    // Fixed art-px -> canvas-px scale (ripsStyle.ts DECORATION_SCALE): the parts never resize
    // with the box, they only move; only the strip's width follows box.w.
    const s = DECORATION_SCALE
    const side = RIPS_THIN_TOP_SIDE
    const strip = RIPS_THIN_TOP_STRIP
    const middle = RIPS_THIN_TOP_MIDDLE
    const link = RIPS_THIN_CHAIN_LINK
    const bracket = RIPS_THIN_CHAIN_BRACKET
    const back = RIPS_THIN_CHAIN_BRACKET_BACK

    const sprites: Sprite[] = []

    // --- Ledge: all three parts stand with their bottom edge on the box's top edge (local y = 0).
    const stripLeft = (side.w - STRIP_UNDERLAP) * s
    sprites.push({
        key: 'strip',
        src: strip.src,
        x: stripLeft,
        y: -strip.h * s,
        w: Math.max(0, box.w - 2 * stripLeft),
        h: strip.h * s,
        z: Z_STRIP,
    })
    sprites.push({key: 'side-l', src: side.src, x: 0, y: -side.h * s, w: side.w * s, h: side.h * s, z: Z_SIDE})
    sprites.push({
        key: 'side-r',
        src: side.src,
        x: box.w - side.w * s,
        y: -side.h * s,
        w: side.w * s,
        h: side.h * s,
        z: Z_SIDE,
        mirror: true,
    })
    sprites.push({
        key: 'middle',
        src: middle.src,
        x: (box.w - middle.w * s) / 2,
        y: (-middle.h + MIDDLE_OFFSET_Y) * s,
        w: middle.w * s,
        h: middle.h * s,
        z: Z_MIDDLE,
    })

    // --- Chains. The anchor is the ring centre on each side piece (CHAIN_ANCHOR, a fraction of
    // the sprite): same y for both; x measured from the box's left edge for the left piece and,
    // because that piece is mirrored, from the box's right edge for the right one.
    const anchorY = -side.h * s + CHAIN_ANCHOR.y * side.h * s
    const anchorXs = [CHAIN_ANCHOR.x * side.w * s, box.w - CHAIN_ANCHOR.x * side.w * s]
    const canvasTop = -box.y
    const linkW = link.w * s
    const linkH = link.h * s
    const step = (link.h - CHAIN_LINK_OVERLAP) * s
    // First link's bottom sits on the anchor; each next one `step` higher. Enough links that the
    // top one extends past the canvas top (canvas y of the anchor is box.y + anchorY).
    const anchorCanvasY = box.y + anchorY
    const linkCount = step > 0 && anchorCanvasY > 0 ? Math.ceil(anchorCanvasY / step) + 1 : 0

    // Link, bracket and shadow are all centred on the anchor x (the chain PNGs are centred on
    // their art). The right chain is placed by the mirrored anchor; the sprites themselves are
    // symmetric, so they are not flipped.
    const bracketTop = canvasTop
    anchorXs.forEach((ax, chain) => {
        const dir = chain === 1 ? -1 : 1
        sprites.push({
            key: `back-${chain}`,
            src: back.src,
            x: ax - (back.w * s) / 2 + dir * CHAIN_BRACKET_BACK_X * s,
            y: bracketTop + CHAIN_BRACKET_BACK_TOP * s,
            w: back.w * s,
            h: back.h * s,
            z: Z_BRACKET_BACK,
        })
        for (let i = 0; i < linkCount; i++) {
            sprites.push({
                key: `link-${chain}-${i}`,
                src: link.src,
                x: ax - linkW / 2,
                y: anchorY - i * step - linkH,
                w: linkW,
                h: linkH,
                z: Z_FIRST_LINK + i,
            })
        }
        sprites.push({
            key: `bracket-${chain}`,
            src: bracket.src,
            x: ax - (bracket.w * s) / 2,
            y: bracketTop,
            w: bracket.w * s,
            h: bracket.h * s,
            z: Z_FIRST_LINK + linkCount,
        })
    })

    return (
        <div className="rest-deco" aria-hidden="true">
            {sprites.map((sp) => {
                const style: CSSProperties = {
                    left: sp.x,
                    top: sp.y,
                    width: sp.w,
                    height: sp.h,
                    zIndex: sp.z,
                    transform: sp.mirror ? 'scaleX(-1)' : undefined,
                }
                // eslint-disable-next-line @next/next/no-img-element -- plain <img>, same as every other layout element
                return <img key={sp.key} className="rest-deco-img" src={sp.src} alt="" draggable={false} style={style} />
            })}
        </div>
    )
}

export default RipsTopDecoration
