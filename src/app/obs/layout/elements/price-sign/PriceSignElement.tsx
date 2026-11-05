'use client'

// The `priceSign` registry component (obs-price-sign-plan.md v2) — a stone pedestal at the bottom
// of the box with one stone tablo per price range stacked above it, growing upward. Same data as
// `priceRanges` (../price-ranges/PriceRangesElement.tsx); `rangeLabel` comes from lib/priceRange.ts.
//
// Renders nothing unless the current series is a `price_ranges` series with at least one range.
// Geometry: all px from `box`, anchored at the box's bottom centre; the stack may rise above the
// box top (the registry entry is `unclipped`).

import { useEffect, useState } from 'react'
import type { ElementProps } from '../../registry'
import { useLayoutData } from '../../useLayoutData'
import {
    PEDESTAL_COLUMN_TOP,
    SIGN_ASSETS,
    TABLO_BADGE,
    TABLO_LABEL,
    TABLO_ROW_GAP,
    TABLO_SINK,
    TABLO_SOLID_Y,
    TABLO_TEXT_SHIFT_EM,
    TABLO_WIDTH_RATIO,
} from './assets'
import { rangeLabel } from '@/app/lib/priceRange'
import './PriceSignElement.css'

export function PriceSignElement({ box, element }: ElementProps) {
    const { series, seriesPriceRanges } = useLayoutData()
    const [root, setRoot] = useState<HTMLDivElement | null>(null)
    const [devicePxPerCanvasPx, setDevicePxPerCanvasPx] = useState(1)

    // The browser snaps text to whole device pixels but draws images at fractional positions, so
    // with a fractional row step each row's text lands differently inside its stone. Measured in a
    // frame because the Stage applies its scale after this element's effects run.
    useEffect(() => {
        if (!root) return
        let frame = 0
        const measure = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
                const scale = root.getBoundingClientRect().width / root.offsetWidth
                if (scale > 0) setDevicePxPerCanvasPx(scale * window.devicePixelRatio)
            })
        }
        measure()
        window.addEventListener('resize', measure)
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('resize', measure)
        }
    }, [root])

    if (element.kind !== 'priceSign') return null
    if (series?.kind !== 'price_ranges' || seriesPriceRanges.length === 0) return null

    const { pedestal, tablo } = SIGN_ASSETS
    const rows = seriesPriceRanges.length
    const pedestalW = box.w
    const pedestalH = (pedestalW * pedestal.h) / pedestal.w
    const tabloW = pedestalW * TABLO_WIDTH_RATIO
    const tabloH = (tabloW * tablo.h) / tablo.w
    const fontSize = tabloH * 0.42 * (element.fontScale ?? 1)
    const pedestalTop = box.h - pedestalH
    // Solid edge to solid edge, so the transparent rim rows of the art never leave a seam. A whole
    // number of device pixels, so every row sits at the same sub-pixel phase; rounded down, so stones
    // may overlap by under a pixel more but never part.
    const solidH = (TABLO_SOLID_Y.y1 - TABLO_SOLID_Y.y0 + TABLO_ROW_GAP) * tabloH
    const rowStep = Math.max(1, Math.floor(solidH * devicePxPerCanvasPx)) / devicePxPerCanvasPx
    // The bottom tablo's solid bottom edge sits a little below the column tops; the pedestal is drawn
    // after the tablos, so the columns overlap it.
    const bottomTop = pedestalTop + PEDESTAL_COLUMN_TOP * pedestalH + TABLO_SINK * tabloH - TABLO_SOLID_Y.y1 * tabloH

    return (
        <div ref={setRoot} className="psn-root" style={{ fontSize }}>
            {seriesPriceRanges.map((r, i) => {
                const top = bottomTop - (rows - 1 - i) * rowStep
                const left = (box.w - tabloW) / 2
                // Both texts span the whole tablo height, so they share one line, centred on the
                // tablo. A transform, not `top`: the browser rounds a text's layout position to a
                // whole canvas pixel before scaling, which would give each row its own rounding.
                const textTransform = `translateY(calc(${top}px + ${TABLO_TEXT_SHIFT_EM}em))`
                return (
                    <div key={r.id}>
                        <img
                            src={tablo.src}
                            alt=""
                            draggable={false}
                            className="psn-stone"
                            style={{ left, top, width: tabloW, height: tabloH }}
                        />
                        <span
                            className="psn-label"
                            style={{
                                left: left + TABLO_LABEL.x0 * tabloW,
                                width: (TABLO_LABEL.x1 - TABLO_LABEL.x0) * tabloW,
                                top: 0,
                                height: tabloH,
                                transform: textTransform,
                            }}
                        >
                            {rangeLabel(r)}
                        </span>
                        <span
                            className="psn-count"
                            style={{
                                left: left + TABLO_BADGE.x0 * tabloW,
                                width: (TABLO_BADGE.x1 - TABLO_BADGE.x0) * tabloW,
                                top: 0,
                                height: tabloH,
                                transform: textTransform,
                            }}
                        >
                            {r.count}
                        </span>
                    </div>
                )
            })}
            <img
                src={pedestal.src}
                alt=""
                draggable={false}
                className="psn-stone"
                style={{ left: 0, top: pedestalTop, width: pedestalW, height: pedestalH }}
            />
        </div>
    )
}

export default PriceSignElement
