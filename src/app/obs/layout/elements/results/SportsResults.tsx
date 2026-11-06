'use client'

// The 'sports' skin of the `results` element (schema.ts `RESULTS_STYLES`) — an American-football
// field: gold-bordered panel, RESULTS plate sticking out above it, white-lined field with one
// grass strip per row, yard numbers down both gutters. ResultsElement.tsx owns the data and the
// ordering and hands the finished list here; this file only does the skin's geometry.
//
// Unlike 'rips' (which restyles the default DOM through CSS overrides) this skin has its own
// markup: there is no frame, no title band and no cell plate to restyle, and nearly every part is
// positioned from numbers that depend on the box AND the row count (row pitch, stripe count,
// number spacing), which CSS alone cannot derive. Every number comes from sportsStyle.ts; nothing
// is measured from the DOM except the nickname width (FitText below).
//
// Geometry is in element px, origin at the box's top-left. The plate draws ABOVE y = 0, which is
// why the `results` registry entry is `unclipped` and `.res-root` clips the other styles itself.

import {useEffect, useLayoutEffect, useRef, useState} from 'react'
import type {Event} from '@/app/entity/entities'
import {IsTeam} from '@/app/common/teams'
import {getSpotAbbreviation} from '@/app/common/spot_label'
import type {Box} from '../../schema'
import {getTeamImageSrc} from './ResultRow'
import {
    SPORTS_ABBR_FONT,
    SPORTS_BASE_ART_WIDTH,
    SPORTS_BASE_SLICE,
    SPORTS_BASE_SRC,
    SPORTS_FIELD_INSET,
    SPORTS_GRASS_SRC,
    SPORTS_LABEL_ART,
    SPORTS_LABEL_OVERLAP,
    SPORTS_LABEL_SRC,
    SPORTS_LABEL_VISIBLE,
    SPORTS_LABEL_WIDTH_SCALE,
    SPORTS_LINE_SRC,
    SPORTS_LINE_THICKNESS,
    SPORTS_LOGO_GAP_BOTTOM,
    SPORTS_LOGO_GAP_TOP,
    SPORTS_LOGO_MAX_W,
    SPORTS_LOGO_TRIM,
    SPORTS_NUMBER_ART,
    SPORTS_NUMBER_CENTER,
    SPORTS_NUMBER_GUTTER_FILL,
    SPORTS_NUMBER_MAX_SLOT_FILL,
    SPORTS_NUMBER_OUTLINE_H_ART,
    SPORTS_NUMBER_SEQUENCE,
    SPORTS_NUMBER_WIDEST_ART,
    SPORTS_SHADOW,
    SPORTS_SHORT_ROW_OUTER_DIVIDERS,
    SPORTS_SINGLE_ROW_NUMBER_INSET,
    SPORTS_STRIPE_ASPECT,
    SPORTS_STRIPE_SRC,
    SPORTS_STRIPE_W,
    SPORTS_TEXT_BOTTOM_GAP,
    SPORTS_TEXT_FONT,
    SPORTS_TEXT_MAX_FONT,
    SPORTS_TEXT_PAD_X,
    SPORTS_TEXT_SHARE,
    SPORTS_TICK_THICKNESS,
    SPORTS_TICK_W,
} from './sportsStyle'
import './ResultsSports.css'

type Props = {
    box: Box
    /** Row-major reading order, exactly what the other styles render (orderResults.ts). */
    ordered: Event[]
    columns: number
    /** Rows actually rendered — ResultsElement's `visualRows`. */
    rows: number
    /** Index in `ordered` of the last row's first cell, and how many cells that row is short of a
     *  full one (0 = full row). Same values the other styles centre their last row with. */
    lastRowStart: number
    lastRowShortBy: number
}

