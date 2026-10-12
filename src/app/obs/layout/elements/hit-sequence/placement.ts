// Where a hit-sequence video is drawn (hit-sequence-plan.md §3.5). Pure — no React, no DOM.
//
// Videos are placed by a PIVOT (where the ball is inside the file at the frame that must line up
// with the board) rather than by their rectangle: the fly-in's ball starts near the top of a
// full-frame video and the fall's ends on a cell somewhere in the frame, so a rectangle-on-anchor
// model would force the operator to tune an offset by eye on every board width. With
// `match: 'size'` the hand-off from board ball to video ball is pixel-exact on any board width.
import type { Box, VideoPlacement, VideoVariant } from '../../schema'
import type { Shape } from '../../anchors'

export type VideoMeta = { w: number; h: number } // the file's native size, from loadedmetadata

type PivotAnchors = { ball?: Shape; cell?: Shape }

/**
 * Picks the variant for this run (plan §3.5 "Variant choice"): eligible = `when` holds
 * (`always` always; `cellLeftOfBall` iff the cell centre x < the ball centre x; `cellRightOfBall`
 * the opposite, equal counts as right). A missing `cell` or `ball` anchor leaves only `always`
 * variants eligible. Uniform random among the eligible; none eligible -> the first variant.
 */
export function chooseVariant(variants: VideoVariant[], anchors: PivotAnchors, rnd: () => number = Math.random): VideoVariant {
    const cx = anchors.cell ? anchors.cell.x + anchors.cell.w / 2 : undefined
    const bx = anchors.ball ? anchors.ball.x + anchors.ball.w / 2 : undefined
    const known = cx !== undefined && bx !== undefined
    const eligible = variants.filter((v) => {
        if (v.when === 'always') return true
        if (!known) return false
        return v.when === 'cellLeftOfBall' ? cx < bx : cx >= bx
    })
    if (eligible.length === 0) return variants[0]
    return eligible[Math.min(eligible.length - 1, Math.floor(rnd() * eligible.length))]
}

/**
 * The rectangle (canvas px) to draw `variant`'s video in. `screen` mode is exactly the canvas;
 * `pivot` mode scales the whole frame uniformly by k and lands the variant's pivot on the target
 * anchor's centre, plus the offset. A missing anchor falls back to the target board's box (centre,
 * shorter side as diameter) with one `log` line.
 */
export function videoRect(
    placement: VideoPlacement,
    variant: VideoVariant,
    meta: VideoMeta,
    anchors: { screen: Shape; ball?: Shape; cell?: Shape; box?: Shape },
    log: (message: string) => void = () => {}
): Box {
    if (placement.mode === 'screen') {
        const s = anchors.screen
        return { x: s.x, y: s.y, w: s.w, h: s.h }
    }
    const pivot = variant.pivot
    if (!pivot || !(pivot.d > 0)) {
        log(`variant "${variant.label ?? variant.id}" has no usable pivot, playing at screen`)
        const s = anchors.screen
        return { x: s.x, y: s.y, w: s.w, h: s.h }
    }
    let target = placement.anchor === 'ball' ? anchors.ball : anchors.cell
    if (!target) {
        log(`anchor "${placement.anchor}" missing, falling back to the board box`)
        target = anchors.box ?? anchors.screen
    }
    const cx = target.x + target.w / 2
    const cy = target.y + target.h / 2
    const k = placement.match === 'size' ? (Math.min(target.w, target.h) * placement.sizeFactor) / pivot.d : placement.scale
    return {
        x: cx - pivot.x * k + placement.offset.dx,
        y: cy - pivot.y * k + placement.offset.dy,
        w: meta.w * k,
        h: meta.h * k,
    }
}
