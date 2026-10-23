'use client'

// One wide `board:sport_priced` tile: team logo + price, centred together as ONE group so the gap
// between them is the same on every tile whatever the price's width. Paid tiers wear a metal
// (priceMaterials.ts); Side Cards keep the team's patch colour; a sold tile is the same grey
// imprint as PatchCell's sold branch (team silhouette in a darker grey), with SOLD in place of the
// price.
//
// The logo always gets the hard dark outline from PatchCell's `crisp` logo mode — a brightness edge
// survives the stream's 4:2:0 chroma subsampling where a logo that only differs from its tile in hue
// blurs into it. Whole px only: a fractional outline antialiases back into a soft edge.

import {darken, lighten, rgbToCss, shade, toGrey, contrast, type RGB} from './patchColors'
import type {TierMaterial} from './priceMaterials'

type Props = {
    w: number
    h: number
    // Live team colour (Side Card body) and the grey the sold imprint is derived from.
    background: RGB
    edge: RGB
    logoSrc: string
    // Initials for a spot with no logo art (same rule as board:sport_style).
    label?: string
    price: string
    // Shared by every tile on the board, so prices line up at one size.
    priceFontPx: number
    material?: TierMaterial
    sold: boolean
}

const LIGHT_INK: RGB = [246, 243, 236]
const DARK_INK: RGB = [22, 22, 22]

/** Near-white or near-black, whichever contrasts more with `bg` — a fixed luminance cut left white
 *  on mid-bright team colours (orange) at under 3:1. */
export function inkOn(bg: RGB): RGB {
    return contrast(LIGHT_INK, bg) >= contrast(DARK_INK, bg) ? LIGHT_INK : DARK_INK
}

/** The tile's proportions, shared with the board so it can size the price font once. */
export function tileMetrics(w: number, h: number) {
    const radius = Math.round(h * 0.2)
    const edgeInset = Math.max(3, Math.round(h * 0.09))
    const edgeWidth = Math.max(2, Math.round(h * 0.035))
    const logo = Math.round(h * 0.6)
    const gap = Math.round(h * 0.1)
    // Room for the price once the logo, the gap and a breathing band inside the edge line on both
    // sides are taken out.
    const priceRoom = Math.max(1, w - 2 * (edgeInset + Math.round(h * 0.2)) - logo - gap)
    return {radius, edgeInset, edgeWidth, logo, gap, priceRoom}
}

function outlineFilter(px: number, color: string): string {
    return [`${px}px 0`, `-${px}px 0`, `0 ${px}px`, `0 -${px}px`].map((o) => `drop-shadow(${o} 0 ${color})`).join(' ')
}

