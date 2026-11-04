'use client'

// The square metal tile `board:sport_style` draws in `edgeMode: 'metal'` — board:sport_priced's
// look (PricePatchCell.tsx: tier materials from priceMaterials.ts, solid edge line, gold/silver
// sweeps) on the sport_style grid's SQUARE footprint, with NO logo|price split: no divider, no price
// section, just the logo centred in the tile. Does not use PatchCell.tsx at all — no fabric, no
// weave, no stitch, no SVG filters — so a metal board is cheaper to render than a patch board.
//
// Proportions are tileMetrics's with `w = h = size`. The panel tint (sport_priced's logo-section
// tint) covers the whole body since there is no section. The logo carries the same hard black
// outline + drop shadow as sport_priced's, so its edge survives stream compression.
//
// The tile draws NO outer glow and no gold halo: `material.glow` and the halo belong to the board's
// glow layer, rendered UNDER every cell (SportStyleBoard.tsx `.sps-glow`), so a bright tile's bloom
// never sits on top of a neighbour. The tile's own box-shadow is only the thin inset edge line.
//
// Sold branch: PricePatchCell's exact sold maths — cell grey = team luminance × 0.5, ring +30%,
// silhouette +40% — which are the same numbers PatchCell's sold branch lands on with the default
// `soldGreyMin/Max/RingShade/SilhouetteShade`, so a sold cell keeps its old greys on the new shape.
// No weave, no shine, no glow, no outline.

import {rgbToCss, shade, toGrey, type RGB} from './patchColors'
import type {TierMaterial} from './priceMaterials'
import './MetalPatchCell.css'

type Props = {
    size: number
    // Team colour — only the sold imprint's grey is derived from it.
    background: RGB
    logoSrc: string
    // Initials for a spot with no logo art (same rule as the patch cell).
    label?: string
    // Logo box as a fraction of `size` (the patch style's `logoScale`, so the logo keeps its size
    // across edge modes).
    logoScale: number
    material: TierMaterial
    sold: boolean
    // Run the material's shine (the board's `shine` toggle), and this tile's offset into its cycle.
    shine?: boolean
    shineDelayS?: number
}

/** The tile's proportions — tileMetrics (PricePatchCell.tsx) at `w = h = size`. Exported so the
 *  board's glow layer uses the same radius. */
export function metalMetrics(size: number) {
    const radius = Math.round(size * 0.2)
    const edgeInset = Math.max(3, Math.round(size * 0.07))
    const edgeWidth = Math.max(2, Math.round(size * 0.035))
    const innerR = Math.max(2, radius - edgeInset)
    const outlinePx = Math.max(1, Math.round(size * 0.035))
    return {radius, edgeInset, edgeWidth, innerR, outlinePx}
}

function outlineFilter(px: number, color: string): string {
    return [`${px}px 0`, `-${px}px 0`, `0 ${px}px`, `0 -${px}px`].map((o) => `drop-shadow(${o} 0 ${color})`).join(' ')
}

// Whole-px logo box centred in the tile (a fractional offset resamples the logo soft). Capped so the
// largest logo, including its black outline, touches the edge line's inner side but never crosses it.
function logoBox(size: number, logoScale: number) {
    const {edgeInset, edgeWidth, outlinePx} = metalMetrics(size)
    const maxPx = size - 2 * (edgeInset + Math.ceil(edgeWidth / 2) + outlinePx)
    const px = Math.max(1, Math.min(Math.round(size * logoScale), maxPx))
    const offset = Math.floor((size - px) / 2)
    return {left: offset, top: offset, width: px, height: px}
}

