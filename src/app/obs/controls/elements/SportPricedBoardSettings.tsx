'use client'

// Settings for `board:sport_priced`. The operator sets the box WIDTH AND HEIGHT (Box section); the
// tiles size themselves to fill it (pricedFillLayout.ts). Reference columns / Tile shape
// size the football and the field ticks, Margin insets the field. Config fields go through `onPatchElement`; the price
// cards (Side Cards Price, Board: Price Ranges, Presets) are cobra's own panel rendered as-is — this
// board reads the same channel-wide thresholds and series default price.

import {useState} from 'react'
import type {DurableCue, Element, Phase, TransientCue} from '@/app/obs/layout/schema'
import {DEFAULT_PRICED_TURF} from '@/app/obs/sport_style/fieldConstants'
import {
    DEFAULT_CELL_ASPECT,
    DEFAULT_PRICED_COLS,
} from '@/app/obs/layout/elements/board-sport-priced/SportPricedBoard'
import {fillSummary} from '@/app/obs/sport_style/pricedFillLayout'
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
    const [goldSlots, setGoldSlots] = useState(3)
    const [silverSlots, setSilverSlots] = useState(9)
    if (element.kind !== 'board') return null

    const cols = Math.max(2, Math.min(12, element.cols ?? DEFAULT_PRICED_COLS))
    const aspect = element.cellAspect ?? DEFAULT_CELL_ASPECT
    const margin = Math.max(0, element.margin ?? 0)
    const box = element.placements[currentPhase] ?? element.placements.all
    const summary = box ? fillSummary(slots, box.w, box.h, element, {cols: DEFAULT_PRICED_COLS, aspect: DEFAULT_CELL_ASPECT}, element.tierSizing ? {best: goldSlots, good: silverSlots} : undefined) : undefined

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
                {num('Reference columns', cols, 2, 12, 1, (v) => onPatchElement(elementKey, {cols: Math.round(v)}),
                    'Sizes the field ticks and padding; tiles size themselves to the box')}
                {num('Tile shape', aspect, 1, 4, 0.1, (v) => onPatchElement(elementKey, {cellAspect: Math.round(v * 10) / 10}),
                    'Tile width ÷ height. 2 fits logo + "$375" at a readable size on 7 columns.')}
                {num('Margin', margin, 0, 200, 1, (v) => onPatchElement(elementKey, {margin: Math.round(v)}),
                    'Transparent band between the element edge and the field.')}
            </div>

            <div className="form-check mb-2">
                <input id={`${elementKey}-tier-sizing`} type="checkbox" className="form-check-input"
                    checked={element.tierSizing ?? false}
                    onChange={(e) => onPatchElement(elementKey, {tierSizing: e.target.checked})}/>
                <label className="form-check-label small" htmlFor={`${elementKey}-tier-sizing`}>Larger gold / silver tiles</label>
            </div>
            {element.tierSizing && <div className="small text-muted mb-2">
                Gold 120%, silver 110%; other tiles keep their normal size. Tiles grow to fill the box.
            </div>}

            <div className="form-check mb-2">
                <input
                    id={`${elementKey}-shine`}
                    type="checkbox"
                    className="form-check-input"
                    checked={element.shine ?? true}
                    onChange={(e) => onPatchElement(elementKey, {shine: e.target.checked})}
                />
                <label className="form-check-label small" htmlFor={`${elementKey}-shine`} title="Continuous champagne sweep and strong glow on gold; occasional sweep on silver.">
                    Gold / silver shine
                </label>
            </div>

            <div className="mb-2">
                <label className="form-label mb-0 small" title="gated: cells turn sold only when a Hit sequence reveals them (90 s safety)">Sold reveal</label>
                <select
                    className="form-select form-select-sm"
                    value={element.soldReveal === 'gated' ? 'gated' : 'immediate'}
                    onChange={(e) => onPatchElement(elementKey, {soldReveal: e.target.value as 'immediate' | 'gated'})}
                >
                    <option value="immediate">Immediate</option>
                    <option value="gated">Gated</option>
                </select>
            </div>

            <CobraBoardSettings channelId={channelId} seriesId={seriesId} onFireCue={onFireCue}/>

            <div className="mb-2 mt-3">
                <label className="form-label mb-0 small" title="Display-only — not saved. Feeds the tile-size readout below, since this panel has no live event data.">
                    Slots (for tile-size readout)
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
            {element.tierSizing && <div className="d-flex gap-3 mb-2">
                {num('Gold slots (estimate)', goldSlots, 0, slots, 1, v => setGoldSlots(Math.round(v)))}
                {num('Silver slots (estimate)', silverSlots, 0, Math.max(0, slots - goldSlots), 1, v => setSilverSlots(Math.round(v)))}
            </div>}
            <div className="small text-muted mb-2">
                {summary ? `With ${slots} slots: base tiles ${summary.tileW}×${summary.tileH} px (rows stretch to full width) in ${summary.rows} row${summary.rows === 1 ? '' : 's'}` : 'Not placed in this stage'}
            </div>
            <div className="d-flex gap-2 mb-3">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => onEmitCue?.({kind: 'sport-style-regenerate', target: 'turf'})}
                >
                    Regenerate turf
                </button>
            </div>

            <details className="mb-3">
                <summary className="small">Turf recipe ({isCustomBlob(element.turf, DEFAULT_PRICED_TURF) ? 'custom' : 'default'})</summary>
                <JsonField
                    label="Turf recipe (JSON)"
                    value={element.turf}
                    defaultValue={DEFAULT_PRICED_TURF}
                    onApply={(parsed) => onPatchElement(elementKey, {turf: parsed})}
                />
            </details>
        </div>
    )
}
