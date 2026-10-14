// `dimmer.color` helpers (schema.ts's `dimmer` variant), shared by the element (DimmerElement.tsx)
// and its settings panel (controls/elements/DimmerSettings.tsx) so the two never disagree on what
// the one stored string means. The stored form is `#rrggbbaa`; these split it into the two things
// the panel edits — an `#rrggbb` for the native colour picker (which only speaks 6 digits) and an
// alpha percentage for the slider — and join them back into one string for the write.

import { DEFAULT_DIMMER_COLOR, DIMMER_COLOR_RE } from '../../schema'

/** The stored value as a lower-case 8-digit `#rrggbbaa`: a 6-digit value becomes fully opaque,
 *  anything unparsable (absent, wrong length, junk) becomes DEFAULT_DIMMER_COLOR. The config
 *  validator already rejects junk on load, so the fallback here is for the component's own
 *  defensiveness, not a second validation path. */
export function normalizeDimmerColor(raw: string | undefined): string {
    if (typeof raw !== 'string' || !DIMMER_COLOR_RE.test(raw)) return DEFAULT_DIMMER_COLOR
    const lower = raw.toLowerCase()
    return lower.length === 7 ? `${lower}ff` : lower
}

/** `#rrggbb` + alpha as an integer percentage 0..100 — the two controls' values. */
export function splitDimmerColor(raw: string | undefined): { rgb: string; alphaPct: number } {
    const color = normalizeDimmerColor(raw)
    const alpha = parseInt(color.slice(7, 9), 16)
    return { rgb: color.slice(0, 7), alphaPct: Math.round((alpha / 255) * 100) }
}

/** The inverse of `splitDimmerColor`: one `#rrggbbaa` from the picker's `#rrggbb` and the
 *  slider's percentage (clamped to 0..100 so a stray value can never produce a 3-digit alpha). */
export function joinDimmerColor(rgb: string, alphaPct: number): string {
    const pct = Math.min(100, Math.max(0, Math.round(alphaPct)))
    const alpha = Math.round((pct / 100) * 255)
    const base = /^#[0-9a-f]{6}$/i.test(rgb) ? rgb.toLowerCase() : DEFAULT_DIMMER_COLOR.slice(0, 7)
    return `${base}${alpha.toString(16).padStart(2, '0')}`
}
