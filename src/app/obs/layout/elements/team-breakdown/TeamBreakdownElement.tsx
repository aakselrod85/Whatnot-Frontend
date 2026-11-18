'use client'

// `teamBreakdown` (schema.ts): the Team Breakdown table — which teams of the other leagues go with
// each NFL team's slot. Static data from teams.json (teamsData.ts), so it reads nothing from
// useLayoutData(). base.png is fitted into the box without distortion; the cells fill the marble
// area inside it: width from the column count, height stretched (cell.png 3-slice) so the rows take
// the whole area height. Every hand-tuned number lives in tuning.ts.

import { useEffect, useMemo, useState } from 'react'
import type { ElementProps } from '../../registry'
import { buildCells } from './teamsData'
import {
    BASE_H, BASE_SLICE_BOTTOM, BASE_SLICE_TOP, BASE_SRC, BASE_W, LOGO_OUTLINE_COLOR, LOGO_OUTLINE_WIDTH, CELL_SLICE_BOTTOM, CELL_SLICE_TOP, CELL_SRC, CELL_W,
    DEFAULT_COLUMNS, DEFAULT_TOPPS_DYNASTY, GAP_X, GAP_Y, GRID_AREA, LINE_HEIGHT, MIN_MIDDLE, LOGO_BOX, MAX_FONT,
    SEPARATOR_ASPECT, SEPARATOR_MARGIN, SEPARATOR_SRC, SEPARATOR_WIDTH, TEXT_AREA,
    LOGO_SHADOW_BLUR, LOGO_SHADOW_COLOR, LOGO_SHADOW_X, LOGO_SHADOW_Y, TEXT_OUTLINE_COLOR, TEXT_OUTLINE_WIDTH,
} from './tuning'
import { TrimmedLogo } from './TrimmedLogo'
import './TeamBreakdownElement.css'

const FONT_FAMILY = "'Tbd Barlow Condensed', 'Arial Narrow', sans-serif"
const FONT_WEIGHT = 600

/** Width of every line at a 1px font, once the font has loaded (empty until measured). */
function useLineWidths(lines: string[]): Record<string, number> {
    const [widths, setWidths] = useState<Record<string, number>>({})
    const joined = lines.join('\n')
    useEffect(() => {
        let alive = true
        const measure = () => {
            const ctx = document.createElement('canvas').getContext('2d')
            if (!ctx || !alive) return
            ctx.font = `${FONT_WEIGHT} 100px ${FONT_FAMILY}`
            const next: Record<string, number> = {}
            for (const l of joined.split('\n')) next[l] = ctx.measureText(l).width / 100
            setWidths(next)
        }
        measure()
        document.fonts.load(`${FONT_WEIGHT} 100px 'Tbd Barlow Condensed'`).then(measure, measure)
        return () => {
            alive = false
        }
    }, [joined])
    return widths
}

