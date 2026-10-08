'use client'

// Settings for `board:rips_flat`: which front-face art the cells show (README "Rips board marble
// tiles"). Like SportStyleBoardSettings' selects, it patches the element itself via
// `onPatchElement` (ElementsPanel's `mutate` -> debounced `pushConfig`); the board reads
// `element.tileSet` on its next render, no backend endpoint involved.

import type {Element} from '@/app/obs/layout/schema'
import {DEFAULT_RIPS_TILE_SET, RIPS_TILE_SETS, type RipsTileSet} from '@/app/obs/layout/elements/board-rips-flat/RipsFlatCell'
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
}

export default function RipsFlatBoardSettings({elementKey, element, onPatchElement}: Props) {
    if (element.kind !== 'board') return null
    const value: RipsTileSet = element.tileSet && (RIPS_TILE_SETS as readonly string[]).includes(element.tileSet) ? element.tileSet : DEFAULT_RIPS_TILE_SET

    return (
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
    )
}