export default function MetalPatchCell({size, background, logoSrc, label, logoScale, material, sold, shine = false, shineDelayS = 0}: Props) {
    const {radius, edgeInset, edgeWidth, innerR, outlinePx} = metalMetrics(size)
    const box = logoBox(size, logoScale)
    const edgeRect = (stroke: string, dy = 0, extra = 0) => (
        <rect
            x={edgeInset}
            y={edgeInset + dy}
            width={size - edgeInset * 2}
            height={size - edgeInset * 2}
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
        const ring = rgbToCss(shade(cell, 0.3))
        const ink = rgbToCss(shade(cell, 0.4))
        const maskUrl = `url("${encodeURI(logoSrc)}")`
        return (
            <div className="spm-tile" style={{width: size, height: size, borderRadius: radius, backgroundColor: rgbToCss(cell)}}>
                <svg className="spm-tile-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {edgeRect(ring)}
                </svg>
                {label ? (
                    <span className="spm-label" style={{...box, fontSize: box.width * 0.45, color: ink}}>{label}</span>
                ) : (
                    <span className="spm-sil" style={{...box, backgroundColor: ink, maskImage: maskUrl, WebkitMaskImage: maskUrl}} />
                )}
            </div>
        )
    }

    const bodyBg = `${material.sheen}, linear-gradient(135deg, ${material.base.map((c, i) => `${c} ${Math.round((i / (material.base.length - 1)) * 100)}%`).join(', ')})`
    const shadowPx = Math.round(size * 0.03)
    const logoFilter = `${outlineFilter(outlinePx, 'rgba(0,0,0,0.9)')} drop-shadow(0 ${shadowPx}px ${shadowPx}px rgba(0,0,0,0.5))`
    const edgeShadow = rgbToCss(shade(material.edge, 0.45), 0.6)
    const edgeColor = rgbToCss(material.edge, 0.95)
    const gold = material.shine?.kind === 'gold'

    return (
        <div
            className={`spm-tile${gold ? ' spm-tile--gold' : ''}`}
            style={{
                width: size,
                height: size,
                borderRadius: radius,
                backgroundImage: bodyBg,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)',
            }}
        >
            <div className="spm-panel" style={{background: material.panel, borderRadius: radius}} />
            {shine && material.shine?.kind === 'silver' && (
                <div
                    className="spm-shine"
                    aria-hidden="true"
                    style={{animationDuration: `${material.shine.cycleS}s`, animationDelay: `${shineDelayS}s`}}
                />
            )}
            {shine && gold && [0, 1].map((pass) => (
                <div
                    key={pass}
                    className="spm-shine spm-shine--gold"
                    aria-hidden="true"
                    style={{animationDuration: `${material.shine!.cycleS}s`, animationDelay: `${shineDelayS - pass * material.shine!.cycleS / 2}s`}}
                />
            ))}
            <svg className="spm-tile-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <path
                    fillRule="evenodd"
                    fill={material.ring}
                    d={`M0 ${radius}A${radius} ${radius} 0 0 1 ${radius} 0H${size - radius}A${radius} ${radius} 0 0 1 ${size} ${radius}V${size - radius}A${radius} ${radius} 0 0 1 ${size - radius} ${size}H${radius}A${radius} ${radius} 0 0 1 0 ${size - radius}Z M${edgeInset + innerR} ${edgeInset}H${size - edgeInset - innerR}A${innerR} ${innerR} 0 0 1 ${size - edgeInset} ${edgeInset + innerR}V${size - edgeInset - innerR}A${innerR} ${innerR} 0 0 1 ${size - edgeInset - innerR} ${size - edgeInset}H${edgeInset + innerR}A${innerR} ${innerR} 0 0 1 ${edgeInset} ${size - edgeInset - innerR}V${edgeInset + innerR}A${innerR} ${innerR} 0 0 1 ${edgeInset + innerR} ${edgeInset}Z`}
                />
                {edgeRect(edgeShadow, 1, 1)}
                {gold && edgeRect('rgba(255, 242, 164, 0.95)', 0, 2)}
                {edgeRect(edgeColor)}
            </svg>
            {label ? (
                <span className="spm-label" style={{...box, fontSize: box.width * 0.45, color: rgbToCss(material.ink)}}>{label}</span>
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="spm-logo" src={logoSrc} alt="" style={{...box, filter: logoFilter}} />
            )}
        </div>
    )
}
