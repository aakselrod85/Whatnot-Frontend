'use client'

// Settings for the `results` element (obs-layout-plan.md §2.3). Column count, sort order and the
// style (skin). The tier ramp itself stays fixed — a style only changes how the grid and its tiers
// are painted (schema.ts `RESULTS_STYLES`): 'default' is the overlay-1f-spec.md palette this
// element has always had, 'rips' paints over the art in public/images/results/rips
// (layout/elements/results/ripsStyle.ts).
//
// Like the other settings components this mutates the element itself via `onPatchElement`
// (ElementsPanel's `mutate` -> debounced `pushConfig`), not a separate backend endpoint.

import type {Element, ResultsStyle} from '@/app/obs/layout/schema'
import {DEFAULT_COLUMNS, DEFAULT_SORT, DEFAULT_STYLE} from '@/app/obs/layout/elements/results/ResultsElement'
import type {PatchElement} from './ElementBlock'
import SortButtons from './SortButtons'

type Props = {
    elementKey: string
    element: Element
    onPatchElement: PatchElement
}

export default function ResultsSettings({elementKey, element, onPatchElement}: Props) {
    if (element.kind !== 'results') return null

    const columns = element.columns ?? DEFAULT_COLUMNS
    const sort = element.sort ?? DEFAULT_SORT
    const style = element.style ?? DEFAULT_STYLE

    return (
        <div className="d-flex gap-3 flex-wrap">
            <div className="mb-2">
                <label className="form-label mb-0 small">Style</label>
                <select
                    className="form-select form-select-sm"
                    style={{width: '120px'}}
                    value={style}
                    onChange={(e) => onPatchElement(elementKey, {style: e.target.value as ResultsStyle})}
                >
                    <option value="default">Default</option>
                    <option value="rips">Rips</option>
                </select>
            </div>
            <div className="mb-2">
                <label className="form-label mb-0 small">Columns</label>
                <input
                    type="number"
                    min={1}
                    className="form-control form-control-sm"
                    style={{width: '90px'}}
                    value={columns}
                    onChange={(e) =>
                        onPatchElement(elementKey, {columns: Math.max(1, parseInt(e.target.value, 10) || 1)})
                    }
                />
            </div>
            <SortButtons value={sort} onChange={(next) => onPatchElement(elementKey, {sort: next})}/>
        </div>
    )
}
