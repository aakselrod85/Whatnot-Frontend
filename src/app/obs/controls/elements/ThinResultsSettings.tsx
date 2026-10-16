'use client'

// Settings for `resultsThin` (obs-layout-plan.md §2.4): Style (skin), Columns and Sort
// (Alphabetical / By customer) — the same set as ResultsSettings.tsx, because the element now
// sizes its rows from its box exactly as the full board does (ThinResults.tsx), so there is no
// text or icon size to set. A style only changes how the board and its cells are painted
// (schema.ts `RESULTS_THIN_STYLES`): 'default' is the palette this element has always had, 'rips'
// paints over the art in public/images/results_mini/rips
// (layout/elements/results-thin/ripsStyle.ts). Like FrameSettings/StashOrPassWrapSettings, this
// mutates the element itself via `onPatchElement` (ElementsPanel's `mutate` -> debounced
// `pushConfig`), not a separate backend endpoint — `style`/`columns`/`sort` all
// live on the element in LayoutConfig.

import type {Element, ResultsThinStyle} from '@/app/obs/layout/schema'
import {
    DEFAULT_COLUMNS,
    DEFAULT_SORT,
    DEFAULT_STYLE,
} from '@/app/obs/layout/elements/results-thin/ThinResults'
import type {PatchElement} from './ElementBlock'
import SortButtons from './SortButtons'

type Props = {
    elementKey: string
    element: Element
    onPatchElement: PatchElement
}

export default function ThinResultsSettings({elementKey, element, onPatchElement}: Props) {
    if (element.kind !== 'resultsThin') return null

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
                    onChange={(e) => onPatchElement(elementKey, {style: e.target.value as ResultsThinStyle})}
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
                    step={1}
                    className="form-control form-control-sm"
                    style={{width: '90px'}}
                    value={columns}
                    onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10)
                        onPatchElement(elementKey, {columns: Number.isFinite(parsed) && parsed >= 1 ? parsed : 1})
                    }}
                />
            </div>
            <SortButtons value={sort} onChange={(next) => onPatchElement(elementKey, {sort: next})}/>
        </div>
    )
}
