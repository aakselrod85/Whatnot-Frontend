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
import {RIPS_THIN_CELL_SRC} from './ripsStyle'
import './ThinResultRow.css'

export function ThinResultRow({
    event,
    tier,
    highBidTeam,
    giveawayTeam,
    gridColumnStart,
    isRips = false,
}: {
    event: Event
    tier: Tier
    highBidTeam: string
    giveawayTeam: string
    /** Set only on the first cell of a short final row, to centre that row (see ThinResults). */
    gridColumnStart?: number
    /** The 'rips' style (ripsStyle.ts): the cell is painted with the plate art instead of the
     *  tier-coloured border. The path is handed to ThinResultsRips.css as a custom property so
     *  ripsStyle.ts stays the only place that names a file. */
    isRips?: boolean
}) {
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
    } as React.CSSProperties

    return (
        <div
            className={`rest-row-item rest-tier-${tier}`}
            style={gridColumnStart || isRips ? itemStyle : undefined}
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

export default ThinResultRow
