'use client'

// Settings for `teamBreakdown` (schema.ts): the column count and the Topps Dynasty toggle (adds
// each team's soccer club). Both live on the element in LayoutConfig, so they go through
// `onPatchElement` like ThinResultsSettings' `columns` — no backend write.

import type { Element } from '@/app/obs/layout/schema'
import { DEFAULT_COLUMNS, DEFAULT_TOPPS_DYNASTY } from '@/app/obs/layout/elements/team-breakdown/tuning'
import type { PatchElement } from './ElementBlock'

type Props = {
    elementKey: string
    element: Element
    onPatchElement: PatchElement
}

export default function TeamBreakdownSettings({ elementKey, element, onPatchElement }: Props) {
    if (element.kind !== 'teamBreakdown') return null

    const columns = element.columns ?? DEFAULT_COLUMNS
    const toppsDynasty = element.toppsDynasty ?? DEFAULT_TOPPS_DYNASTY

    return (
        <div className="d-flex gap-3 flex-wrap align-items-end">
            <div className="mb-2">
                <label className="form-label mb-0 small">Columns</label>
                <input
                    type="number"
                    min={1}
                    step={1}
                    className="form-control form-control-sm"
                    style={{ width: '90px' }}
                    value={columns}
                    onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10)
                        onPatchElement(elementKey, { columns: Number.isFinite(parsed) && parsed >= 1 ? parsed : 1 })
                    }}
                />
            </div>
            <div className="form-check mb-2">
                <input
                    id={`${elementKey}-topps-dynasty`}
                    type="checkbox"
                    className="form-check-input"
                    checked={toppsDynasty}
                    onChange={(e) => onPatchElement(elementKey, { toppsDynasty: e.target.checked })}
                />
                <label className="form-check-label small" htmlFor={`${elementKey}-topps-dynasty`}>
                    Topps Dynasty
                </label>
            </div>
        </div>
    )
}