export function SportsResults({box, ordered, columns, rows, lastRowStart, lastRowShortBy}: Props) {
    const W = box.w
    const H = box.h

    // ---- Base: 9-slice. Corners/border keep their shape at any box size; scale follows width. ----
    const baseScale = W / SPORTS_BASE_ART_WIDTH
    const sl = SPORTS_BASE_SLICE
    const baseStyle: React.CSSProperties = {
        borderWidth: `${sl.top * baseScale}px ${sl.right * baseScale}px ${sl.bottom * baseScale}px ${sl.left * baseScale}px`,
        borderImage: `url(${SPORTS_BASE_SRC}) ${sl.top} ${sl.right} ${sl.bottom} ${sl.left} fill stretch`,
    }

    // ---- Field: outer white rectangle, then `rows` equal rows separated by white lines. ----
    // Everything that draws a line edge is snapped to whole px. Each line is its own element, and
    // the browser rounds each fractional edge on its own — unsnapped, a side line can end a pixel
    // past the bottom line, or two neighbouring lines come out different thicknesses. The price is
    // that rows may differ from each other by 1 px, which is why the per-row values below come
    // from `lineTop`, not from one shared row height.
    const line = Math.max(1, Math.round(W * SPORTS_LINE_THICKNESS))
    const gutter = W * SPORTS_FIELD_INSET.side
    const fieldX = Math.round(gutter)
    const fieldY = Math.round(W * SPORTS_FIELD_INSET.top)
    const fieldW = Math.max(0, Math.round(W) - fieldX * 2)
    const fieldH = Math.max(0, Math.round(H - W * SPORTS_FIELD_INSET.bottom) - fieldY)
    // `pitch` = top of one line to the top of the next; rows+1 lines and `rows` clear heights add
    // up to exactly fieldH, so the last line's bottom edge IS the field's bottom edge.
    const pitch = rows > 0 ? (fieldH - line) / rows : 0
    const lineTop = (i: number) => Math.round(i * pitch) // line i, relative to the field
    const rowTop = (r: number) => lineTop(r) + line // clear area of row r starts here…
    const rowHeight = (r: number) => Math.max(0, lineTop(r + 1) - rowTop(r)) // …and is this tall
    const rowH = Math.max(0, pitch - line) // the same, unsnapped: what cell content is sized from
    const innerW = Math.max(0, fieldW - line * 2)
    const cellW = columns > 0 ? innerW / columns : 0

    // ---- Column dividers: n fixed-size stripes per row, one stripe height apart, centred. ----
    // Needs (2n - 1) stripe heights for the stack plus at least one above and one below:
    // (2n + 1) * h <= rowH  =>  n = floor((rowH / h - 1) / 2). The flex column centres the stack,
    // so whatever is left over is split equally top and bottom. Counted against the SHORTEST row
    // the px snapping above can produce, so the one-stripe margin holds in every row.
    const stripeW = W * SPORTS_STRIPE_W
    const stripeH = stripeW * SPORTS_STRIPE_ASPECT
    const shortestRowH = Math.max(0, Math.floor(pitch) - line)
    const stripesPerRow = stripeH > 0 ? Math.max(0, Math.floor((shortestRowH / stripeH - 1) / 2)) : 0
    // x of each divider (centre line, relative to the field) for a full row and for a short,
    // centred last row — whose cells sit half a column off the grid above, so its dividers do too.
    const fullRowDividers: number[] = []
    for (let k = 1; k < columns; k++) fullRowDividers.push(line + k * cellW)
    const lastRowCount = columns - lastRowShortBy
    const shortRowDividers: number[] = []
    if (lastRowShortBy > 0) {
        const first = SPORTS_SHORT_ROW_OUTER_DIVIDERS ? 0 : 1
        const last = SPORTS_SHORT_ROW_OUTER_DIVIDERS ? lastRowCount : lastRowCount - 1
        for (let k = first; k <= last; k++) shortRowDividers.push(line + (lastRowShortBy / 2 + k) * cellW)
    }

    // ---- Yard numbers: 11 numbers + 10 ticks per gutter, evenly spaced between two anchors. ----
    // Anchors are the vertical middles of the first and last row. With a single row those are the
    // same point, so the sequence is spread over the whole field height instead (see
    // SPORTS_SINGLE_ROW_NUMBER_INSET).
    const numberCx = gutter * SPORTS_NUMBER_CENTER
    const firstY =
        rows > 1 ? fieldY + rowTop(0) + rowHeight(0) / 2 : fieldY + fieldH * SPORTS_SINGLE_ROW_NUMBER_INSET
    const lastY =
        rows > 1
            ? fieldY + rowTop(rows - 1) + rowHeight(rows - 1) / 2
            : fieldY + fieldH * (1 - SPORTS_SINGLE_ROW_NUMBER_INSET)
    const numberStep = (lastY - firstY) / (SPORTS_NUMBER_SEQUENCE.length - 1)
    // Size from the gutter, capped so a number never reaches its neighbours' tick when rows are
    // few or short. Ticks shrink by the same factor so the pair keeps its proportions.
    const wantedNumberScale = (gutter * SPORTS_NUMBER_GUTTER_FILL) / SPORTS_NUMBER_WIDEST_ART
    const cappedNumberScale = (numberStep * SPORTS_NUMBER_MAX_SLOT_FILL) / SPORTS_NUMBER_OUTLINE_H_ART
    const numberScale = Math.max(0, Math.min(wantedNumberScale, cappedNumberScale))
    const shrink = wantedNumberScale > 0 ? numberScale / wantedNumberScale : 0
    const tickW = gutter * SPORTS_TICK_W * shrink
    const tickH = Math.max(1, Math.round(W * SPORTS_TICK_THICKNESS * shrink))
    const showNumbers = rows > 0 && numberScale > 0

    // ---- RESULTS plate: visible part spans number-column centre to number-column centre. ----
    const lv = SPORTS_LABEL_VISIBLE
    const labelVisibleW = (W - numberCx * 2) * SPORTS_LABEL_WIDTH_SCALE
    const labelScale = labelVisibleW / (lv.right - lv.left)
    const labelStyle: React.CSSProperties = {
        width: SPORTS_LABEL_ART.w * labelScale,
        height: SPORTS_LABEL_ART.h * labelScale,
        left: (W - labelVisibleW) / 2 - lv.left * labelScale,
        // Visible bottom edge lands SPORTS_LABEL_OVERLAP below the box top; the rest is above it.
        top: W * SPORTS_LABEL_OVERLAP - lv.bottom * labelScale,
    }

    // ---- Cell internals, all from the row's clear height. ----
    const textH = rowH * SPORTS_TEXT_SHARE
    const logoTop = rowH * SPORTS_LOGO_GAP_TOP
    const logoBottom = rowH * SPORTS_LOGO_GAP_BOTTOM
    const textBottom = rowH * SPORTS_TEXT_BOTTOM_GAP
    const logoH = Math.max(0, rowH - textH - textBottom - logoTop - logoBottom)
    const logoW = cellW * SPORTS_LOGO_MAX_W

    // Art paths and the shadow reach the CSS as custom properties, so sportsStyle.ts stays the
    // only place that names a file or a number (same convention as the rips skin).
    const rootStyle = {
        '--res-sp-line-art': `url(${SPORTS_LINE_SRC})`,
        '--res-sp-stripe-art': `url(${SPORTS_STRIPE_SRC})`,
        '--res-sp-grass-art': `url(${SPORTS_GRASS_SRC})`,
        '--res-sp-shadow': `drop-shadow(0 ${W * SPORTS_SHADOW.offsetY}px ${W * SPORTS_SHADOW.blur}px ${SPORTS_SHADOW.color})`,
        '--res-sp-line': `${line}px`,
        '--res-sp-stripe-h': `${stripeH}px`,
    } as React.CSSProperties

    const rowIndexes = Array.from({length: rows}, (_, r) => r)
    const sides = [numberCx, W - numberCx] // centre x of the left and the right number column

    return (
        <div className="res-root res-style-sports" style={rootStyle}>
            <div className="res-sp-base" style={baseStyle} />
            {/* Under the field: the plate's soft shadow falls on the panel, not on the top line. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, same as every other layout element */}
            <img className="res-sp-label" src={SPORTS_LABEL_SRC} alt="" draggable={false} style={labelStyle} />

            {rows > 0 && (
                <div className="res-sp-field" style={{left: fieldX, top: fieldY, width: fieldW, height: fieldH}}>
                    {/* Grass: one stretched strip per row, running under the lines on every side
                        (half a line of overlap) so no panel shows through at a seam. */}
                    {rowIndexes.map((r) => (
                        <div
                            key={`g${r}`}
                            className="res-sp-grass"
                            style={{
                                left: line / 2,
                                top: lineTop(r) + line / 2,
                                width: fieldW - line,
                                height: lineTop(r + 1) - lineTop(r),
                            }}
                        />
                    ))}

                    {stripesPerRow > 0 &&
                        rowIndexes.map((r) => {
                            const xs = lastRowShortBy > 0 && r === rows - 1 ? shortRowDividers : fullRowDividers
                            return xs.map((x, k) => (
                                <div
                                    key={`d${r}-${k}`}
                                    className="res-sp-divider"
                                    style={{left: x - stripeW / 2, top: rowTop(r), width: stripeW, height: rowHeight(r)}}
                                >
                                    {Array.from({length: stripesPerRow}, (_, s) => (
                                        <div key={s} className="res-sp-stripe" />
                                    ))}
                                </div>
                            ))
                        })}

                    {/* Cells. Twice as many tracks as columns, each cell spanning two, so a short
                        last row can be shifted by HALF columns — see ResultsElement.tsx. One grid
                        row per field row, each exactly its row's clear height, one line apart. */}
                    <div
                        className="res-sp-cells"
                        style={
                            {
                                left: line,
                                top: line,
                                width: innerW,
                                '--res-sp-tracks': columns * 2,
                                gridTemplateRows: rowIndexes.map((r) => `${rowHeight(r)}px`).join(' '),
                                '--res-sp-text-h': `${textH}px`,
                                '--res-sp-font': `${Math.min(textH * SPORTS_TEXT_FONT, W * SPORTS_TEXT_MAX_FONT)}px`,
                                '--res-sp-text-bottom': `${textBottom}px`,
                                '--res-sp-logo-top': `${logoTop}px`,
                                '--res-sp-logo-bottom': `${logoBottom}px`,
                                '--res-sp-pad-x': `${W * SPORTS_TEXT_PAD_X}px`,
                                '--res-sp-logo-w': `${logoW}px`,
                                '--res-sp-abbr-font': `${logoH * SPORTS_ABBR_FONT}px`,
                            } as React.CSSProperties
                        }
                    >
                        {ordered.map((event, i) => (
                            <SportsCell
                                key={event.id}
                                event={event}
                                logoW={logoW}
                                logoH={logoH}
                                gridColumnStart={lastRowShortBy > 0 && i === lastRowStart ? lastRowShortBy + 1 : undefined}
                            />
                        ))}
                    </div>

                    {/* Lines: rows+1 horizontals (the first and last are the rectangle's top and
                        bottom) and the two sides. Painted last, over the cells, so a shadow or
                        a letter's tail reaching a line never smudges it. */}
                    {Array.from({length: rows + 1}, (_, i) => (
                        <div
                            key={`h${i}`}
                            className="res-sp-line"
                            style={{left: 0, top: lineTop(i), width: fieldW, height: line}}
                        />
                    ))}
                    <div className="res-sp-line" style={{left: 0, top: 0, width: line, height: fieldH}} />
                    <div className="res-sp-line" style={{left: fieldW - line, top: 0, width: line, height: fieldH}} />
                </div>
            )}

            {/* Gutters. Ticks first and outside the shadowed layer: like the other white lines
                they cast no shadow. Both gutters' numbers share one layer, hence one filter. */}
            {showNumbers &&
                sides.map((cx, side) =>
                    SPORTS_NUMBER_SEQUENCE.slice(1).map((_, i) => (
                        <div
                            key={`t${side}-${i}`}
                            className="res-sp-line"
                            style={{
                                left: cx - tickW / 2,
                                top: Math.round(firstY + (i + 0.5) * numberStep - tickH / 2),
                                width: tickW,
                                height: tickH,
                            }}
                        />
                    ))
                )}
            {showNumbers && (
                <div className="res-sp-numbers">
                    {sides.map((cx, side) =>
                        SPORTS_NUMBER_SEQUENCE.map((n, i) => {
                            const art = SPORTS_NUMBER_ART[n]
                            return (
                                // eslint-disable-next-line @next/next/no-img-element -- plain <img>, same as every other layout element
                                <img
                                    key={`n${side}-${i}`}
                                    className="res-sp-number"
                                    src={art.src}
                                    alt=""
                                    draggable={false}
                                    style={{
                                        width: art.w * numberScale,
                                        height: art.h * numberScale,
                                        // Centred on the white digits, not on the padded file.
                                        left: cx - art.cx * numberScale,
                                        top: firstY + i * numberStep - art.cy * numberScale,
                                    }}
                                />
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}

// One cell: logo (or a non-team spot's short code) over the buyer's nickname. An unsold spot
// (`customer === ''`) renders nothing — the cell stays in the grid so the others keep their
// places, and only the grass shows.
function SportsCell({
    event,
    logoW,
    logoH,
    gridColumnStart,
}: {
    event: Event
    /** The most room a logo may take, px (SPORTS_LOGO_MAX_W and what the gaps + nickname leave). */
    logoW: number
    logoH: number
    gridColumnStart?: number
}) {
    const sold = event.customer !== ''
    return (
        <div className="res-sp-cell" style={gridColumnStart ? {gridColumnStart} : undefined}>
            {sold && (
                <>
                    <div className="res-sp-logo">
                        {IsTeam(event.team) ? (
                            <SportsLogo src={getTeamImageSrc(event.team)} alt={event.team} maxW={logoW} maxH={logoH} />
                        ) : (
                            <FitText className="res-sp-abbr" text={getSpotAbbreviation(event.team)} />
                        )}
                    </div>
                    <FitText className="res-sp-name" text={event.customer} />
                </>
            )}
        </div>
    )
}

// A team logo fitted into maxW x maxH around the centre of the logo area, never squashed.
//
// The team files are squares with transparent margins of very different sizes around the drawing
// (a wide logo fills under half its square's height), so a plain `object-fit: contain` of the file
// leaves every logo small and each a different apparent size. With SPORTS_LOGO_TRIM the fit is
// done on the DRAWING's bounding box instead (useLogoTrim below): the <img> is sized so that box
// fills maxW x maxH and is shifted so that box, not the file, is what gets centred.
//
// Until the measurement arrives the image is mounted but invisible — it would otherwise show at
// the untrimmed size for a moment and then jump. If measuring is off or fails, the whole file is
// fitted (`contain`), which is always safe.
function SportsLogo({src, alt, maxW, maxH}: {src: string; alt: string; maxW: number; maxH: number}) {
    const trim = useLogoTrim(src)

    let style: React.CSSProperties
    if (trim) {
        // In units of the image's height: the file is `aspect` x 1, the drawing trim.w*aspect x trim.h.
        const scale = Math.min(maxW / (trim.w * trim.aspect), maxH / trim.h)
        const w = trim.aspect * scale
        const h = scale
        style = {width: w, height: h, marginLeft: -(trim.x + trim.w / 2) * w, marginTop: -(trim.y + trim.h / 2) * h}
    } else {
        style = {
            width: maxW,
            height: maxH,
            marginLeft: -maxW / 2,
            marginTop: -maxH / 2,
            objectFit: 'contain',
            opacity: trim === undefined ? 0 : undefined,
        }
    }

    // eslint-disable-next-line @next/next/no-img-element -- plain <img>, same as every other layout element
    return <img className="res-sp-logo-img" src={src} alt={alt} draggable={false} style={style} />
}

// Bounding box of a logo's visible pixels, as fractions of its file (x/y = top-left corner), plus
// the file's width / height. Measured once per file on a small canvas and kept for the page's
// lifetime, so a re-render or a second cell with the same team costs nothing. Team art is served
// from this origin, so reading the pixels back is allowed; anything that goes wrong (missing
// file, blocked canvas) is remembered as `null` = "fit the whole file".
type LogoTrim = {x: number; y: number; w: number; h: number; aspect: number}

const LOGO_TRIM_SAMPLE = 128 // px side of the measuring canvas — the box is accurate to 1/128
const LOGO_TRIM_ALPHA = 24 // 0-255: fainter pixels (soft edges, stray specks) do not count
const logoTrimCache = new Map<string, LogoTrim | null>()
const logoTrimJobs = new Map<string, Promise<void>>()

function readLogoTrim(img: HTMLImageElement): LogoTrim | null {
    const n = LOGO_TRIM_SAMPLE
    const canvas = document.createElement('canvas')
    canvas.width = n
    canvas.height = n
    const ctx = canvas.getContext('2d', {willReadFrequently: true})
    if (!ctx || !img.naturalWidth || !img.naturalHeight) return null
    ctx.drawImage(img, 0, 0, n, n)
    const data = ctx.getImageData(0, 0, n, n).data
    let x0 = n
    let y0 = n
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            if (data[(y * n + x) * 4 + 3] > LOGO_TRIM_ALPHA) {
                if (x < x0) x0 = x
                if (x > x1) x1 = x
                if (y < y0) y0 = y
                if (y > y1) y1 = y
            }
        }
    }
    if (x1 < x0 || y1 < y0) return null // fully transparent file
    return {
        x: x0 / n,
        y: y0 / n,
        w: (x1 - x0 + 1) / n,
        h: (y1 - y0 + 1) / n,
        aspect: img.naturalWidth / img.naturalHeight,
    }
}

function measureLogoTrim(src: string): Promise<void> {
    let job = logoTrimJobs.get(src)
    if (!job) {
        job = new Promise<LogoTrim | null>((resolve) => {
            const img = new Image()
            img.onload = () => {
                try {
                    resolve(readLogoTrim(img))
                } catch {
                    resolve(null)
                }
            }
            img.onerror = () => resolve(null)
            img.src = src
        }).then((trim) => {
            logoTrimCache.set(src, trim)
        })
        logoTrimJobs.set(src, job)
    }
    return job
}

/** `undefined` while the file is being measured, `null` when it is to be fitted whole. */
function useLogoTrim(src: string): LogoTrim | null | undefined {
    const [, rerender] = useState(0)
    useEffect(() => {
        if (!SPORTS_LOGO_TRIM || logoTrimCache.has(src)) return
        let alive = true
        measureLogoTrim(src).then(() => {
            if (alive) rerender((n) => n + 1)
        })
        return () => {
            alive = false
        }
    }, [src])
    return SPORTS_LOGO_TRIM ? logoTrimCache.get(src) : null
}

// A single line of text that shrinks (uniformly, like a smaller font) until it fits its
// container's width — no ellipsis, no wrap. The scale is a CSS transform on the inner span, which
// does not change the span's layout width, so measuring and scaling cannot feed back into each
// other. Layout widths are also unaffected by the canvas's own `transform: scale()`, so this is
// correct at any OBS source size. The ResizeObserver re-fits when the cell is resized (box, row or
// column count changed) and when the text's own width changes (new name, web font arriving).
function FitText({text, className}: {text: string; className: string}) {
    const outerRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLSpanElement>(null)

    useLayoutEffect(() => {
        const outer = outerRef.current
        const inner = innerRef.current
        if (!outer || !inner) return
        const fit = () => {
            const available = outer.clientWidth
            const needed = inner.offsetWidth
            inner.style.transform = needed > available && needed > 0 ? `scale(${available / needed})` : ''
        }
        fit()
        const observer = new ResizeObserver(fit)
        observer.observe(outer)
        observer.observe(inner)
        return () => observer.disconnect()
    }, [text])

    return (
        <div ref={outerRef} className={`res-sp-fit ${className}`}>
            <span ref={innerRef} className="res-sp-fit-inner">
                {text}
            </span>
        </div>
    )
}

export default SportsResults
