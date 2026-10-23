'use client'

// Settings for `board:sport_priced`. Same model as SportStyleBoardSettings: the operator sets the
// box WIDTH (Box section) plus Cells per row / Ball cells / Tile shape / Margin here; height is
// derived and Fit height sizes the box to it. Config fields go through `onPatchElement`; the price
// cards (Side Cards Price, Board: Price Ranges, Presets) are cobra's own panel rendered as-is — this
// board reads the same channel-wide thresholds and series default price.

import {useState} from 'react'
import type {DurableCue, Element, Phase, TransientCue} from '@/app/obs/layout/schema'
import {DEFAULT_TURF} from '@/app/obs/sport_style/fieldConstants'
import {
    DEFAULT_BALL_COLS,
    DEFAULT_CELL_ASPECT,
    DEFAULT_PRICED_COLS,
    pricedFieldSize,
} from '@/app/obs/layout/elements/board-sport-priced/SportPricedBoard'
import type {PatchElement} from './ElementBlock'
import CobraBoardSettings from './CobraBoardSettings'
import {JsonField, isCustomBlob} from './JsonField'

type Props = {
    elementKey: string
    element: Element
    currentPhase: Phase
    channelId: number
    seriesId?: number | null
    onPatchElement: PatchElement
    onEmitCue?: (cue: TransientCue) => void
    onFireCue?: (cue: DurableCue) => void
}

// A full NFL break — the priced stream's usual slot count.
const DEFAULT_SLOTS = 32

export default function SportPricedBoardSettings({elementKey, element, currentPhase, channelId, seriesId, onPatchElement, onEmitCue, onFireCue}: Props) {
    const [slots, setSlots] = useState(DEFAULT_SLOTS)
    if (element.kind !== 'board') return null

    const cols = Math.max(2, Math.min(12, element.cols ?? DEFAULT_PRICED_COLS))
    const ballCols = Math.max(0, Math.min(cols - 1, element.ballCols ?? DEFAULT_BALL_COLS))
    const aspect = element.cellAspect ?? DEFAULT_CELL_ASPECT
    const margin = Math.max(0, element.margin ?? 0)
    const box = element.placements[currentPhase] ?? element.placements.all
    const {rows, fieldH} = pricedFieldSize(box?.w ?? 0, slots, cols, ballCols, aspect, margin)

    const num = (label: string, value: number, min: number, max: number, step: number, apply: (v: number) => void, title?: string) => (
        <div>
            <label className="form-label mb-0 small" title={title}>{label}</label>
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                className="form-control form-control-sm"
                style={{width: '90px'}}
                value={value}
                onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    if (Number.isFinite(v)) apply(Math.max(min, Math.min(max, v)))
                }}
            />
        </div>
    )

    return (
        <div>
            <div className="d-flex gap-3 mb-2 flex-wrap">
                {num('Cells per row', cols, 2, 12, 1, (v) => onPatchElement(elementKey, {cols: Math.round(v)}))}
                {num('Ball cells', ballCols, 0, Math.min(10, cols - 1), 1, (v) => onPatchElement(elementKey, {ballCols: Math.round(v)}),
                    'Cells of the middle row the football takes. 3 = ball with a "50" either side; 0 = no ball.')}
                {num('Tile shape', aspect, 1, 4, 0.1, (v) => onPatchElement(elementKey, {cellAspect: Math.round(v * 10) / 10}),
                    'Tile width ÷ height. 2 fits logo + "$375" at a readable size on 7 columns.')}
                {num('Margin', margin, 0, 200, 1, (v) => onPatchElement(elementKey, {margin: Math.round(v)}),
                    'Transparent band between the element edge and the field.')}
            </div>

            <CobraBoardSettings channelId={channelId} seriesId={seriesId} onFireCue={onFireCue}/>

            <div className="mb-2 mt-3">
                <label className="form-label mb-0 small" title="Display-only — not saved. Feeds the height readout below, since this panel has no live event data.">
                    Slots (for height readout)
                </label>
                <input
                    type="number"
                    min={0}
                    className="form-control form-control-sm"
                    style={{width: '90px'}}
                    value={slots}
                    onChange={(e) => setSlots(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
            </div>
            <div className="small text-muted mb-2">
                Field needs {fieldH}px for {rows} row{rows === 1 ? '' : 's'}
                {box ? ` (current box ${box.h}px)` : ' — not placed in this stage'}
            </div>
            <div className="d-flex gap-2 mb-3">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={!box}
                    onClick={() => box && onPatchElement(elementKey, {placements: {...element.placements, [currentPhase]: {...box, h: fieldH}}})}
                >
                    Fit height
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onEmitCue?.({kind: 'sport-style-regenerate', target: 'turf'})}
                >
                    Regenerate turf
                </button>
            </div>

            <details className="mb-3">
                <summary className="small">Turf recipe ({isCustomBlob(element.turf, DEFAULT_TURF) ? 'custom' : 'default'})</summary>
                <JsonField
                    label="Turf recipe (JSON)"
                    value={element.turf}
                    defaultValue={DEFAULT_TURF}
                    onApply={(parsed) => onPatchElement(elementKey, {turf: parsed})}
                />
            </details>
        </div>
    )
}
