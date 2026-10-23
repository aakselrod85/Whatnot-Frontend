import {FC, useId} from 'react'
import {
    BAND_DEPTH,
    FRAME_H,
    FRAME_SLICE,
    FRAME_SRC,
    FRAME_W,
    INNER_ORIGIN,
    INNER_SIZE,
    INNER_SRC,
    type Corner,
    type FlipArtShape,
    type Side,
} from './flipArtShapes'
import './FlipArtOverlay.css'

// The 'flip_art' back for SETTLED cells (RipsFlatCell.tsx header): every shape of touching sold
// cells (flipArtShapes.ts) drawn as ONE inline SVG over the whole board — the painting clipped to
// each shape's outline, then the gold frame pieces along it (straight bands and outer corners cut
// from FlipArtCell.png, inner corners from FlipArtFrameInnerCorner.png). One SVG in one coordinate
// space (like board-flat/CellSkin.tsx) so pieces share exact coordinates and no seams open between
// cells. A shape of one cell is grey, two or more in colour.
//
// The cells underneath still draw their own solo back (art + full frame), which this covers. A sold
// cell still playing its flip and burst is in no shape: its own back is what flips and bursts,
// above this layer (RipsFlatCell.css z-indexes).

interface Props {
    shapes: FlipArtShape[]
    // The picked painting (useFlipArt.ts), cover-fit over the whole grid (RipsFlatCell.tsx
    // flipArtCover): size and top-left relative to the grid's top-left.
    sheet: {src: string; sheetW: number; sheetH: number; offsetX: number; offsetY: number}
    // The grid's top-left inside the board element, and the frame thickness on screen.
    padLeft: number
    padTop: number
    framePx: number
}

// Which part of FlipArtCell.png a straight band shows (art px): the plain run of that edge, but only
// as long as the piece needs at the frame's scale (`len` = the piece's length / k), so the band is
// never squeezed along its length. Squeezing it (e.g. the whole 306 px side into a 37 px piece)
// makes Chrome sample the image at a much smaller mip level, which blurs the band ACROSS too — it
// came out soft and see-through on short runs like a one-cell bump of a shape. Longer pieces than
// the plain run just stretch it, which upscales and stays sharp.
function bandView(side: Side, len: number): string {
    const along = (max: number) => Math.min(max, Math.max(1, len))
    const h = along(FRAME_W - 2 * FRAME_SLICE)
    const v = along(FRAME_H - 2 * FRAME_SLICE)
    if (side === 'top') return `${FRAME_SLICE} 0 ${h} ${BAND_DEPTH}`
    if (side === 'bottom') return `${FRAME_SLICE} ${FRAME_H - BAND_DEPTH} ${h} ${BAND_DEPTH}`
    if (side === 'left') return `0 ${FRAME_SLICE} ${BAND_DEPTH} ${v}`
    return `${FRAME_W - BAND_DEPTH} ${FRAME_SLICE} ${BAND_DEPTH} ${v}`
}
const CORNER_VIEW: Record<Corner, string> = {
    tl: `0 0 ${FRAME_SLICE} ${FRAME_SLICE}`,
    tr: `${FRAME_W - FRAME_SLICE} 0 ${FRAME_SLICE} ${FRAME_SLICE}`,
    br: `${FRAME_W - FRAME_SLICE} ${FRAME_H - FRAME_SLICE} ${FRAME_SLICE} ${FRAME_SLICE}`,
    bl: `0 ${FRAME_H - FRAME_SLICE} ${FRAME_SLICE} ${FRAME_SLICE}`,
}

// A window onto part of FlipArtCell.png, stretched to the box (a nested <svg> clips to itself).
const FramePiece: FC<{x: number; y: number; w: number; h: number; view: string}> = ({x, y, w, h, view}) => (
    <svg x={x} y={y} width={w} height={h} viewBox={view} preserveAspectRatio="none">
        <image href={FRAME_SRC} width={FRAME_W} height={FRAME_H} preserveAspectRatio="none" />
    </svg>
)

export const FlipArtOverlay: FC<Props> = ({shapes, sheet, padLeft, padTop, framePx}) => {
    const id = useId().replace(/:/g, '')
    const k = framePx / FRAME_SLICE
    const colour = shapes.filter((s) => s.cells > 1).map((s) => s.clip).join('')
    const mono = shapes.filter((s) => s.cells === 1).map((s) => s.clip).join('')
    const painting = (clipId: string) => (
        <image
            href={sheet.src}
            x={sheet.offsetX}
            y={sheet.offsetY}
            width={sheet.sheetW}
            height={sheet.sheetH}
            preserveAspectRatio="none"
            clipPath={`url(#${clipId})`}
        />
    )
    return (
        <svg className="rfb-art-layer" width="100%" height="100%">
            <defs>
                <clipPath id={`${id}-colour`}><path d={colour} clipRule="nonzero" /></clipPath>
                <clipPath id={`${id}-mono`}><path d={mono} clipRule="nonzero" /></clipPath>
                <filter id={`${id}-grey`} colorInterpolationFilters="sRGB">
                    <feColorMatrix type="saturate" values="0" />
                </filter>
            </defs>
            <g transform={`translate(${padLeft} ${padTop})`}>
                {colour && painting(`${id}-colour`)}
                {mono && <g filter={`url(#${id}-grey)`}>{painting(`${id}-mono`)}</g>}
                {shapes.map((shape) => (
                    <g key={shape.key}>
                        {shape.straight.map((p, i) => (
                            <FramePiece key={`s${i}`} x={p.x} y={p.y} w={p.w} h={p.h} view={bandView(p.side, (p.side === 'top' || p.side === 'bottom' ? p.w : p.h) / k)} />
                        ))}
                        {shape.corners.map((p, i) => (
                            <FramePiece key={`c${i}`} x={p.x} y={p.y} w={p.size} h={p.size} view={CORNER_VIEW[p.corner]} />
                        ))}
                        {shape.inner.map((p, i) => (
                            <image
                                key={`i${i}`}
                                href={INNER_SRC}
                                x={p.dx - INNER_ORIGIN}
                                y={p.dy - INNER_ORIGIN}
                                width={INNER_SIZE}
                                height={INNER_SIZE}
                                transform={`translate(${p.x} ${p.y}) scale(${p.sx * k} ${p.sy * k})`}
                            />
                        ))}
                    </g>
                ))}
            </g>
        </svg>
    )
}
