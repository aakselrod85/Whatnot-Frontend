// Static asset manifest for the `priceSign` element (obs-price-sign-plan.md §2), mirroring
// the other elements' asset manifests' convention: every art layer reads its own `{src, w, h}` from here.
// All numbers below were measured on the images after `scripts/trim_canvas.py --solidify 200`
// and MUST be re-measured (sizes and the badge square) if the art is replaced.

export type SignAsset = { src: string; w: number; h: number }

export const SIGN_ASSETS = {
    pedestal: { src: '/images/sign/MiddlePedestal.png', w: 480, h: 145 },
    tablo: { src: '/images/sign/MiddleStoneTablo.png', w: 401, h: 112 },
} satisfies Record<string, SignAsset>

// The tablo's native width relative to the pedestal's.
export const TABLO_WIDTH_RATIO = SIGN_ASSETS.tablo.w / SIGN_ASSETS.pedestal.w

// The carved badge square (outline included) as 0..1 fractions of the tablo's own size
// (measured: x 295..382, y 13..96 of 401x112).
export const TABLO_BADGE = { x0: 295 / 401, x1: 383 / 401, y0: 13 / 112, y1: 97 / 112 }

// Where the flat face starts, past the light bevel on the tablo's left (measured: x 10 of 401).
const TABLO_FACE_X0 = 10 / 401

// Text column for the range label, as fractions of the tablo width: the same margin from the face's
// left edge and from the badge, and the label is centred in it, so both gaps are equal.
export const TABLO_LABEL = { x0: TABLO_FACE_X0 + 0.02, x1: TABLO_BADGE.x0 - 0.02 }

// The tablo's solid rows, as fractions of its height (measured: rows 2..109 of 112 are solid; the
// rows outside are transparent or half-transparent edge pixels). Stacked tablos butt solid to solid,
// so no background shows through between them.
export const TABLO_SOLID_Y = { y0: 2 / 112, y1: 110 / 112 }

// Top of the pedestal's two columns, as a fraction of the pedestal height (measured: y 3 of 145).
export const PEDESTAL_COLUMN_TOP = 3 / 145

// ---- Hand-tuned spacing (both are fractions of the stone height; 0.01 is about 0.7 px on a
// full-size stone) ----

// How far the bottom stone sinks behind the pedestal's columns. 0 = the stone just touches the
// column tops; larger = the columns cover more of the stone's bottom edge.
export const TABLO_SINK = 0.02

// Space between stacked stones. 0 = they touch with no seam; larger = a visible gap;
// negative = they overlap.
export const TABLO_ROW_GAP = 0.015

// Vertical text nudge in em: digits draw slightly below their line box's middle; this puts them on
// the tablo's middle (the badge's middle is within a pixel of it).
export const TABLO_TEXT_SHIFT_EM = -0.05

export const SIGN_PRELOAD: string[] = [SIGN_ASSETS.pedestal.src, SIGN_ASSETS.tablo.src]
