'use client'

import React, {useEffect, useState} from "react";
import {Teams} from "@/app/common/teams";
import {getEndpoints, get, post} from "@/app/lib/backend";
import {AddBreakResponse, Event, GetChannelsChannel, GiveawayTypeNone, Series, SeriesPreset, WNBreak} from "@/app/entity/entities";
import {useRouter} from "next/navigation";
import {sortBreaksById} from "@/app/common/breaks";
import {useStream} from "@/app/hooks/useStream";
import {AddBreakWizardComponent} from "@/app/stream/[id]/addBreakWizardComponent";

export default function Page({params} : {params: {id: string}}) {
    let streamId = parseInt(params.id)
    let [stream, refreshStream] = useStream(streamId)
    const [breaks, setBreaks] = useState<WNBreak[]>([])
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const [closedSeries, setClosedSeries] = useState<Series[]>([])
    const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null)
    const [channelId, setChannelId] = useState<number | null>(null)
    const [devMode, setDevMode] = useState(false)
    const [presetOpen, setPresetOpen] = useState(false)
    const [presets, setPresets] = useState<SeriesPreset[]>([])
    const [presetId, setPresetId] = useState<number | null>(null)
    const [presetSeriesIds, setPresetSeriesIds] = useState<number[]>([])
    const [applying, setApplying] = useState(false)
    let router = useRouter()

    useEffect(() => {
        let body = {
            id: streamId
        }
        post(getEndpoints().stream_breaks, body)
            .then((breaks: WNBreak[]) => {
                setBreaks(sortBreaksById(breaks))
            })
        get(getEndpoints().series_list).then((data: Series[]) => {
            setClosedSeries(data ?? [])
        })
        post(getEndpoints().channel_by_stream, {stream_id: streamId}).then((data: GetChannelsChannel) => {
            if (data) setChannelId(data.id)
        })
    }, []);

    async function addNewBreak(name: string, customSpots: string[] = []) {
        if (!name) return

        let date = (new Date()).toISOString()
        let body: WNBreak = {
            high_bid_floor: 0,
            id: 0,
            day_id: streamId,
            name,
            start_date: date,
            end_date: date,
            is_deleted: false,
            high_bid_team: '',
            giveaway_team: ''
        }

        return post(getEndpoints().break_add, body)
            .then((response: AddBreakResponse) => {
                let chain = Promise.resolve()
                const allSpots = [...Teams, ...customSpots]
                allSpots.forEach((teamName, j) => {
                    chain = chain.then(() => {
                        let eventAddBody: Event = {
                            id: 0,
                            index: j,
                            giveaway_type: GiveawayTypeNone,
                            break_id: response.id,
                            customer: '',
                            price: 0,
                            team: teamName,
                            is_giveaway: false,
                            note: '',
                            quantity: 0
                        }
                        return post(getEndpoints().event_add, eventAddBody)
                    })
                })
                body.id = response.id
                return chain.then(() => {
                    addBreak(body)
                    setToastMessage(`All events added for ${body.name}`)
                    setTimeout(() => setToastMessage(null), 3000)
                })
            })
    }

    function addBreak(newBreak: WNBreak) {
        setBreaks((old) => {
            let newBreaks = [...old]
            newBreaks.push(newBreak)
            return newBreaks
        })
    }

    function removeBreak(index: number) {
        setBreaks((old) => {
            let newBreaks = [...old]
            newBreaks.splice(index, 1)
            return newBreaks
        })
    }

    function redirectToBreak(id: number) {
        router.push(`/break/${id}`)
    }

    async function deleteBreak(breakObject: WNBreak, index: number) {
        if (!window.confirm(`Delete break "${breakObject.name}"?`)) return

        const response = await post(getEndpoints().break_delete, {id: breakObject.id})
        if (response?.success) {
            removeBreak(index)
            setToastMessage(`Break ${breakObject.name} deleted`)
            setTimeout(() => setToastMessage(null), 3000)
        } else {
            setToastMessage(`Failed to delete break ${breakObject.name}`)
            setTimeout(() => setToastMessage(null), 3000)
        }
    }

    async function setSeriesForAllBreaks() {
        if (!selectedSeriesId) return
        for (const b of breaks) {
            await post(getEndpoints().break_set_series, {break_id: b.id, series_id: selectedSeriesId})
        }
        const name = closedSeries.find((s) => s.id === selectedSeriesId)?.name ?? ''
        setToastMessage(`Series "${name}" set for all breaks`)
        setTimeout(() => setToastMessage(null), 3000)
    }

    function toast(msg: string) {
        setToastMessage(msg)
        setTimeout(() => setToastMessage(null), 3000)
    }

    async function createPreset() {
        if (!channelId) return
        const name = window.prompt('Preset name')?.trim()
        if (!name) return
        const seriesIds = breaks.map((b) => b.series_id).filter((id): id is number => id != null)
        const resp = await post(getEndpoints().series_preset_create, {channel_id: channelId, name, series_ids: seriesIds})
        if (resp && !resp.error) toast(`Preset "${name}" created`)
        else toast(`Failed to create preset: ${resp?.error ?? 'unknown error'}`)
    }

    function selectPreset(list: SeriesPreset[], id: number | null) {
        setPresetId(id)
        setPresetSeriesIds(list.find((p) => p.id === id)?.series_ids ?? [])
    }

    async function loadPresets(keepId: number | null) {
        if (!channelId) return
        const resp = await post(getEndpoints().series_preset_list, {channel_id: channelId})
        const list: SeriesPreset[] = resp?.presets ?? []
        setPresets(list)
        selectPreset(list, list.find((p) => p.id === keepId)?.id ?? list[0]?.id ?? null)
    }

    function openPresetModal() {
        setPresetOpen(true)
        void loadPresets(null)
    }

    async function deletePreset() {
        const p = presets.find((x) => x.id === presetId)
        if (!p || !window.confirm(`Delete preset "${p.name}"?`)) return
        await post(getEndpoints().series_preset_delete, {id: p.id})
        await loadPresets(null)
    }

    function movePresetSeries(i: number, delta: number) {
        setPresetSeriesIds((old) => {
            const t = i + delta
            if (t < 0 || t >= old.length) return old
            const next = [...old]
            ;[next[i], next[t]] = [next[t], next[i]]
            return next
        })
    }

    async function applyPreset() {
        const p = presets.find((x) => x.id === presetId)
        if (!p) return
        setApplying(true)
        let n = 0
        for (let i = 0; i < Math.min(breaks.length, presetSeriesIds.length); i++) {
            const sid = presetSeriesIds[i]
            if (!closedSeries.some((s) => s.id === sid)) continue
            await post(getEndpoints().break_set_series, {break_id: breaks[i].id, series_id: sid})
            n++
        }
        const fresh: WNBreak[] = await post(getEndpoints().stream_breaks, {id: streamId})
        if (Array.isArray(fresh)) setBreaks(sortBreaksById(fresh))
        setApplying(false)
        setPresetOpen(false)
        toast(`Preset "${p.name}" applied to ${n} breaks`)
    }

    const presetRows = Math.max(breaks.length, presetSeriesIds.length)

    return (
        <main>
            {toastMessage && <div className='position-fixed top-0 start-50 translate-middle-x mt-3 alert alert-success z-3'>
                {toastMessage}
            </div>}
            <div className="position-fixed bottom-0 end-0 m-3 z-3">
                <div className="form-check form-switch">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="devModeSwitch"
                        checked={devMode}
                        onChange={(e) => setDevMode(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="devModeSwitch">dev</label>
                </div>
            </div>
            <div className="d-flex justify-content-center">
                <div className='pe-3 d-flex flex-column gap-2'>
                    <button type="button" className="btn btn-primary" onClick={() => router.push(`/package/${streamId}`)}>
                        Package all
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => router.push(`/stream/${streamId}/import`)}>
                        Import livestream
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => router.push(`/stream/${streamId}/giveaways`)}>
                        Giveaways
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => router.push(`/stream/${streamId}/verify-teams`)}>
                        Verify teams
                    </button>
                    <div className="d-flex gap-1">
                        <select
                            className="form-select form-select-sm"
                            value={selectedSeriesId ?? ''}
                            onChange={(e) => setSelectedSeriesId(parseInt(e.target.value) || null)}
                        >
                            <option value="">Select series...</option>
                            {closedSeries.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={!selectedSeriesId}
                            onClick={setSeriesForAllBreaks}
                        >
                            Set for all
                        </button>
                    </div>
                    <button type="button" className="btn btn-sm btn-secondary" disabled={!channelId} onClick={openPresetModal}>
                        Price range preset
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" disabled={!channelId} onClick={createPreset}>
                        Create preset
                    </button>
                </div>
                <div className="d-flex flex-column">
                    <ul className="list-group">
                        {
                            breaks.map(
                                (breakObject, index) => {
                                    return <li key={breakObject.id} className="list-group-item text-white">
                                        <div className="container-fluid">
                                            <div className="row">
                                                <div className="col" onClick={() => redirectToBreak(breakObject.id)}>{breakObject.name}</div>
                                                {devMode && <div className="col-auto">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            deleteBreak(breakObject, index)
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>}
                                            </div>
                                        </div>
                                    </li>
                                }
                            )
                        }
                    </ul>
                    <AddBreakWizardComponent onAdd={addNewBreak}/>
                </div>
            </div>
            {presetOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-3" style={{background: 'rgba(0,0,0,0.6)'}}>
                    <div className="bg-dark text-white border rounded p-3" style={{width: '640px', maxHeight: '90vh', overflowY: 'auto'}}>
                        <div className="d-flex gap-2 mb-3">
                            <select
                                className="form-select form-select-sm"
                                value={presetId ?? ''}
                                onChange={(e) => selectPreset(presets, parseInt(e.target.value) || null)}
                            >
                                {presets.length === 0 && <option value="">No presets</option>}
                                {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button type="button" className="btn btn-sm btn-danger" disabled={!presetId} onClick={deletePreset}>Delete</button>
                        </div>
                        <div className="row mb-3">
                            <div className="col-6 fw-bold">Breaks</div>
                            <div className="col-6 fw-bold">Series</div>
                            {Array.from({length: presetRows}, (_, i) => {
                                const sid = presetSeriesIds[i]
                                const sName = sid === undefined ? null : closedSeries.find((s) => s.id === sid)?.name
                                return (
                                    <React.Fragment key={i}>
                                        <div className="col-6 py-1">{breaks[i]?.name ?? '—'}</div>
                                        <div className="col-6 py-1 d-flex align-items-center gap-1">
                                            {sid === undefined ? '—' : (
                                                <>
                                                    <span className={sName ? 'flex-grow-1' : 'flex-grow-1 text-secondary'}>
                                                        {sName ?? `missing (id ${sid})`}
                                                    </span>
                                                    <button type="button" className="btn btn-sm btn-outline-secondary" disabled={i === 0} onClick={() => movePresetSeries(i, -1)}>↑</button>
                                                    <button type="button" className="btn btn-sm btn-outline-secondary" disabled={i === presetSeriesIds.length - 1} onClick={() => movePresetSeries(i, 1)}>↓</button>
                                                </>
                                            )}
                                        </div>
                                    </React.Fragment>
                                )
                            })}
                        </div>
                        <div className="d-flex justify-content-end gap-2">
                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPresetOpen(false)}>Cancel</button>
                            <button type="button" className="btn btn-sm btn-primary" disabled={!presetId || applying} onClick={applyPreset}>
                                {applying ? 'Applying…' : 'Apply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}