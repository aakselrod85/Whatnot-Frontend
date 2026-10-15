'use client'

// The `dimmer` registry component (schema.ts's `dimmer` variant): one rectangle in one colour,
// nothing else. Boxless (registry.ts `hasBox: false`), so the layout page mounts it full-canvas —
// `box` is always the whole 1080x1920 surface and the root just fills it. The colour comes
// straight from the config (`#rrggbbaa`, alpha included — see dimmerColor.ts), so this reads
// nothing from useLayoutData(): there is no break/stream data a tint could depend on.
//
// What makes it useful is its `z`: the layout page's browser source is transparent wherever
// nothing is painted, so a tint at the bottom of the stack darkens the OBS camera under the page
// while every element above it stays untouched. Where it sits is the operator's Layer input,
// nothing here.

import type { ElementProps } from '../../registry'
import { normalizeDimmerColor } from './dimmerColor'
import './DimmerElement.css'

export function DimmerElement({ element }: ElementProps) {
    if (element.kind !== 'dimmer') return null

    return <div className="dimmer-root" style={{ background: normalizeDimmerColor(element.color) }} />
}

export default DimmerElement