export function TeamBreakdownElement({ element, box }: ElementProps) {
    const isTb = element.kind === 'teamBreakdown'
    const toppsDynasty = isTb ? element.toppsDynasty ?? DEFAULT_TOPPS_DYNASTY : DEFAULT_TOPPS_DYNASTY
    const columnsSetting = isTb ? element.columns ?? DEFAULT_COLUMNS : DEFAULT_COLUMNS

    const cells = useMemo(() => buildCells(toppsDynasty), [toppsDynasty])
    const lineWidths = useLineWidths(useMemo(() => cells.flatMap((c) => c.lines), [cells]))

    if (!isTb || cells.length === 0) return null

    // base.png is a vertical 3-slice: it fills the box's width (k = canvas px per base.png px)
    // and its middle stretches to the box's height. A box too short even for the fixed top and
    // bottom makes the whole base smaller instead, centred.
    const k = Math.min(box.w / BASE_W, box.h / (BASE_SLICE_TOP + BASE_SLICE_BOTTOM))
    const baseW = BASE_W * k
    const baseH = Math.max(box.h, (BASE_SLICE_TOP + BASE_SLICE_BOTTOM) * k)
    const baseHpx = baseH / k // the stretched base's height in base.png px

    // Grid maths in base.png px. The area keeps its distance to the base's bottom edge.
    const areaW = GRID_AREA.right - GRID_AREA.left
    const areaH = Math.max(0, baseHpx - GRID_AREA.top - (BASE_H - GRID_AREA.bottom))
    const cols = Math.max(1, Math.min(columnsSetting, cells.length))
    const rows = Math.ceil(cells.length / cols)
    let cellW = (areaW - (cols - 1) * GAP_X) / cols
    const cellH = (areaH - (rows - 1) * GAP_Y) / rows
    // Too many rows for the height: make every cell narrower (keeping cell.png's proportions)
    // so the fixed top/bottom of the art still fit; the grid then sits centred in the area.
    const minHPerW = (TEXT_AREA.top + TEXT_AREA.bottom + MIN_MIDDLE) / CELL_W
    if (cellH < cellW * minHPerW) cellW = cellH / minHPerW
    const s = cellW / CELL_W // base.png px per cell.png px
    const gridW = cols * cellW + (cols - 1) * GAP_X

    // One font size for every cell, sized for the cell with the most lines. A single line that is
    // still too wide (a long soccer club name) shrinks on its own, like on the printed card.
    const maxLines = Math.max(...cells.map((c) => c.lines.length))
    const textW = cellW - (TEXT_AREA.left + TEXT_AREA.right) * s
    const textH = cellH - (TEXT_AREA.top + TEXT_AREA.bottom) * s
    const sepW = textW * SEPARATOR_WIDTH
    const sepH = sepW * SEPARATOR_ASPECT
    const byHeight = (textH - (maxLines - 1) * sepH) / (maxLines * LINE_HEIGHT + (maxLines - 1) * 2 * SEPARATOR_MARGIN)
    const font = Math.max(1, Math.min(byHeight, MAX_FONT * s))
    const lineFont = (line: string) => {
        const w = lineWidths[line]
        return w ? Math.min(font, textW / w) : font
    }

    const px = (v: number) => `${v * k}px`

    // Outline that follows the logo's shape: four hard shadows, one per side.
    const ow = LOGO_OUTLINE_WIDTH * s * k
    // Then the shadow, applied to the outlined logo so it falls under both.
    const ls = s * k
    const logoFilters = ow > 0
        ? [[ow, 0], [-ow, 0], [0, ow], [0, -ow]].map(([x, y]) => `drop-shadow(${x}px ${y}px 0 ${LOGO_OUTLINE_COLOR})`)
        : []
    if (LOGO_SHADOW_BLUR > 0 || LOGO_SHADOW_X !== 0 || LOGO_SHADOW_Y !== 0) {
        logoFilters.push(`drop-shadow(${LOGO_SHADOW_X * ls}px ${LOGO_SHADOW_Y * ls}px ${LOGO_SHADOW_BLUR * ls}px ${LOGO_SHADOW_COLOR})`)
    }
    const logoFilter = logoFilters.length ? logoFilters.join(' ') : undefined

    // Text outline: hard shadows in 16 directions around each letter (works in OBS's browser too).
    const tw = TEXT_OUTLINE_WIDTH * s * k
    const textShadow = tw > 0
        ? Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2
              return `${(Math.cos(a) * tw).toFixed(2)}px ${(Math.sin(a) * tw).toFixed(2)}px 0 ${TEXT_OUTLINE_COLOR}`
          }).join(', ')
        : 'none'

    return (
        <div className="tbd-root">
            <div className="tbd-base" style={{ width: baseW, height: baseH, left: (box.w - baseW) / 2, top: (box.h - baseH) / 2 }}>
                {/* The art is its own layer: a border on .tbd-base itself would shift the grid. */}
                <div
                    className="tbd-base-art"
                    style={{
                        borderImageSource: `url(${BASE_SRC})`,
                        borderImageSlice: `${BASE_SLICE_TOP} 0 ${BASE_SLICE_BOTTOM} 0 fill`,
                        borderWidth: `${BASE_SLICE_TOP * k}px 0 ${BASE_SLICE_BOTTOM * k}px 0`,
                    }}
                />
                <div
                    className="tbd-grid"
                    style={{
                        // Exactly `cols` cells wide (centred when the grid got narrower), +1px so
                        // a full row never wraps on rounding.
                        left: px(GRID_AREA.left + (areaW - gridW) / 2),
                        top: px(GRID_AREA.top),
                        width: gridW * k + 1,
                        height: px(areaH),
                        columnGap: px(GAP_X),
                        rowGap: px(GAP_Y),
                    }}
                >
                    {cells.map((cell) => (
                        <div key={cell.key} className="tbd-cell" style={{ width: px(cellW), height: px(cellH) }}>
                            <div
                                className="tbd-cell-bg"
                                style={{
                                    borderImageSource: `url(${CELL_SRC})`,
                                    borderImageSlice: `${CELL_SLICE_TOP} 0 ${CELL_SLICE_BOTTOM} 0 fill`,
                                    borderWidth: `${px(CELL_SLICE_TOP * s)} 0 ${px(CELL_SLICE_BOTTOM * s)} 0`,
                                }}
                            />
                            <TrimmedLogo
                                src={cell.logo}
                                left={LOGO_BOX.x * s * k}
                                top={LOGO_BOX.y * s * k}
                                width={LOGO_BOX.w * s * k}
                                height={LOGO_BOX.h * s * k}
                                filter={logoFilter}
                            />
                            <div
                                className="tbd-text"
                                style={{
                                    left: px(TEXT_AREA.left * s),
                                    right: px(TEXT_AREA.right * s),
                                    top: px(TEXT_AREA.top * s),
                                    bottom: px(TEXT_AREA.bottom * s),
                                    fontSize: px(font),
                                    lineHeight: LINE_HEIGHT,
                                    fontFamily: FONT_FAMILY,
                                    fontWeight: FONT_WEIGHT,
                                    textShadow,
                                }}
                            >
                                {cell.lines.map((line, i) => (
                                    <div key={i} className="tbd-line-wrap">
                                        {i > 0 && !cell.noSeparators && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                className="tbd-sep"
                                                src={SEPARATOR_SRC}
                                                alt=""
                                                style={{ width: px(sepW), height: px(sepH), margin: `${px(font * SEPARATOR_MARGIN)} 0` }}
                                            />
                                        )}
                                        {/* Fixed line box so a shrunk line keeps the row rhythm. */}
                                        <div className="tbd-line" style={{ height: px(font * LINE_HEIGHT), fontSize: px(lineFont(line)), lineHeight: px(font * LINE_HEIGHT) }}>
                                            {line}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default TeamBreakdownElement

// For registry.ts's preload list.
export const TEAM_BREAKDOWN_PRELOAD = [BASE_SRC, CELL_SRC, SEPARATOR_SRC]
