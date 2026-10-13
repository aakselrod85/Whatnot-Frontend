import {FC, useCallback, useEffect, useState} from 'react'
import {Event} from '@/app/entity/entities'
import {Exposure} from '../board-flat/tiles/types'
import {Manifest} from '../board-flat/tiles/manifest'
import {CellSkin} from '../board-flat/CellSkin'
import './RipsFlatCell.css'

// Front-face art (README "Rips board marble tiles"). 'veined' / 'clean' are the marble stones in
// public/images/rips_tiles/ (scripts/rips-tiles/): they fill the whole cell so neighbouring stones
// touch and the board shows through their cut corners. 'icons' is the earlier new_teams octagon at
// 92% of the cell. Chosen per board element in /obs/controls (the element's `tileSet`).
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
//
// The press burst is the old flat board's (obs/[id]/flat/flatEventComponent.tsx, where it sits
// behind ENABLE_PRESS_VIDEO): `PRESS_VIDEO_SRC` at 650% of the cell, centred on it, started
// `PRESS_VIDEO_DELAY_MS` into the 1.2s flip so it lands as the cell drops back, removed when it
// ends. Only a cell that sells while the board is watching gets it — same gate as the flip.
//
// `onSettled` fires when the BURST ends, not the flip: the board holds the cell in its slot (and
// out of the shared skin grouping) until then, so the whole effect plays where the team was sold.
// A video that never ends must not hold the board forever, hence the fallback timer: the video's
// own length plus a margin once known, `PRESS_VIDEO_FALLBACK_MS` until then.
const PRESS_VIDEO_SRC = '/videos/press_animation.webm'
const PRESS_VIDEO_DELAY_MS = 1050
const PRESS_VIDEO_FALLBACK_MS = 8000
const PRESS_VIDEO_MARGIN_MS = 1000

interface Props {
    event: Event
    manifest?: Manifest | null
    exposure?: Exposure
    styleId?: string
    tier?: number
    alreadySettled?: boolean
    onSettled?: (id: number) => void
    style?: React.CSSProperties
    tileSet?: RipsTileSet
}

export const RipsFlatCell: FC<Props> = ({event, manifest, exposure, styleId, tier, alreadySettled, onSettled, style, tileSet = DEFAULT_RIPS_TILE_SET}) => {
    const flipped = event.customer !== ''
    const skipAnimation = flipped && !!alreadySettled
    const [animating, setAnimating] = useState(false)
    const [showVideo, setShowVideo] = useState(false)
    const [fallbackMs, setFallbackMs] = useState(PRESS_VIDEO_FALLBACK_MS)

    useEffect(() => {
        setAnimating(flipped && !skipAnimation)
    }, [flipped, skipAnimation])

    // `skipAnimation` turns true once the board settles the cell — after the burst, or straight
    // away for a cell sold at mount, which is the only case where it cancels the timer. Only an
    // un-sell hides a playing video early.
    useEffect(() => {
        if (!flipped) {
            setShowVideo(false)
            return
        }
        if (skipAnimation) return
        const t = setTimeout(() => setShowVideo(true), PRESS_VIDEO_DELAY_MS)
        return () => clearTimeout(t)
    }, [flipped, skipAnimation])

    const eventId = event.id
    const finishBurst = useCallback(() => {
        setShowVideo(false)
        onSettled?.(eventId)
    }, [onSettled, eventId])

    useEffect(() => {
        if (!showVideo) return
        const t = setTimeout(finishBurst, fallbackMs)
        return () => clearTimeout(t)
    }, [showVideo, fallbackMs, finishBurst])

    const contentClass = flipped ? (skipAnimation ? 'rfb-cell-final' : 'rfb-cell-flipped') : ''

    return (
        <div className={`rfb-cell ${animating ? 'rfb-cell-flipping' : ''} ${showVideo ? 'rfb-cell-active' : ''}`} style={style}>
            <div className={`rfb-cell-content ${contentClass}`} onAnimationEnd={() => setAnimating(false)}>
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
            {showVideo && (
                <div className="rfb-video-overlay">
                    <video
                        autoPlay
                        muted
                        playsInline
                        onLoadedMetadata={(e) => {
                            const d = e.currentTarget.duration
                            if (Number.isFinite(d)) setFallbackMs(d * 1000 + PRESS_VIDEO_MARGIN_MS)
                        }}
                        onEnded={finishBurst}
                        onError={finishBurst}
                    >
                        <source src={PRESS_VIDEO_SRC} type="video/webm" />
                    </video>
                </div>
            )}
        </div>
    )
}
