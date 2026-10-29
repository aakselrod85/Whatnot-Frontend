import {FC, useId} from 'react'
import {type FlipArtShape} from './flipArtShapes'
import './FlipArtOverlay.css'

// The 'flip_art' back for SETTLED cells (RipsFlatCell.tsx header): every shape of touching sold
// cells (flipArtShapes.ts) drawn as ONE inline SVG over the whole board — the painting clipped to
// each shape's outline, no frame. One SVG in one coordinate space (like board-flat/CellSkin.tsx)
// so no seams open between cells. The more cells a shape has the less grey it is: one cell fully
// grey, `FULL_COLOUR_CELLS` or more fully in colour, even steps between (greyOf). It changes in one
// jump when the shape grows or merges.
//
// The cells underneath still draw their own solo back, which this covers. A sold cell still
// playing its flip and burst is in no shape: its own back is what flips and bursts, above this
// layer (RipsFlatCell.css z-indexes).

// Shape size at which the painting is fully in colour.
const FULL_COLOUR_CELLS = 9

// 1 cell -> 1 (fully grey) ... FULL_COLOUR_CELLS or more -> 0 (colour), in equal steps.
const greyOf = (cells: number) => Math.max(0, (FULL_COLOUR_CELLS - cells) / (FULL_COLOUR_CELLS - 1))

interface Props {
    shapes: FlipArtShape[]
    // The picked painting (useFlipArt.ts), cover-fit over the whole grid (RipsFlatCell.tsx
    // flipArtCover): size and top-left relative to the grid's top-left.
    sheet: {src: string; sheetW: number; sheetH: number; offsetX: number; offsetY: number}
    // The grid's top-left inside the board element.
    padLeft: number
    padTop: number
}

export const FlipArtOverlay: FC<Props> = ({shapes, sheet, padLeft, padTop}) => {
    const id = useId().replace(/:/g, '')
    // Shapes of the same grey level share one mask, so one painting layer per level.
    const levels = new Map<number, string>()
    for (const shape of shapes) {
        const grey = +greyOf(shape.cells).toFixed(4)
        levels.set(grey, (levels.get(grey) ?? '') + shape.clip)
    }
    const layers = Array.from(levels.entries())
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
                {layers.map(([grey, clip], i) => (
                    <clipPath key={`c${i}`} id={`${id}-clip${i}`}><path d={clip} clipRule="nonzero" /></clipPath>
                ))}
                {layers.filter(([grey]) => grey > 0).map(([grey], i) => (
                    <filter key={`f${i}`} id={`${id}-grey${grey.toString().replace('.', '_')}`} colorInterpolationFilters="sRGB">
                        <feColorMatrix type="saturate" values={String(1 - grey)} />
                    </filter>
                ))}
            </defs>
            <g transform={`translate(${padLeft} ${padTop})`}>
                {layers.map(([grey], i) => grey > 0
                    ? <g key={i} filter={`url(#${id}-grey${grey.toString().replace('.', '_')})`}>{painting(`${id}-clip${i}`)}</g>
                    : <g key={i}>{painting(`${id}-clip${i}`)}</g>)}
            </g>
        </svg>
    )
}
