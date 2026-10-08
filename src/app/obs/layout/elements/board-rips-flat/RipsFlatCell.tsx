import {FC, useEffect, useState} from 'react'
import {Event} from '@/app/entity/entities'
import {Exposure} from '../board-flat/tiles/types'
import {Manifest} from '../board-flat/tiles/manifest'
import {CellSkin} from '../board-flat/CellSkin'
import './RipsFlatCell.css'

// Front-face art (README "Rips board marble tiles"). 'veined' / 'clean' are the marble stones in
// public/images/rips_tiles/ (scripts/rips-tiles/): they fill the whole cell so neighbouring stones
// touch and the board shows through their cut corners. 'icons' is the earlier new_teams octagon at
// 92% of the cell. The OBS page URL can override the default per source: `?ripsTiles=clean`.
export const RIPS_TILE_SETS = ['veined', 'clean', 'icons'] as const
export type RipsTileSet = typeof RIPS_TILE_SETS[number]
export const DEFAULT_RIPS_TILE_SET: RipsTileSet = 'veined'

const tileSrc = (set: RipsTileSet, team: string) =>
    set === 'icons' ? `/images/new_teams/${team}.png` : `/images/rips_tiles/${set}/${team}.png`

// Adapted from board-flat/flatEventComponent.tsx (copied, not imported — the front face differs,
// rips-flat-board-plan.md §5). Front: flat's team icon on its own (its baked-in gold octagon is the
// only frame; the Frame_Empty.png overlay was removed 2026-10-07 on request). Back: flat's CellSkin.
// `alreadySettled` has flat's meaning: a cell sold at mount renders straight into the static
// `rfb-cell-final` class (no animation), so a fresh mount never replays every flip at once.
interface Props {
    event: Event
    manifest?: Manifest | null
    exposure?: Exposure
    styleId?: string
    tier?: number
    alreadySettled?: boolean
    onFlipComplete?: (id: number) => void
    style?: React.CSSProperties
    tileSet?: RipsTileSet
}

export const RipsFlatCell: FC<Props> = ({event, manifest, exposure, styleId, tier, alreadySettled, onFlipComplete, style, tileSet = DEFAULT_RIPS_TILE_SET}) => {
    const flipped = event.customer !== ''
    const skipAnimation = flipped && !!alreadySettled
    const [animating, setAnimating] = useState(false)

    useEffect(() => {
        setAnimating(flipped && !skipAnimation)
    }, [flipped, skipAnimation])

    const contentClass = flipped ? (skipAnimation ? 'rfb-cell-final' : 'rfb-cell-flipped') : ''

    return (
        <div className={`rfb-cell ${animating ? 'rfb-cell-flipping' : ''}`} style={style}>
            <div className={`rfb-cell-content ${contentClass}`} onAnimationEnd={() => { setAnimating(false); if (flipped) onFlipComplete?.(event.id) }}>
                <div className="rfb-face rfb-front">
                    <div className={tileSet === 'icons' ? 'rfb-tile' : 'rfb-tile rfb-tile-stone'}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, same as every other layout element */}
                        <img className="rfb-icon" src={tileSrc(tileSet, event.team)} alt={event.team} />
                    </div>
                </div>
                <div className="rfb-face rfb-back">
                    {manifest && exposure && styleId && tier ? (
                        <CellSkin manifest={manifest} exposure={exposure} styleId={styleId} tier={tier} cellKey={String(event.id)} />
                    ) : (
                        <div className="rfb-back-fallback" />
                    )}
                </div>
            </div>
        </div>
    )
}
