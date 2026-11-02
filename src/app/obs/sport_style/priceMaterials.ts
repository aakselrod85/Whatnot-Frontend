// Per-tier tile materials for `board:sport_priced` (the priced football-field board). The three
// paid tiers take the same metals as the card frames under the board on the priced stream (gold,
// silver, bronze), each with its own ink, so a tier reads from colour AND price ink even after
// stream compression flattens hues. `regular` (Side Card) is ONE plain matte chalk for every team —
// no metal, no team colour — so the cheapest tier reads as plain and the board stays calm.
//
// Stream-safe by construction: every surface is a broad gradient — no dashed stitch, no repeating
// stripes, no dot/grain tiles (sub-4px patterns crawl and smear under the stream encoder). The edge
// is one solid line.
//
// Brightness ranks with value: gold and silver are the brightest tiles on the board, copper sits
// below them, and the Side Card chalk is dimmed so the paid tiers pop against it. Gold and silver
// also carry a `shine` (PricePatchCell / SportPricedBoard.css): a soft light band crossing the
// tile's background for silver, continuous overlapping champagne sweeps and a strong amber halo for gold.

import type {RGB} from './patchColors'
import type {Tier} from '@/app/obs/layout/elements/board-cobra/pricing'

export interface TierMaterial {
    // Body gradient stops, light→dark, laid at 135deg.
    base: string[]
    // One broad highlight laid over the body: what makes gold read polished and copper matte.
    sheen: string
    // The flattest body colour — what the price ink is contrast-checked against.
    mid: RGB
    // Solid edge line and the price ink.
    edge: RGB
    ink: RGB
    // Light emboss under the price (dark ink on bright metal) or null for a dark drop shadow.
    inkHighlight: string | null
    // The band between the tile edge and the edge line.
    ring: string
    // Tint over the logo section, so it reads as its own panel next to the price.
    panel: string
    // Outer glow + drop shadow.
    glow: string
    // Tier motion (continuous gold sweeps / occasional silver sweep): keyframe set and cycle.
    shine?: {kind: 'gold' | 'silver'; cycleS: number}
}

export const TIER_MATERIALS: Record<Tier, TierMaterial> = {
    // God — polished gold, dark engraved price.
    best: {
        base: ['#fff0ad', '#ffdf70', '#f5c845', '#ffe893', '#f5cb53', '#eebc38'],
        sheen: 'linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0) 32%, rgba(255,255,255,0) 72%, rgba(155,90,0,0.12))',
        mid: [245, 203, 83],
        edge: [109, 67, 4],
        ink: [23, 16, 3],
        inkHighlight: 'rgba(255,246,214,0.8)',
        ring: '#e39700',
        panel: 'rgba(158,98,0,0.09)',
        glow: '0 0 0 2px #fff2a0, 0 0 0 3px #713600, 0 0 14px 7px rgba(255,194,0,0.95), 0 0 28px 10px rgba(255,139,0,0.65), 0 5px 8px rgba(0,0,0,0.85)',
        shine: {kind: 'gold', cycleS: 3.2},
    },
    // Giant — polished silver lit from the top, navy price.
    good: {
        base: ['#ffffff', '#eef1f5', '#bfc6d0', '#f9fafc', '#b2b9c3', '#8b929d'],
        sheen: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.08) 65%, rgba(255,255,255,0.18) 100%)',
        mid: [216, 221, 228],
        edge: [24, 40, 76],
        ink: [12, 22, 46],
        inkHighlight: 'rgba(255,255,255,0.85)',
        ring: 'rgba(70,78,92,0.45)',
        panel: 'rgba(40,52,80,0.14)',
        glow: '0 0 8px 1px rgba(225,238,255,0.5), 0 3px 6px rgba(0,0,0,0.55)',
        shine: {kind: 'silver', cycleS: 7},
    },
    // Chaser — matte copper, dark price; the same ink hierarchy as gold/silver.
    mid: {
        base: ['#dba77d', '#c38b60', '#b87c51', '#cc9368', '#bd8155', '#b77a4e'],
        sheen: 'radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.28), rgba(0,0,0,0) 70%)',
        mid: [195, 139, 96],
        edge: [91, 48, 25],
        ink: [35, 20, 10],
        inkHighlight: 'rgba(255,227,197,0.5)',
        ring: 'rgba(60,28,6,0.55)',
        panel: 'rgba(92,44,17,0.1)',
        glow: '0 3px 6px rgba(0,0,0,0.55)',
    },
    // Side Card — flat warm chalk, same for every team, dimmed so the paid tiers outshine it. Warm
    // and matte so it never reads as silver.
    regular: {
        base: ['#cfc7b6', '#c4bba8', '#b8ae9a'],
        sheen: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 60%)',
        mid: [196, 187, 168],
        edge: [74, 66, 54],
        ink: [30, 27, 22],
        inkHighlight: 'rgba(255,255,255,0.35)',
        ring: 'rgba(60,50,35,0.14)',
        panel: 'rgba(70,58,38,0.1)',
        glow: '0 2px 4px rgba(0,0,0,0.5)',
    },
}
