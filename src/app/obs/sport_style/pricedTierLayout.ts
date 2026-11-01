// Tier size multipliers and the rect type for the priced board (the solver is pricedFillLayout.ts).
import type {Tier} from '../layout/elements/board-cobra/pricing'

export const PRICED_TIER_SCALE: Record<Tier, number> = {best: 1.2, good: 1.1, mid: 1, regular: 1}
export type PricedRect = {x: number; y: number; w: number; h: number}
