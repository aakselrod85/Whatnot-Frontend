'use client'

// A solid band drawn around the sport-style board's painted field — a thin blue edge that can
// expand into a wide "STASH OR PASS" banner. Shared module: the board playground
// (/obs/setup/sport_style/board) renders it today; the board:sport_style element can render the
// same component with `expanded` driven by the `stash_or_pass` event.
//
// Stream-safe by construction: flat fills and hard edges only — no gradients, textures or glows,
// which is what shimmers after Whatnot's compression. The bright outline is chosen for LUMA
// contrast against the dark body (colour-only edges blur away in 4:2:0 chroma subsampling).
//
// Painted UNDER the turf: the outer line and the body are two plain rounded rects larger than the
// field, and the (opaque, field-clipped) turf covers their middle — so there's no ring path to
// build, and the width can animate with an ordinary CSS transition. All coordinates are whole px
// in the same frame as `field` (fieldGeometry.ts's Rect).

import type {CSSProperties} from 'react'
import type {Rect} from './fieldGeometry'

export type FrameMode = 'none' | 'edge'

export interface FrameSettings {
    mode: FrameMode
    /** Band thickness while collapsed (the always-on thin edge), px. */
    edgeWidth: number
    /** Band thickness while expanded (the banner), px. */
    bannerWidth: number
    /** Bright outline on the band's outer rim, px (0 = none). */
    lineWidth: number
    bodyColor: string
    lineColor: string
    text: string
    textColor: string
    stars: boolean
    /** Expand/collapse duration, ms. */
    durationMs: number
}

export const DEFAULT_FRAME: FrameSettings = {
    mode: 'edge',
    edgeWidth: 10,
    bannerWidth: 50,
    lineWidth: 3,
    bodyColor: '#163a8c',
    lineColor: '#7fb2ff',
    text: 'STASH OR PASS',
    textColor: '#ffffff',
    stars: true,
    durationMs: 450,
}

/** Room the frame needs outside the field when fully expanded — reserve at least this much
 *  (the element's `margin` / the playground's margin knob) or the banner gets clipped. */
export function frameReach(frame: FrameSettings): number {
    return frame.mode === 'none' ? 0 : Math.max(frame.edgeWidth, frame.bannerWidth)
}

type Props = {
    field: Rect
    rx: number
    ry: number
    frame: FrameSettings
    expanded: boolean
}

function grown(field: Rect, rx: number, ry: number, by: number): CSSProperties {
    return {
        left: field.x - by,
        top: field.y - by,
        width: field.w + 2 * by,
        height: field.h + 2 * by,
        borderRadius: `${Math.max(0, rx + by)}px / ${Math.max(0, ry + by)}px`,
    }
}

/** Band layers — render BEFORE (under) the turf. */
export function FieldFrameBand({field, rx, ry, frame, expanded}: Props) {
    if (frame.mode === 'none') return null
    const w = Math.round(expanded ? frame.bannerWidth : frame.edgeWidth)
    const line = Math.max(0, Math.min(Math.round(frame.lineWidth), w))
    const transition = `left ${frame.durationMs}ms, top ${frame.durationMs}ms, width ${frame.durationMs}ms, `
        + `height ${frame.durationMs}ms, border-radius ${frame.durationMs}ms`
    const base: CSSProperties = {position: 'absolute', boxSizing: 'border-box', transition, pointerEvents: 'none'}
    return (
        <>
            <div style={{...base, ...grown(field, rx, ry, w), background: frame.lineColor}} />
            <div style={{...base, ...grown(field, rx, ry, w - line), background: frame.bodyColor}} />
        </>
    )
}

/** Banner text — render AFTER (above) the field layers. Fades in once the band has grown, fades
 *  out first when it shrinks. */
export function FieldFrameText({field, frame, expanded}: Props) {
    if (frame.mode === 'none' || !frame.text) return null
    const w = frame.bannerWidth
    const line = Math.min(frame.lineWidth, w)
    // Centre of the band's body (inside the outline), whole px.
    const mid = Math.round(line + (w - line) / 2)
    const fontSize = Math.max(8, Math.round((w - line) * 0.5))
    const cx = Math.round(field.x + field.w / 2)
    const cy = Math.round(field.y + field.h / 2)
    const fade = Math.round(frame.durationMs * 0.5)
    const label = frame.stars ? `★ ${frame.text} ★` : frame.text
    const common: CSSProperties = {
        position: 'absolute',
        left: 0,
        top: 0,
        whiteSpace: 'nowrap',
        lineHeight: 1,
        fontFamily: 'var(--font-exo2), sans-serif',
        fontWeight: 900,
        fontSize,
        letterSpacing: '0.12em',
        color: frame.textColor,
        pointerEvents: 'none',
        opacity: expanded ? 1 : 0,
        transition: `opacity ${fade}ms linear ${expanded ? frame.durationMs - fade : 0}ms`,
    }
    // Each label is centred on its anchor with translate(-50%,-50%) then rotated to run along its
    // side, reading clockwise around the board (bottom/left upside-down/sideways, like a pitch
    // banner). Anchors are whole px; the text itself is vector, so rotation doesn't soften it.
    const at = (x: number, y: number, deg: number): CSSProperties => ({
        ...common,
        transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${deg}deg)`,
    })
    return (
        <>
            <div style={at(cx, field.y - mid, 0)}>{label}</div>
            <div style={at(cx, field.y + field.h + mid, 180)}>{label}</div>
            <div style={at(field.x - mid, cy, -90)}>{frame.text}</div>
            <div style={at(field.x + field.w + mid, cy, 90)}>{frame.text}</div>
        </>
    )
}
