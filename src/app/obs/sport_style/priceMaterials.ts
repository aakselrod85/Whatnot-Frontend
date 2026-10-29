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
// tile's background, gold more often and stronger, plus a slow breathing glow on gold.

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
    // Light sweep across the background: which keyframe set (SportPricedBoard.css) and its cycle.
    shine?: {kind: 'gold' | 'silver'; cycleS: number}
}

export const TIER_MATERIALS: Record<Tier, TierMaterial> = {
    // God — polished gold, dark engraved price.
    best: {
        base: ['#fffadf', '#f8dc86', '#e0b44f', '#ffeaa8', '#d6a644', '#ad7e28'],
        sheen: 'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 44%, rgba(255,255,255,0) 58%)',
        mid: [236, 196, 104],
        edge: [92, 62, 10],
        ink: [36, 22, 2],
        inkHighlight: 'rgba(255,246,214,0.8)',
        ring: 'rgba(110,74,12,0.5)',
        panel: 'rgba(120,80,10,0.2)',
        glow: '0 0 12px 2px rgba(255,214,120,0.7), 0 3px 6px rgba(0,0,0,0.55)',
        shine: {kind: 'gold', cycleS: 9},
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
        shine: {kind: 'silver', cycleS: 13},
    },
    // Chaser — matte copper leather, cream price. The red-brown keeps it off the turf green.
    mid: {
        base: ['#c47a46', '#9c5628', '#7a3b16', '#a8622e', '#86461c', '#5a2a0c'],
        sheen: 'radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.28), rgba(0,0,0,0) 70%)',
        mid: [130, 62, 25],
        edge: [248, 228, 196],
        ink: [255, 248, 236],
        inkHighlight: null,
        ring: 'rgba(60,28,6,0.55)',
        panel: 'rgba(0,0,0,0.22)',
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
