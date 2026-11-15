import {FC, useCallback, useEffect, useRef, useState} from 'react'
import {Event} from '@/app/entity/entities'
import {Exposure} from '../board-flat/tiles/types'
import {Manifest} from '../board-flat/tiles/manifest'
import {CellSkin} from '../board-flat/CellSkin'
import {RipsDoricFront} from './RipsDoricFront'
import './RipsFlatCell.css'

// marble_auto uses the approved Doric tier frames, red-veined marble and sports logos.
// Other sets and the saved tileSet values keep their existing behavior.
export const RIPS_TILE_SETS = ['veined', 'clean', 'icons', 'marble_auto'] as const
export type RipsTileSet = typeof RIPS_TILE_SETS[number]
export const DEFAULT_RIPS_TILE_SET: RipsTileSet = 'veined'

const tileSrc = (set: RipsTileSet, team: string) =>
    set === 'icons' ? `/images/new_teams/${team}.png` : `/images/rips_tiles/${set}/${team}.png`

// Canvas coordinates anchor the per-tier material texture.
export type MarbleOrigin = {x: number; y: number}

// Back-face style (README "Rips board marble tiles", "Back"), independent of `tileSet` — any front
// goes with either back. 'tiles' is the grey 3x3 sub-tile skin from board-flat (CellSkin +
// AccentOverlay), unchanged. 'flip_art' turns the sold cells into one painting (a random pick from
// rips_board/FlippedArt per page load, useFlipArt.ts), which is
// laid in *cover* over the rectangle of the WHOLE cell grid (MAX_COLS x rowCount cells, empty
// slots of a short row included, so the art never jumps on a re-deal) and each back face shows
// the piece under it — same technique as the marble sheet, but relative to the grid, not the
// canvas (`flipArt` below) — a little inside the cell edge, corners cut off into an octagon
// (RipsFlatCell.css `.rfb-art`), no frame. The cell itself only ever draws that as a SOLO back
// (grayscale): it is what flips and bursts. Once the cell settles, it joins the shape of sold
// cells it shares a side with, and FlipArtOverlay draws that shape's painting cut to its outline
// in one SVG on top — in colour for a shape of 2+, still grey for a shape of one — which is why no
// per-cell seams show inside a shape. Chosen per board element in /obs/controls (the element's
// `backStyle`).
export const RIPS_BACK_STYLES = ['tiles', 'flip_art'] as const
export type RipsBackStyle = typeof RIPS_BACK_STYLES[number]
export const DEFAULT_RIPS_BACK_STYLE: RipsBackStyle = 'tiles'

// The painting itself is picked at random per page load (useFlipArt.ts).
// Scale of the octagon's corner cut as a fraction of the cell (34 art px of the old frame art =
// this much). RipsFlatBoard rounds `cellPx * this` to whole px and hands it down as `--art-frame-px`.
export const FLIP_ART_FRAME_RATIO = (12 / 124) * (34 / 13)

// Where the cover-scaled painting lies relative to ONE cell: the sheet's px size and the offset
// of its top-left from the cell's top-left (both <= 0 for a cell inside the grid). Goes straight
// into background-size / background-position. Missing = the painting covers just this cell.
export type FlipArtPlacement = {src: string; sheetW: number; sheetH: number; x: number; y: number}

// Cover fit of an artW x artH painting over a gridW x gridH rectangle: scale up to the larger of
// the two ratios so no gap is left, centre the overflow on the other axis. Returns the sheet size
// and the sheet's top-left relative to the rectangle's top-left (<= 0).
export function flipArtCover(artW: number, artH: number, gridW: number, gridH: number): {sheetW: number; sheetH: number; offsetX: number; offsetY: number} {
    const scale = Math.max(gridW / artW, gridH / artH)
    const sheetW = artW * scale
    const sheetH = artH * scale
    return {sheetW, sheetH, offsetX: (gridW - sheetW) / 2, offsetY: (gridH - sheetH) / 2}
}

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
// A video that never ends must not hold the board forever, hence a watchdog: `PRESS_VIDEO_FALLBACK_MS`
// for it to start, then re-armed to `PRESS_VIDEO_STALL_MS` on every playback tick, so it only fires
// once playback has stopped moving. (It used to be a fixed "duration + 1s from metadata" timer, which
// cut the burst mid-fade whenever the heavy video started late or played slower than real time.)
const PRESS_VIDEO_SRC = '/videos/press_animation.webm'
const PRESS_VIDEO_DELAY_MS = 1050
const PRESS_VIDEO_FALLBACK_MS = 8000
const PRESS_VIDEO_STALL_MS = 4000

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
    // 'marble_auto' only (ignored by the other sets); missing = marble sheet at the cell's origin.
    marbleOrigin?: MarbleOrigin
    cellPx?: number
    backStyle?: RipsBackStyle
    // 'flip_art' only (ignored by 'tiles'): this cell's piece of the painting for its solo back.
    flipArt?: FlipArtPlacement
}

export const RipsFlatCell: FC<Props> = ({event, manifest, exposure, styleId, tier, alreadySettled, onSettled, style, tileSet = DEFAULT_RIPS_TILE_SET, marbleOrigin, cellPx = 66, backStyle = DEFAULT_RIPS_BACK_STYLE, flipArt}) => {
    const flipped = event.customer !== ''
    const skipAnimation = flipped && !!alreadySettled
    const [animating, setAnimating] = useState(false)
    const [showVideo, setShowVideo] = useState(false)

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

    const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const armWatchdog = useCallback((ms: number) => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current)
        watchdogRef.current = setTimeout(finishBurst, ms)
    }, [finishBurst])

    useEffect(() => {
        if (!showVideo) return
        armWatchdog(PRESS_VIDEO_FALLBACK_MS)
        return () => {
            if (watchdogRef.current) clearTimeout(watchdogRef.current)
            watchdogRef.current = null
        }
    }, [showVideo, armWatchdog])

    const contentClass = flipped ? (skipAnimation ? 'rfb-cell-final' : 'rfb-cell-flipped') : ''

    return (
        <div className={`rfb-cell ${animating ? 'rfb-cell-flipping' : ''} ${showVideo ? 'rfb-cell-active' : ''}`} style={style}>
            <div className={`rfb-cell-content ${contentClass}`} onAnimationEnd={(e) => { if (e.target === e.currentTarget) setAnimating(false) }}>
                <div className="rfb-face rfb-front">
                    {tileSet === 'marble_auto' ? (
                        <RipsDoricFront team={event.team} cellPx={cellPx} origin={marbleOrigin} sold={flipped} />
                    ) : (
                        <div className={tileSet === 'icons' ? 'rfb-tile' : 'rfb-tile rfb-tile-stone'}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, same as every other layout element */}
                            <img className="rfb-icon" src={tileSrc(tileSet, event.team)} alt={event.team} />
                        </div>
                    )}
                </div>
                <div className="rfb-face rfb-back">
                    {backStyle === 'flip_art' ? (
                        <div className="rfb-art-back rfb-art-mono">
                            <div
                                className="rfb-art"
                                style={flipArt ? {
                                    backgroundImage: `url("${flipArt.src}")`,
                                    backgroundSize: `${flipArt.sheetW}px ${flipArt.sheetH}px`,
                                    backgroundPosition: `${flipArt.x}px ${flipArt.y}px`,
                                } : undefined}
                            />
                        </div>
                    ) : manifest && exposure && styleId && tier ? (
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
                        onTimeUpdate={() => armWatchdog(PRESS_VIDEO_STALL_MS)}
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
