// One row of the `resultsThin` element (obs-layout-plan.md §2.4). Sibling of
// elements/results/ResultRow.tsx — same team-icon source and high-bid/giveaway color coding, and
// sized the same way: everything in it (icon, abbreviation tile, name) is a fraction of the row
// height ThinResults.tsx derives from `box.h / rows` and sets on the grid as `--rest-row-h` (see
// ThinResultRow.css). The only difference is the arrangement — a single compact row, icon beside
// the name, rather than the full board's two-line boxed cell.

import type {Event} from '@/app/entity/entities'
import {IsTeam} from '@/app/common/teams'
import {getSpotAbbreviation} from '@/app/common/spot_label'
import type {Tier} from '../results/tiers'
import {getTeamImageSrc} from '../results/ResultRow'
import type {ResultsThinStyle} from '../../schema'
import {RIPS_THIN_CELL_SRC} from './ripsStyle'
import {
    SPORTS_THIN_CELL_ART_H,
    SPORTS_THIN_CELL_PAD,
    SPORTS_THIN_CELL_SLICE,
    SPORTS_THIN_CELL_SRC,
    SPORTS_THIN_FONT,
    SPORTS_THIN_LOGO,
    SPORTS_THIN_LOGO_OFFSET_Y,
    SPORTS_THIN_TEXT_OFFSET_Y,
} from './sportsStyle'
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
    } as React.CSSProperties

    return (
        <div
            className={`rest-row-item rest-tier-${tier}`}
            style={gridColumnStart || isRips || isSports ? itemStyle : undefined}
        >
            {IsTeam(event.team) ? (
                <img className="rest-image" src={getTeamImageSrc(event.team)} alt={event.team} />
            ) : (
                <div className="rest-abbr">
                    <span>{getSpotAbbreviation(event.team)}</span>
                </div>
            )}
            <div className={`rest-customer-text ${bgClass}`}>
                <div className="rest-customer-name">{event.customer}</div>
            </div>
        </div>
    )
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
        '--rest-sp-font': `calc(var(--rest-row-h, 44px) * ${SPORTS_THIN_FONT})`,
    } as React.CSSProperties
}

export default ThinResultRow
