import {FC} from 'react'
import {Group} from '../board-flat/tiles/types'
import './FlipArtOverlay.css'

// The 'flip_art' back for SETTLED groups (RipsFlatCell.tsx header): one grid item per group, spanning
// its rectangle, with the painting and the 9-slice frame drawn once over the whole group. Drawing
// it per cell (each cell its own slice of the sheet, each a separate 3D-transformed layer) left
// hairline seams between the cells of a group; one box per group has none. Mirrors
// AccentOverlay (board-flat) in how it sits over the grid, so the boxes coincide with the cells.
//
// The cells underneath still draw their own solo back (art + full frame), which this covers
// completely except in the cut corners — where the cell's own corner cut coincides, so the board
// shows through. A sold cell still playing its effect is not in `groups`; its own back is what
// flips and bursts, above this layer (RipsFlatCell.css z-indexes).

interface Props {
    groups: Group[]
    // The picked painting (useFlipArt.ts), cover-fit over the whole grid (RipsFlatCell.tsx
    // flipArtCover), and the cell size.
    sheet: {src: string; sheetW: number; sheetH: number; offsetX: number; offsetY: number}
    cellPx: number
    cols: number
    rows: number
}

export const FlipArtOverlay: FC<Props> = ({groups, sheet, cellPx, cols, rows}) => (
    <div className="rfb-art-layer" style={{'--cols': cols, '--rows': rows} as React.CSSProperties}>
        {groups.map((group) => (
            <div
                key={group.key}
                className={`rfb-art-back ${group.cells === 1 ? 'rfb-art-mono' : ''}`}
                style={{
                    gridColumn: `${group.c0 + 1} / ${group.c1 + 2}`,
                    gridRow: `${group.r0 + 1} / ${group.r1 + 2}`,
                }}
            >
                <div
                    className="rfb-art"
                    style={{
                        backgroundImage: `url("${sheet.src}")`,
                        backgroundSize: `${sheet.sheetW}px ${sheet.sheetH}px`,
                        backgroundPosition: `${sheet.offsetX - group.c0 * cellPx}px ${sheet.offsetY - group.r0 * cellPx}px`,
                    }}
                />
                <div className="rfb-art-frame" />
            </div>
        ))}
    </div>
)
