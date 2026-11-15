import type {CSSProperties} from 'react'
import type {RipsTier} from './ripsOrder'

const ROOT = '/images/rips_tiles/doric'
export const DORIC_MARBLE = `${ROOT}/marble.png`
export const DORIC_LIMESTONE = `${ROOT}/limestone.png`
export const DORIC_FRAME: Record<RipsTier, string> = {
    1: `${ROOT}/gold-frame.png`,
    2: `${ROOT}/silver-frame.png`,
    3: `${ROOT}/bronze-frame.png`,
}
export const DORIC_PRELOAD = [...Object.values(DORIC_FRAME), DORIC_MARBLE, DORIC_LIMESTONE]

// Approved artwork is 1254px square, but its transparent padding differs by tier.
// Both CSS and WebGL use these bounds to fit the same 1.5%–98.5% outer box.
export const DORIC_SOURCE_SIZE = 1254
export const DORIC_INSET = 0.015
export const DORIC_SPAN = 1 - 2 * DORIC_INSET
export const DORIC_BOUNDS: Record<RipsTier, readonly [number, number, number, number]> = {
    1: [8, 8, 1246, 1238],
    2: [12, 16, 1242, 1220],
    3: [5, 4, 1248, 1242],
}
export const DORIC_OUTLINE = 'polygon(21.8% 1.5%,78.2% 1.5%,98.5% 21.8%,98.5% 78.2%,78.2% 98.5%,21.8% 98.5%,1.5% 78.2%,1.5% 21.8%)'
export function doricFrameStyle(tier: RipsTier): CSSProperties {
    const [l, t, r, b] = DORIC_BOUNDS[tier]
    return {
        left: `${(DORIC_INSET - l * DORIC_SPAN / (r - l)) * 100}%`,
        top: `${(DORIC_INSET - t * DORIC_SPAN / (b - t)) * 100}%`,
        width: `${DORIC_SOURCE_SIZE * DORIC_SPAN / (r - l) * 100}%`,
        height: `${DORIC_SOURCE_SIZE * DORIC_SPAN / (b - t) * 100}%`,
    }
}
