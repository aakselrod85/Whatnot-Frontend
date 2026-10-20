import type {SeriesPriceRange} from '@/app/entity/entities'

export function formatRange(priceFrom: number, priceTo: number | null): string {
    return priceTo === null ? `$${priceFrom}+` : `$${priceFrom}–$${priceTo}`
}

// A non-empty label replaces the formatted prices everywhere a range row is shown.
export function rangeLabel(r: SeriesPriceRange): string {
    return (r.label ?? '').trim() || formatRange(r.price_from, r.price_to)
}
