import {IsTeam, TeamIconSrc} from '@/app/common/teams'
import {sportsLogoFilter} from '@/app/obs/sport_style/logoFilter'
import {DORIC_FRAME, DORIC_OUTLINE, doricFrameStyle} from './doricMaterials'
import {ripsTierOf} from './ripsOrder'
import type {MarbleOrigin} from './RipsFlatCell'
import './RipsDoricFront.css'

type Props = {team: string; cellPx: number; origin?: MarbleOrigin; sold: boolean}

export function RipsDoricFront({team, cellPx, origin, sold}: Props) {
    const tier = ripsTierOf(team)
    // A broad vein pattern at roughly one-cell scale, anchored to canvas coordinates.
    // Moving/resizing the board still samples the sheet beneath each cell, as marble_auto did.
    const sheetPx = cellPx * 0.94 * 1.12
    const logo = IsTeam(team) || team === 'Miscellaneous'
    return (
        <div className={`rfb-tile rfb-tile-stone rfb-doric rfb-doric-${tier}${sold ? ' rfb-doric-sold' : ''}`}>
            <div className="rfb-doric-stone" style={{
                backgroundSize: `${sheetPx}px ${sheetPx}px`,
                backgroundPosition: `${-((origin?.x ?? 0) + cellPx * 0.03)}px ${-((origin?.y ?? 0) + cellPx * 0.03)}px`,
            }}>
                <div className="rfb-doric-gloss" />
            </div>
            {logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- OBS uses the original team assets
                <img className="rfb-doric-logo" src={TeamIconSrc(team)} alt={team} style={{filter: sportsLogoFilter(cellPx)}} />
            ) : (
                <span className="rfb-doric-label" style={{fontSize: cellPx * 0.14}}>{team}</span>
            )}
            <span className="rfb-doric-frame" style={{clipPath: DORIC_OUTLINE}} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- static fallback also travels with the 3D flip */}
                <img src={DORIC_FRAME[tier]} alt="" style={doricFrameStyle(tier)} />
            </span>
        </div>
    )
}
