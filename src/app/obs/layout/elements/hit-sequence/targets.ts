// Board variants that publish the anchors the hitSequence element needs (`ball`, `cell:<eventId>`)
// and honour its `ball-visible` / `reveal-sold` cues. One predicate so the element and its
// settings panel cannot drift apart.
import type { Element } from '../../schema'

export const HIT_BOARD_VARIANTS = ['sport_style', 'sport_priced'] as const

export function isHitBoard(el: Element): boolean {
    return el.kind === 'board' && (HIT_BOARD_VARIANTS as readonly string[]).includes(el.variant as string)
}
