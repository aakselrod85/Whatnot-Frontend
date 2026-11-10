// One row of the `resultsThin` element (obs-layout-plan.md §2.4). Sibling of
// elements/results/ResultRow.tsx — same team-icon source and high-bid/giveaway color coding, and
// sized the same way: everything in it (icon, abbreviation tile, name) is a fraction of the row
// height ThinResults.tsx derives from `box.h / rows` and sets on the grid as `--rest-row-h` (see
// ThinResultRow.css). The only difference is the arrangement — a single compact row, icon beside
// the name, rather than the full board's two-line boxed cell.

import {useLayoutEffect, useRef, useState} from 'react'
import type {Event} from '@/app/entity/entities'
import {IsTeam} from '@/app/common/teams'
import {getSpotAbbreviation} from '@/app/common/spot_label'
import type {Tier} from '../results/tiers'
import {getTeamImageSrc} from '../results/ResultRow'
import type {ResultsThinStyle} from '../../schema'
import {RIPS_THIN_CELL_SRC, RIPS_THIN_TEXT_MASK_EXTEND} from './ripsStyle'
import {
    SPORTS_THIN_CELL_ART_H,
    SPORTS_THIN_CELL_LONG_LEFT_SRC,
    SPORTS_THIN_CELL_LONG_SRC,
    SPORTS_THIN_CELL_PAD,
    SPORTS_THIN_CELL_SLICE,
    SPORTS_THIN_CELL_SRC,
    SPORTS_THIN_FONT,
    SPORTS_THIN_LOGO,
    SPORTS_THIN_LOGO_OFFSET_Y,
    SPORTS_THIN_TEXT_MASK_EXTEND,
    SPORTS_THIN_TEXT_OFFSET_Y,
} from './sportsStyle'
import {registerNameScroll} from './nameScrollSync'
import {SCROLL_GAP_PX} from './scrollStyle'
import {DEFAULT_THIN_TEXT_MASK_EXTEND} from './defaultStyle'
import './ThinResultRow.css'

