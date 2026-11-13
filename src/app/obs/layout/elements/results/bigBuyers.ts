// "Big buyers" of a break: buyers with many bought slots, whose nicknames the sports skins of
// `results` (SportsResults.tsx) and `resultsThin` (ThinResultRow.tsx) paint gold. Each skin has
// its own threshold (results/sportsStyle.ts SPORTS_BIG_BUYER_MIN,
// results-thin/sportsStyle.ts SPORTS_THIN_BIG_BUYER_MIN).

import {NoCustomer, type Event} from '@/app/entity/entities'

/** Same buyer whatever the letter case or stray spaces the nickname was typed with. */
export function buyerKey(customer: string): string {
    return customer.trim().toLowerCase()
}

/** Buyers (as buyerKey) with at least `min` bought slots in `events` (one break). Only real
 *  purchases count: unsold spots ('' / NoCustomer) and giveaways are skipped. */
export function bigBuyers(events: Event[], min: number): Set<string> {
    const counts = new Map<string, number>()
    for (const e of events) {
        const key = buyerKey(e.customer)
        if (key === '' || e.customer === NoCustomer || e.is_giveaway) continue
        counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const out = new Set<string>()
    counts.forEach((n, key) => {
        if (n >= min) out.add(key)
    })
    return out
}
