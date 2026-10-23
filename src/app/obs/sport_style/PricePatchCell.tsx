'use client'

// One wide `board:sport_priced` tile, split into two sections by one solid divider: a logo section
// on the left (same width on every tile, lightly tinted so it reads as its own panel) and the price
// centred in the rest. Every tier wears a material (priceMaterials.ts) — metals for the paid tiers,
// one plain chalk for Side Cards; a sold tile is the same grey imprint as PatchCell's sold branch
// (team silhouette in a darker grey), with SOLD in place of the price, in the same two sections.
//
// The logo always gets the hard dark outline from PatchCell's `crisp` logo mode — a brightness edge
// survives the stream's 4:2:0 chroma subsampling where a logo that only differs from its tile in hue
// blurs into it. Whole px only: a fractional outline antialiases back into a soft edge.

import {rgbToCss, shade, toGrey, type RGB} from './patchColors'
import type {TierMaterial} from './priceMaterials'

type Props = {
    w: number
    h: number
    // Team colour — only the sold imprint's grey is derived from it.
    background: RGB
    logoSrc: string
    // Initials for a spot with no logo art (same rule as board:sport_style).
    label?: string
    price: string
    // Shared by every tile on the board, so prices line up at one size.
    priceFontPx: number
    material: TierMaterial
    sold: boolean
}

/** The tile's proportions, shared with the board so it can size the price font once. */
export function tileMetrics(w: number, h: number) {
    const radius = Math.round(h * 0.2)
    const edgeInset = Math.max(3, Math.round(h * 0.09))
    const edgeWidth = Math.max(2, Math.round(h * 0.035))
    const logo = Math.round(h * 0.6)
    // Logo section: from the tile's left edge to the divider. Wide enough for the logo plus the
    // edge band and an even margin either side of it.
    const section = edgeInset + logo + 2 * Math.round(h * 0.11)
    const pad = Math.round(h * 0.12)
    // Room for the price between the divider and the right edge line, with `pad` either side.
    const priceRoom = Math.max(1, w - section - edgeWidth - edgeInset - 2 * pad)
    return {radius, edgeInset, edgeWidth, logo, section, priceRoom}
}

function outlineFilter(px: number, color: string): string {
    return [`${px}px 0`, `-${px}px 0`, `0 ${px}px`, `0 -${px}px`].map((o) => `drop-shadow(${o} 0 ${color})`).join(' ')
}

export default function PricePatchCell({w, h, background, logoSrc, label, price, priceFontPx, material, sold}: Props) {
    const {radius, edgeInset, edgeWidth, logo, section} = tileMetrics(w, h)
    const innerR = Math.max(2, radius - edgeInset)
    const outlinePx = Math.max(1, Math.round(h * 0.035))
    const edgeRect = (stroke: string, dy = 0, extra = 0) => (
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
    // Whole-px divider centred on `section`, running edge line to edge line.
    const divider = (stroke: string, dy = 0) => (
        <rect x={section} y={edgeInset + dy} width={edgeWidth} height={h - edgeInset * 2} fill={stroke} />
    )
    // Logo section box (inside the left edge band) and price section box.
    const logoBox = {left: edgeInset, width: section - edgeInset}
    const priceBox = {left: section + edgeWidth, width: w - section - edgeWidth - edgeInset}

    if (sold) {
        const lum = toGrey(background)[0] / 255
        const level = Math.round(255 * lum * 0.5)
        const cell: RGB = [level, level, level]
        const ring = rgbToCss(shade(cell, 0.3))
        const ink = rgbToCss(shade(cell, 0.4))
        const maskUrl = `url("${encodeURI(logoSrc)}")`
        return (
            <div className="spp-tile" style={{width: w, height: h, borderRadius: radius, backgroundColor: rgbToCss(cell)}}>
                <svg className="spp-tile-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                    {edgeRect(ring)}
                    {divider(ring)}
                </svg>
                <div className="spp-sec" style={logoBox}>
                    {label ? (
                        <span className="spp-label" style={{width: logo, height: logo, fontSize: logo * 0.45, color: ink}}>{label}</span>
                    ) : (
                        <span className="spp-sil" style={{width: logo, height: logo, backgroundColor: ink, maskImage: maskUrl, WebkitMaskImage: maskUrl}} />
                    )}
                </div>
                <div className="spp-sec" style={priceBox}>
                    <span className="spp-sold" style={{fontSize: priceFontPx * 0.78, color: ink}}>SOLD</span>
                </div>
            </div>
        )
    }

    const bodyBg = `${material.sheen}, linear-gradient(135deg, ${material.base.map((c, i) => `${c} ${Math.round((i / (material.base.length - 1)) * 100)}%`).join(', ')})`
    const inkShadow = material.inkHighlight ? `0 1px 0 ${material.inkHighlight}` : '0 1px 0 rgba(0,0,0,0.6), 0 2px 3px rgba(0,0,0,0.45)'
    const logoFilter = `${outlineFilter(outlinePx, 'rgba(0,0,0,0.9)')} drop-shadow(0 ${Math.round(h * 0.03)}px ${Math.round(h * 0.03)}px rgba(0,0,0,0.5))`
    const edgeShadow = rgbToCss(shade(material.edge, 0.45), 0.6)
    const edgeColor = rgbToCss(material.edge, 0.95)

    return (
        <div
            className="spp-tile"
            style={{
                width: w,
                height: h,
                borderRadius: radius,
                backgroundImage: bodyBg,
                boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.35), ${material.glow}`,
            }}
        >
            <div className="spp-panel" style={{width: section, background: material.panel}} />
            <svg className="spp-tile-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                <path
                    fillRule="evenodd"
                    fill={material.ring}
                    d={`M0 ${radius}A${radius} ${radius} 0 0 1 ${radius} 0H${w - radius}A${radius} ${radius} 0 0 1 ${w} ${radius}V${h - radius}A${radius} ${radius} 0 0 1 ${w - radius} ${h}H${radius}A${radius} ${radius} 0 0 1 0 ${h - radius}Z M${edgeInset + innerR} ${edgeInset}H${w - edgeInset - innerR}A${innerR} ${innerR} 0 0 1 ${w - edgeInset} ${edgeInset + innerR}V${h - edgeInset - innerR}A${innerR} ${innerR} 0 0 1 ${w - edgeInset - innerR} ${h - edgeInset}H${edgeInset + innerR}A${innerR} ${innerR} 0 0 1 ${edgeInset} ${h - edgeInset - innerR}V${edgeInset + innerR}A${innerR} ${innerR} 0 0 1 ${edgeInset + innerR} ${edgeInset}Z`}
                />
                {edgeRect(edgeShadow, 1, 1)}
                {divider(edgeShadow, 1)}
                {edgeRect(edgeColor)}
                {divider(edgeColor)}
            </svg>
            <div className="spp-sec" style={logoBox}>
                {label ? (
                    <span className="spp-label" style={{width: logo, height: logo, fontSize: logo * 0.45, color: rgbToCss(material.ink)}}>{label}</span>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="spp-logo" src={logoSrc} alt="" style={{width: logo, height: logo, filter: logoFilter}} />
                )}
            </div>
            <div className="spp-sec" style={priceBox}>
                <span className="spp-price" style={{fontSize: priceFontPx, color: rgbToCss(material.ink), textShadow: inkShadow}}>{price}</span>
            </div>
        </div>
    )
}
