'use client'

// Settings for `board:rips_flat`: which front-face art the cells show ("Tiles") and what a sold
// cell's back looks like ("Back") — two independent selects (README "Rips board marble tiles").
// Like SportStyleBoardSettings' selects, each patches the element itself via `onPatchElement`
// (ElementsPanel's `mutate` -> debounced `pushConfig`); the board reads `element.tileSet` /
// `element.backStyle` on its next render, no backend endpoint involved.

import type {Element} from '@/app/obs/layout/schema'
import {
    DEFAULT_RIPS_BACK_STYLE,
    DEFAULT_RIPS_TILE_SET,
    RIPS_BACK_STYLES,
    RIPS_TILE_SETS,
    type RipsBackStyle,
    type RipsTileSet,
} from '@/app/obs/layout/elements/board-rips-flat/RipsFlatCell'
import type {PatchElement} from './ElementBlock'

type Props = {
    elementKey: string
    element: Element
    onPatchElement: PatchElement
}

const LABELS: Record<RipsTileSet, string> = {
    veined: 'Marble, veined',
    clean: 'Marble, clean centre',
    icons: 'Classic icons',
    marble_auto: 'Marble auto',
}

const BACK_LABELS: Record<RipsBackStyle, string> = {
    tiles: 'Grey tiles',
    flip_art: 'Flip art',
}

export default function RipsFlatBoardSettings({elementKey, element, onPatchElement}: Props) {
    if (element.kind !== 'board') return null
    const value: RipsTileSet = element.tileSet && (RIPS_TILE_SETS as readonly string[]).includes(element.tileSet) ? element.tileSet : DEFAULT_RIPS_TILE_SET
    const backValue: RipsBackStyle = element.backStyle && (RIPS_BACK_STYLES as readonly string[]).includes(element.backStyle) ? element.backStyle : DEFAULT_RIPS_BACK_STYLE

    return (
        <>
            <div className="mb-2">
                <label className="form-label mb-0 small">Tiles</label>
                <select
                    className="form-select form-select-sm"
                    style={{width: '200px'}}
                    value={value}
                    onChange={(e) => onPatchElement(elementKey, {tileSet: e.target.value as RipsTileSet})}
                >
                    {RIPS_TILE_SETS.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
                </select>
            </div>
            <div className="mb-2">
                <label className="form-label mb-0 small">Back</label>
                <select
                    className="form-select form-select-sm"
                    style={{width: '200px'}}
                    value={backValue}
                    onChange={(e) => onPatchElement(elementKey, {backStyle: e.target.value as RipsBackStyle})}
                >
                    {RIPS_BACK_STYLES.map((s) => <option key={s} value={s}>{BACK_LABELS[s]}</option>)}
                </select>
            </div>
        </>
    )
}