export default function PricePatchCell({w, h, background, edge, logoSrc, label, price, priceFontPx, material, sold}: Props) {
    const {radius, edgeInset, edgeWidth, logo, gap} = tileMetrics(w, h)
    const innerR = Math.max(2, radius - edgeInset)
    const outlinePx = Math.max(1, Math.round(h * 0.035))
    const edgeRect = (
        stroke: string,
        dy = 0,
        extra = 0
    ) => (
        <rect
            x={edgeInset}
            y={edgeInset + dy}
            width={w - edgeInset * 2}
            height={h - edgeInset * 2}
            rx={innerR}
            fill="none"
            stroke={stroke}
            strokeWidth={edgeWidth + extra}
        />
    )

    if (sold) {
        const lum = toGrey(background)[0] / 255
        const level = Math.round(255 * lum * 0.5)
        const cell: RGB = [level, level, level]
        const ring = shade(cell, 0.3)
        const ink = shade(cell, 0.4)
        const maskUrl = `url("${encodeURI(logoSrc)}")`
        return (
            <div className="spp-tile" style={{width: w, height: h, borderRadius: radius, backgroundColor: rgbToCss(cell)}}>
                <svg className="spp-tile-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                    {edgeRect(rgbToCss(ring))}
                </svg>
                <div className="spp-row" style={{gap}}>
                    {label ? (
                        <span className="spp-label" style={{width: logo, height: logo, fontSize: logo * 0.45, color: rgbToCss(ink)}}>{label}</span>
                    ) : (
                        <span className="spp-sil" style={{width: logo, height: logo, backgroundColor: rgbToCss(ink), maskImage: maskUrl, WebkitMaskImage: maskUrl}} />
                    )}
                    <span className="spp-sold" style={{fontSize: priceFontPx * 0.78, color: rgbToCss(ink)}}>SOLD</span>
                </div>
            </div>
        )
    }

    const bodyBg = material
        ? `${material.sheen}, linear-gradient(135deg, ${material.base.map((c, i) => `${c} ${Math.round((i / (material.base.length - 1)) * 100)}%`).join(', ')})`
        : `radial-gradient(ellipse at 50% 40%, ${rgbToCss(lighten(background, 0.1), 0.21)} 0%, transparent 55%, ${rgbToCss(darken(background, 0.45), 0.35)} 100%)`
    const ink = material ? material.ink : inkOn(background)
    const inkShadow = material
        ? (material.inkHighlight ? `0 1px 0 ${material.inkHighlight}` : '0 1px 0 rgba(0,0,0,0.6), 0 2px 3px rgba(0,0,0,0.45)')
        : (ink === LIGHT_INK ? `0 1px 0 ${rgbToCss(darken(background, 0.6))}, 0 2px 3px rgba(0,0,0,0.55)` : `0 1px 0 ${rgbToCss(lighten(background, 0.5))}`)
    const edgeColor = material ? material.edge : edge
    const logoFilter = `${outlineFilter(outlinePx, 'rgba(0,0,0,0.9)')} drop-shadow(0 ${Math.round(h * 0.03)}px ${Math.round(h * 0.03)}px rgba(0,0,0,0.5))`

    return (
        <div
            className="spp-tile"
            style={{
                width: w,
                height: h,
                borderRadius: radius,
                backgroundColor: material ? undefined : rgbToCss(background),
                backgroundImage: bodyBg,
                boxShadow: material
                    ? `inset 0 0 0 1px rgba(0,0,0,0.35), ${material.glow}`
                    : `inset 0 0 0 1px ${rgbToCss(darken(background, 0.5), 0.9)}, 0 3px 6px rgba(0,0,0,0.55), 0 10px 18px rgba(0,0,0,0.35)`,
            }}
        >
            <svg className="spp-tile-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                {material && (
                    <path
                        fillRule="evenodd"
                        fill={material.ring}
                        d={`M0 ${radius}A${radius} ${radius} 0 0 1 ${radius} 0H${w - radius}A${radius} ${radius} 0 0 1 ${w} ${radius}V${h - radius}A${radius} ${radius} 0 0 1 ${w - radius} ${h}H${radius}A${radius} ${radius} 0 0 1 0 ${h - radius}Z M${edgeInset + innerR} ${edgeInset}H${w - edgeInset - innerR}A${innerR} ${innerR} 0 0 1 ${w - edgeInset} ${edgeInset + innerR}V${h - edgeInset - innerR}A${innerR} ${innerR} 0 0 1 ${w - edgeInset - innerR} ${h - edgeInset}H${edgeInset + innerR}A${innerR} ${innerR} 0 0 1 ${edgeInset} ${h - edgeInset - innerR}V${edgeInset + innerR}A${innerR} ${innerR} 0 0 1 ${edgeInset + innerR} ${edgeInset}Z`}
                    />
                )}
                {edgeRect(rgbToCss(darken(edgeColor, 0.55), 0.6), 1, 1)}
                {edgeRect(rgbToCss(edgeColor, 0.95))}
            </svg>
            <div className="spp-row" style={{gap}}>
                {label ? (
                    <span className="spp-label" style={{width: logo, height: logo, fontSize: logo * 0.45, color: rgbToCss(ink)}}>{label}</span>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="spp-logo" src={logoSrc} alt="" style={{width: logo, height: logo, filter: logoFilter}} />
                )}
                <span className="spp-price" style={{fontSize: priceFontPx, color: rgbToCss(ink), textShadow: inkShadow}}>{price}</span>
            </div>
        </div>
    )
}
