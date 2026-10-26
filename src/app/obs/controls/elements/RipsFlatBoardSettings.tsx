'use client'

// Settings for `board:rips_flat`: which front-face art the cells show ("Tiles") and what a sold
// cell's back looks like ("Back") — two independent selects (README "Rips board marble tiles") —
// plus where cells go ("Replacing after selling" = `soldPlacement`, "Grouping type" = `cellOrder`,
// board-rips-flat/ripsOrder.ts). Like SportStyleBoardSettings' selects, each patches the element
// itself via `onPatchElement` (ElementsPanel's `mutate` -> debounced `pushConfig`); the board reads
// them on its next render, no backend endpoint involved.

import type {Element} from '@/app/obs/layout/schema'
import {
    DEFAULT_RIPS_BACK_STYLE,
    DEFAULT_RIPS_TILE_SET,
    RIPS_BACK_STYLES,
    RIPS_TILE_SETS,
    type RipsBackStyle,
    type RipsTileSet,
} from '@/app/obs/layout/elements/board-rips-flat/RipsFlatCell'
import {
    DEFAULT_RIPS_CELL_ORDER,
    DEFAULT_RIPS_SOLD_PLACEMENT,
    RIPS_CELL_ORDERS,
    RIPS_SOLD_PLACEMENTS,
    type RipsCellOrder,
    type RipsSoldPlacement,
} from '@/app/obs/layout/elements/board-rips-flat/ripsOrder'
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

const SOLD_PLACEMENT_LABELS: Record<RipsSoldPlacement, string> = {
    sides: 'After selling cells replace on sides',
    stay: 'After selling cells stay on its place',
}

const CELL_ORDER_LABELS: Record<RipsCellOrder, string> = {
    tier: 'Tier sorting',
    alphabet: 'Alphabet order',
}

export default function RipsFlatBoardSettings({elementKey, element, onPatchElement}: Props) {
    if (element.kind !== 'board') return null
    const value: RipsTileSet = element.tileSet && (RIPS_TILE_SETS as readonly string[]).includes(element.tileSet) ? element.tileSet : DEFAULT_RIPS_TILE_SET
    const backValue: RipsBackStyle = element.backStyle && (RIPS_BACK_STYLES as readonly string[]).includes(element.backStyle) ? element.backStyle : DEFAULT_RIPS_BACK_STYLE
    const soldValue: RipsSoldPlacement = element.soldPlacement && (RIPS_SOLD_PLACEMENTS as readonly string[]).includes(element.soldPlacement) ? element.soldPlacement : DEFAULT_RIPS_SOLD_PLACEMENT
    const orderValue: RipsCellOrder = element.cellOrder && (RIPS_CELL_ORDERS as readonly string[]).includes(element.cellOrder) ? element.cellOrder : DEFAULT_RIPS_CELL_ORDER

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
            <div className="mb-2">
                <label className="form-label mb-0 small">Replacing after selling</label>
                <select
                    className="form-select form-select-sm"
                    style={{width: '280px'}}
                    value={soldValue}
                    onChange={(e) => onPatchElement(elementKey, {soldPlacement: e.target.value as RipsSoldPlacement})}
                >
                    {RIPS_SOLD_PLACEMENTS.map((s) => <option key={s} value={s}>{SOLD_PLACEMENT_LABELS[s]}</option>)}
                </select>
            </div>
            <div className="mb-2">
                <label className="form-label mb-0 small">Grouping type</label>
                <select
                    className="form-select form-select-sm"
                    style={{width: '200px'}}
                    value={orderValue}
                    onChange={(e) => onPatchElement(elementKey, {cellOrder: e.target.value as RipsCellOrder})}
                >
                    {RIPS_CELL_ORDERS.map((s) => <option key={s} value={s}>{CELL_ORDER_LABELS[s]}</option>)}
                </select>
            </div>
        </>
    )
}
