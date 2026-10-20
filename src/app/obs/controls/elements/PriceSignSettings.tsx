'use client'

// Settings for the `priceSign` element (obs-price-sign-plan.md §5) — copied from
// PriceRangesSettings.tsx (series fetch, kind notice, embedded SeriesPriceRangesEditor writing
// through useSettingWrite(onFireCue) with the same spine key 'seriesPriceRanges', since both
// elements read the same series data), plus one element-level input ("Font scale")
// written through onPatchElement.

import {useEffect, useState} from 'react'
import {getEndpoints, post} from '@/app/lib/backend'
import type {Series, WNBreak} from '@/app/entity/entities'
import type {DurableCue, Element} from '@/app/obs/layout/schema'
import SeriesPriceRangesEditor from '@/app/component/seriesPriceRangesEditor'
import {useSettingWrite} from './useSettingWrite'
import type {PatchElement} from './ElementBlock'

type Props = {
    elementKey: string
    element: Element
    onPatchElement: PatchElement
    seriesId?: number | null
    // price-ranges-v2-plan.md §B.5 — the active break and a refetch of it after the panel changes
    // the break's series.
    activeBreak?: WNBreak | null
    onBreakRefresh?: () => unknown
    onFireCue?: (cue: DurableCue) => void
}

export default function PriceSignSettings({elementKey, element, onPatchElement, seriesId, activeBreak, onBreakRefresh, onFireCue}: Props) {
    const [series, setSeries] = useState<Series | null>(null)
    const {save: writeSetting, saving} = useSettingWrite(onFireCue)

    useEffect(() => {
        if (!seriesId) {
            setSeries(null)
            return
        }
        post(getEndpoints().series_get, {id: seriesId})
            .then((d: Series) => { if (d && !('error' in d)) setSeries(d) })
    }, [seriesId])

    const ps = element.kind === 'priceSign' ? element : null
    const fontScale = ps?.fontScale ?? 1

    // Both series-backed spine sources must refetch after the break's series changes.
    function fireSeriesCues() {
        onFireCue?.({kind: 'refetch', key: 'seriesPriceRanges'})
    }

    async function createSeries() {
        if (!activeBreak) return
        const r = await writeSetting('series', async () => {
            const created = await post(getEndpoints().series_create, {
                name: activeBreak.name, total_cards: 0, default_price: '0', kind: 'price_ranges',
            })
            if (!created || 'error' in created) return {error: true}
            return post(getEndpoints().break_set_series, {break_id: activeBreak.id, series_id: created.id})
        })
        if (r.ok) {
            await onBreakRefresh?.()
            fireSeriesCues()
        }
    }

    async function deleteSeries() {
        if (!activeBreak || !seriesId) return
        if (!window.confirm(`Delete series "${series?.name ?? seriesId}"?`)) return
        const r = await writeSetting('series', async () => {
            const detached = await post(getEndpoints().break_set_series, {break_id: activeBreak.id, series_id: null})
            if (!detached || 'error' in detached) return {error: true}
            return post(getEndpoints().series_delete, {id: seriesId})
        })
        if (r.ok) {
            await onBreakRefresh?.()
            fireSeriesCues()
        }
    }

    const elementInputs = (
        <div className="d-flex flex-column gap-2">
            <h6 className="mb-0">{activeBreak ? activeBreak.name : 'No active break'}</h6>
            <div>
                <label className="form-label mb-0 small">Font scale</label>
                <input
                    type="number"
                    min={0.1}
                    step={0.05}
                    className="form-control form-control-sm"
                    style={{width: '100px'}}
                    value={fontScale}
                    onChange={(e) => {
                        const parsed = parseFloat(e.target.value)
                        if (Number.isFinite(parsed) && parsed > 0) {
                            onPatchElement(elementKey, {fontScale: parsed})
                        }
                    }}
                />
            </div>
        </div>
    )

    if (!activeBreak) {
        return (
            <div className="d-flex flex-column gap-2">
                {elementInputs}
            </div>
        )
    }

    if (!seriesId) {
        return (
            <div className="d-flex flex-column gap-2">
                {elementInputs}
                <div className="text-secondary small">No series on this break.</div>
                <div>
                    <button className="btn btn-sm btn-primary" disabled={saving} onClick={createSeries}>
                        Create price-ranges series
                    </button>
                </div>
            </div>
        )
    }

    if (!series || series.id !== seriesId) {
        return (
            <div className="d-flex flex-column gap-2">
                {elementInputs}
                <div className="text-secondary small">Loading…</div>
            </div>
        )
    }

    if (series.kind !== 'price_ranges') {
        return (
            <div className="d-flex flex-column gap-2">
                {elementInputs}
                <div className="text-secondary small">This break uses a cards series ({series.name})</div>
                <div>
                    <button
                        className="btn btn-sm btn-warning"
                        disabled={saving}
                        onClick={() => {
                            if (window.confirm(`Replace cards series "${series.name}" on this break with a new price-ranges series?`)) {
                                void createSeries()
                            }
                        }}
                    >
                        Replace with price-ranges series
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="d-flex flex-column gap-2">
            {elementInputs}
            <div className="d-flex align-items-center gap-2">
                <span className="text-secondary small">{series.name}</span>
                <button className="btn btn-sm btn-danger" disabled={saving} onClick={deleteSeries}>Delete series</button>
            </div>
            <SeriesPriceRangesEditor
                seriesId={seriesId}
                // useSettingWrite returns {ok, data} rather than the raw response; the editor decides
                // success by the raw `{error}` shape, so unwrap here and hand a failure back in that shape.
                onWrite={(write) => writeSetting('seriesPriceRanges', write).then((r) => r.ok ? r.data : {error: true})}
            />
        </div>
    )
}
