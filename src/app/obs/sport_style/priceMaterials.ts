// Per-tier tile materials for `board:sport_priced` (the priced football-field board). The three
// paid tiers take the same metals as the card frames under the board on the priced stream (gold,
// silver, bronze), each with its own ink, so a tier reads from colour AND price ink even after
// stream compression flattens hues. `regular` (Side Card) has no material: it keeps the team's own
// patch colour, so the cheapest tier reads as plain.
//
// Stream-safe by construction: every surface is a broad gradient — no dashed stitch, no repeating
// stripes, no dot/grain tiles (sub-4px patterns crawl and smear under the stream encoder). The edge
// is one solid line.

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
    // Outer glow + drop shadow.
    glow: string
}

export const TIER_MATERIALS: Record<Exclude<Tier, 'regular'>, TierMaterial> = {
    // God — polished gold, dark engraved price.
    best: {
        base: ['#fff3c4', '#ecc970', '#c99b3d', '#f6dc93', '#bf8f33', '#94691f'],
        sheen: 'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 44%, rgba(255,255,255,0) 58%)',
        mid: [217, 173, 85],
        edge: [92, 62, 10],
        ink: [36, 22, 2],
        inkHighlight: 'rgba(255,246,214,0.8)',
        ring: 'rgba(110,74,12,0.5)',
        glow: '0 0 9px 1px rgba(255,208,110,0.55), 0 3px 6px rgba(0,0,0,0.55)',
    },
    // Giant — polished silver lit from the top, navy price.
    good: {
        base: ['#ffffff', '#e4e8ee', '#aab1bc', '#f2f4f7', '#9ca3ae', '#757c87'],
        sheen: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.08) 65%, rgba(255,255,255,0.18) 100%)',
        mid: [200, 205, 213],
        edge: [24, 40, 76],
        ink: [12, 22, 46],
        inkHighlight: 'rgba(255,255,255,0.85)',
        ring: 'rgba(70,78,92,0.45)',
        glow: '0 0 6px rgba(220,236,255,0.35), 0 3px 6px rgba(0,0,0,0.55)',
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
        glow: '0 3px 6px rgba(0,0,0,0.55)',
    },
}