export function ThinResultRow({
    event,
    tier,
    highBidTeam,
    giveawayTeam,
    gridColumnStart,
    skin = 'default',
}: {
    event: Event
    tier: Tier
    highBidTeam: string
    giveawayTeam: string
    /** Set only on the first cell of a short final row, to centre that row (see ThinResults). */
    gridColumnStart?: number
    /** The element's style. 'rips' (ripsStyle.ts): the cell is painted with the plate art instead
     *  of the tier-coloured border; the path is handed to ThinResultsRips.css as a custom property
     *  so ripsStyle.ts stays the only place that names a file. 'sports' (sportsStyle.ts): the cell
     *  is a 9-slice of the plate art scaled by the row height, set inline (sportsCellStyle). */
    skin?: ResultsThinStyle
}) {
    const isRips = skin === 'rips'
    const isSports = skin === 'sports'
    const isHighBidTeam = highBidTeam === event.team
    const isGiveawayTeam = giveawayTeam === event.team

    // Is the nickname cut off? Measured on the real element, re-measured whenever the name or the
    // cell size changes. In the sports style the "long name" overlays
    // (sportsStyle.ts SPORTS_THIN_CELL_LONG_SRC) show exactly while it is.
    //
    // While it is cut off, the name also runs left (every style; see nameScrollSync.ts): `moverRef` holds
    // the text (and, while cut off, its second copy) and moves inside `nameRef`, which stays put
    // and clips. `textRef` is the first copy, the one that is measured.
    const nameRef = useRef<HTMLDivElement>(null)
    const moverRef = useRef<HTMLDivElement>(null)
    const textRef = useRef<HTMLSpanElement>(null)
    const [isCut, setIsCut] = useState(false)
    useLayoutEffect(() => {
        const box = nameRef.current
        const mover = moverRef.current
        const text = textRef.current
        if (!box || !mover || !text) {
            setIsCut(false)
            return
        }
        // The running itself is done by nameScrollSync.ts, which keeps every cut-off name of the
        // board in step; this cell only tells it whether its name runs, and how far it must go.
        const key = {}
        let unregister: (() => void) | undefined
        const measure = () => {
            // The plain text area (the mask's parent), not the mask itself, which may be extended.
            const overflow = text.offsetWidth - (box.parentElement?.clientWidth ?? box.clientWidth)
            setIsCut(overflow > 0)
            if (overflow > 0) {
                unregister = registerNameScroll(key, mover, text.offsetWidth + SCROLL_GAP_PX)
            } else {
                unregister?.()
                unregister = undefined
            }
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(box)
        if (box.parentElement) ro.observe(box.parentElement)
        ro.observe(text)
        return () => {
            ro.disconnect()
            unregister?.()
        }
    }, [event.customer])

    let bgClass = event.customer === '' ? 'rest-bg-empty' : 'rest-bg-item'
    if (isHighBidTeam) {
        bgClass = 'rest-bg-high-bid'
    } else if (isGiveawayTeam) {
        bgClass = 'rest-bg-giveaway'
    }

    const itemStyle = {
        ...(gridColumnStart ? {gridColumnStart} : undefined),
        ...(isRips ? {'--rest-cell-art': `url(${RIPS_THIN_CELL_SRC})`} : undefined),
        ...(isSports ? sportsCellStyle() : undefined),
        // Left / right position of the nickname's clipping mask, per style (px; sports scales its
        // own with the row inside sportsCellStyle).
        ...(isRips ? maskVars(RIPS_THIN_TEXT_MASK_EXTEND) : undefined),
        ...(!isRips && !isSports ? maskVars(DEFAULT_THIN_TEXT_MASK_EXTEND) : undefined),
    } as React.CSSProperties

    return (
        <div
            className={`rest-row-item rest-tier-${tier}`}
            style={itemStyle}
        >
            {IsTeam(event.team) ? (
                <img className="rest-image" src={getTeamImageSrc(event.team)} alt={event.team} />
            ) : (
                <div className="rest-abbr">
                    <span>{getSpotAbbreviation(event.team)}</span>
                </div>
            )}
            <div className={`rest-customer-text ${bgClass}`}>
                <div className="rest-customer-name" ref={nameRef}>
                    <div className="rest-customer-name-inner" ref={moverRef}>
                        <span className="rest-customer-name-text" ref={textRef}>{event.customer}</span>
                        {/* Second copy, only while the name is cut off: what runs in behind the first. */}
                        {isCut && (
                            <span
                                className="rest-customer-name-text"
                                style={{marginLeft: SCROLL_GAP_PX}}
                                aria-hidden="true"
                            >
                                {event.customer}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {/* Both overlays for as long as the name is cut off: over the text, under the logo. */}
            {isSports && isCut && (
                <>
                    <div className="rest-sp-long" style={sportsLongStyle(SPORTS_THIN_CELL_LONG_SRC)} aria-hidden="true" />
                    <div className="rest-sp-long" style={sportsLongStyle(SPORTS_THIN_CELL_LONG_LEFT_SRC)} aria-hidden="true" />
                </>
            )}
        </div>
    )
}

// The mask's left / right extension in plain canvas px (default and rips styles).
function maskVars(m: {readonly left: number; readonly right: number}) {
    return {'--rest-mask-l': `${m.left}px`, '--rest-mask-r': `${m.right}px`}
}

// Sports cell: 9-slice of the plate art. Every art-px number is multiplied by
// (row height / art height), so at any row height the plate looks exactly like the art and only
// its middle stretches sideways. `--rest-row-h` is set on the grid by ThinResults.tsx.
// The slanted sides need wide slices, but the logo/name may come closer to the edge than that:
// the gap between the wanted padding and the slice is pulled back with negative margins
// (ThinResultsSports.css --rest-sp-pull-*).
function sportsCellStyle(): React.CSSProperties {
    const px = (artPx: number) => `calc(var(--rest-row-h, 44px) * ${artPx / SPORTS_THIN_CELL_ART_H})`
    const sl = SPORTS_THIN_CELL_SLICE
    const pad = SPORTS_THIN_CELL_PAD
    return {
        borderStyle: 'solid',
        borderWidth: `${px(sl.top)} ${px(sl.right)} ${px(sl.bottom)} ${px(sl.left)}`,
        borderImage: `url(${SPORTS_THIN_CELL_SRC}) ${sl.top} ${sl.right} ${sl.bottom} ${sl.left} fill stretch`,
        padding: `${px(Math.max(0, pad.top - sl.top))} ${px(Math.max(0, pad.right - sl.right))} ${px(Math.max(0, pad.bottom - sl.bottom))} ${px(Math.max(0, pad.left - sl.left))}`,
        '--rest-sp-pull-l': px(Math.max(0, sl.left - pad.left)),
        '--rest-sp-pull-r': px(Math.max(0, sl.right - pad.right)),
        '--rest-sp-logo': `calc(var(--rest-row-h, 44px) * ${SPORTS_THIN_LOGO})`,
        '--rest-sp-logo-dy': `calc(var(--rest-row-h, 44px) * ${SPORTS_THIN_LOGO_OFFSET_Y})`,
        '--rest-sp-text-dy': `calc(var(--rest-row-h, 44px) * ${SPORTS_THIN_TEXT_OFFSET_Y})`,
        '--rest-mask-l': px(SPORTS_THIN_TEXT_MASK_EXTEND.left),
        '--rest-mask-r': px(SPORTS_THIN_TEXT_MASK_EXTEND.right),
        '--rest-sp-font': `calc(var(--rest-row-h, 44px) * ${SPORTS_THIN_FONT})`,
    } as React.CSSProperties
}

// The long-name overlay: the cell's own 9-slice (same cuts, same scale) laid over the whole cell,
// border edge to border edge. The cell's padding box is smaller than that, so the overlay is
// pushed out by the border widths (absolute offsets are measured from the padding edge).
function sportsLongStyle(src: string): React.CSSProperties {
    const px = (artPx: number) => `calc(var(--rest-row-h, 44px) * ${artPx / SPORTS_THIN_CELL_ART_H})`
    const sl = SPORTS_THIN_CELL_SLICE
    return {
        top: `calc(${px(sl.top)} * -1)`,
        right: `calc(${px(sl.right)} * -1)`,
        bottom: `calc(${px(sl.bottom)} * -1)`,
        left: `calc(${px(sl.left)} * -1)`,
        borderStyle: 'solid',
        borderWidth: `${px(sl.top)} ${px(sl.right)} ${px(sl.bottom)} ${px(sl.left)}`,
        borderImage: `url(${src}) ${sl.top} ${sl.right} ${sl.bottom} ${sl.left} fill stretch`,
    }
}

export default ThinResultRow
