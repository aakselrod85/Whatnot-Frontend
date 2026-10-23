import {FC, useCallback, useEffect, useState} from 'react'
import {Event} from '@/app/entity/entities'
import {CANVAS} from '../../schema'
import {Exposure} from '../board-flat/tiles/types'
import {Manifest} from '../board-flat/tiles/manifest'
import {CellSkin} from '../board-flat/CellSkin'
import {RIPS_FRAME_ASSETS} from '../frame/ripsAssets'
import './RipsFlatCell.css'

// Front-face art (README "Rips board marble tiles"). 'veined' / 'clean' are the marble stones in
// public/images/rips_tiles/ (scripts/rips-tiles/): they fill the whole cell so neighbouring stones
// touch and the board shows through their cut corners. 'icons' is the earlier new_teams octagon at
// 92% of the cell. 'marble_auto' is not a baked stone but three layers composed at render time
// (bottom to top, all edge to edge like the stones): the frame element's marble (BackFlat.png)
// clipped to an octagon, the gold CellFrame.png, and the team logo from rips_tiles/webp-rips/.
// The marble is the whole 1080x1920 canvas sheet (`CANVAS`) positioned so each cell shows the
// piece that lies under it on the canvas — veins run on across neighbours and shift with the
// board when the operator moves it; `marbleOrigin` (canvas px of the cell's top-left, from
// RipsFlatBoard) is what places it. Chosen per board element in /obs/controls (the element's
// `tileSet`).
export const RIPS_TILE_SETS = ['veined', 'clean', 'icons', 'marble_auto'] as const
export type RipsTileSet = typeof RIPS_TILE_SETS[number]
export const DEFAULT_RIPS_TILE_SET: RipsTileSet = 'veined'

const tileSrc = (set: RipsTileSet, team: string) =>
    set === 'icons' ? `/images/new_teams/${team}.png` : `/images/rips_tiles/${set}/${team}.png`

// 'marble_auto' parts. The logos are webp with their padding baked in (so the <img> is the full
// cell, no inset) — except Miscellaneous, which only exists as a PNG.
export const MARBLE_AUTO_FRAME_SRC = '/images/rips_tiles/CellFrame.png'
const marbleAutoLogoSrc = (team: string) =>
    `/images/rips_tiles/webp-rips/${team}.${team === 'Miscellaneous' ? 'png' : 'webp'}`

// Canvas px of a cell's top-left corner (see `marbleOrigin` above).
export type MarbleOrigin = {x: number; y: number}

// Back-face style (README "Rips board marble tiles", "Back"), independent of `tileSet` — any front
// goes with either back. 'tiles' is the grey 3x3 sub-tile skin from board-flat (CellSkin +
// AccentOverlay), unchanged. 'flip_art' turns the sold cells into one painting (a random pick from
// rips_board/FlippedArt per page load, useFlipArt.ts), which is
// laid in *cover* over the rectangle of the WHOLE cell grid (MAX_COLS x rowCount cells, empty
// slots of a short row included, so the art never jumps on a re-deal) and each back face shows
// the piece under it — same technique as the marble sheet, but relative to the grid, not the
// canvas (`flipArt` below) — under FlipArtCell.png as a CSS 9-slice frame, corners cut off along
// the frame's diagonal (RipsFlatCell.css `.rfb-art-back`). The cell itself only ever draws that
// as a SOLO back (full frame, grayscale): it is what flips and bursts. Once the cell settles, it
// joins the shape of sold cells it shares a side with, and FlipArtOverlay draws that shape's
// painting and gold outline (outer and inner corners) in one SVG on top — in colour for a shape of
// 2+, still grey for a shape of one — which is why no per-cell seams show inside a shape. Chosen
// per board element in /obs/controls (the element's `backStyle`).
export const RIPS_BACK_STYLES = ['tiles', 'flip_art'] as const
export type RipsBackStyle = typeof RIPS_BACK_STYLES[number]
export const DEFAULT_RIPS_BACK_STYLE: RipsBackStyle = 'tiles'

// The painting itself is picked at random per page load (useFlipArt.ts).
export const FLIP_ART_FRAME_SRC = '/images/rips_tiles/FlipArtCell.png'
// Exposed-side frame thickness as a fraction of the cell: the band's inner edge should land where
// the front gold's does in 'marble_auto' (12/124 of the cell, RipsFlatCell.css). In the 9-slice
// that inner edge sits 13 px into the 34 px slice (measured, see the CSS), hence the 34/13.
// RipsFlatBoard rounds `cellPx * this` to whole px and hands it down as `--art-frame-px`.
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
    // 'marble_auto' only (ignored by the other sets); missing = marble sheet at the cell's origin.
    marbleOrigin?: MarbleOrigin
    backStyle?: RipsBackStyle
    // 'flip_art' only (ignored by 'tiles'): this cell's piece of the painting for its solo back.
    flipArt?: FlipArtPlacement
}

export const RipsFlatCell: FC<Props> = ({event, manifest, exposure, styleId, tier, alreadySettled, onSettled, style, tileSet = DEFAULT_RIPS_TILE_SET, marbleOrigin, backStyle = DEFAULT_RIPS_BACK_STYLE, flipArt}) => {
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
                    {tileSet === 'marble_auto' ? (
                        <div className="rfb-tile rfb-tile-stone">
                            <div
                                className="rfb-marble"
                                style={{
                                    backgroundImage: `url(${RIPS_FRAME_ASSETS.back.src})`,
                                    backgroundSize: `${CANVAS.w}px ${CANVAS.h}px`,
                                    backgroundPosition: `${-(marbleOrigin?.x ?? 0)}px ${-(marbleOrigin?.y ?? 0)}px`,
                                }}
                            />
                            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, same as every other layout element */}
                            <img className="rfb-marble-frame" src={MARBLE_AUTO_FRAME_SRC} alt="" />
                            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>, same as every other layout element */}
                            <img className="rfb-icon rfb-marble-logo" src={marbleAutoLogoSrc(event.team)} alt={event.team} />
                        </div>
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
                            <div className="rfb-art-frame" />
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
