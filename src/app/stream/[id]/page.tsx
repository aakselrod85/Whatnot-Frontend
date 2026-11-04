'use client'

import React, {useEffect, useState} from "react";
import {Teams} from "@/app/common/teams";
import {getEndpoints, get, post} from "@/app/lib/backend";
import {AddBreakResponse, Event, GetChannelsChannel, GiveawayTypeNone, Series, WhatnotShow, WhatnotShowsResponse, SeriesPreset, WNBreak} from "@/app/entity/entities";
import {useRouter} from "next/navigation";
import {sortBreaksById} from "@/app/common/breaks";
import {useStream} from "@/app/hooks/useStream";
import {AddBreakWizardComponent} from "@/app/stream/[id]/addBreakWizardComponent";
import {WhatnotShowStepComponent} from "@/app/stream/[id]/whatnotShowStepComponent";
import {StreamStatusBadge, RunStatusBadge} from "@/app/stream/[id]/statusBadges";
import {ShowReconciliationListItem, ShowReconciliation} from "@/app/entity/entities";
import {WhatnotShowPickerComponent} from "@/app/stream/[id]/whatnotShowPickerComponent";

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
    const [shows, setShows] = useState<WhatnotShow[]>([])
    const [showPickerOpen, setShowPickerOpen] = useState(false)
    const [showsLoadedOnce, setShowsLoadedOnce] = useState(false)
    const [showsLoading, setShowsLoading] = useState(false)
    const [showsPartialFailure, setShowsPartialFailure] = useState(false)
    const [olderCursor, setOlderCursor] = useState('')
    const [hasOlderShows, setHasOlderShows] = useState(false)
    const [olderLoading, setOlderLoading] = useState(false)
    const [olderFailed, setOlderFailed] = useState(false)
    const [breaksStatus, setBreaksStatus] = useState<'loading' | 'ok' | 'failed'>('loading')
    const [skipped, setSkipped] = useState(false)
    const [lastRun, setLastRun] = useState<ShowReconciliationListItem | null | undefined>(undefined)
    const [reconciling, setReconciling] = useState<'apply' | 'report' | null>(null)
    const [reconcileError, setReconcileError] = useState<string | null>(null)

    useEffect(() => {
        post(getEndpoints().stream_reconciliation, {stream_id: streamId})
            .then((r: {item?: ShowReconciliationListItem | null}) => setLastRun(r?.item ?? null))
            .catch(() => setLastRun(null))
    }, [streamId, stream?.whatnot_show_id])

    async function runReconciliation(dryRun: boolean) {
        setReconciling(dryRun ? 'report' : 'apply')
        setReconcileError(null)
        try {
            const r: ShowReconciliation & {error?: string} = await post(getEndpoints().stream_reconcile, {stream_id: streamId, dry_run: dryRun})
            if (!r || !r.id) {
                setReconcileError((r as {error?: string} | null)?.error ?? 'Reconciliation failed')
                return
            }
            router.push(`/stream/${streamId}/reconciliation`)
        } catch (e) {
            setReconcileError(String(e))
        } finally {
            setReconciling(null)
        }
    }

    function lastRunText(r: ShowReconciliationListItem): string {
        const s = r.summary
        const parts = [new Date(r.started_at).toLocaleString()]
        if (r.status === 'applied') parts.push(`${s.fixed + s.price_fixed} teams fixed`, `${s.events_added ?? 0} new events added`, `${s.added} giveaways added`)
        else if (r.status === 'dry_run') parts.push(`${s.fixed + s.price_fixed} teams to fix`, `${s.events_added ?? 0} new events to add`, `${s.added} giveaways to add`)
        else if (r.status === 'needs_manual') parts.push(`${s.blocking} blocking issues`)
        return parts.join(' · ')
    }
    let router = useRouter()

    useEffect(() => {
        let body = {
            id: streamId
        }
        post(getEndpoints().stream_breaks, body)
            .then((result: WNBreak[]) => {
                if (Array.isArray(result)) {
                    setBreaks(sortBreaksById(result))
                    setBreaksStatus('ok')
                } else {
                    setBreaksStatus('failed')
                }
            })
        get(getEndpoints().series_list).then((data: Series[]) => {
            setClosedSeries(data ?? [])
        })
        post(getEndpoints().channel_by_stream, {stream_id: streamId}).then((data: GetChannelsChannel) => {
            if (data) setChannelId(data.id)
        })
    }, []);

    async function loadShows() {
        if (!channelId || olderLoading) return
        setShowsLoading(true)
        try {
            const results = await Promise.all(['live', 'scheduled', 'ended'].map(status =>
                post(getEndpoints().whatnot_shows, {channel_id: channelId, status})
                    .then((r: WhatnotShowsResponse) => (Array.isArray(r?.shows) ? r : null))
                    .catch(() => null)
            ))
            const [live, scheduled, ended] = results
            const scheduledSorted = [...(scheduled?.shows ?? [])]
                .sort((a, b) => {
                    if (!a.scheduled_start_at && !b.scheduled_start_at) return 0
                    if (!a.scheduled_start_at) return 1
                    if (!b.scheduled_start_at) return -1
                    return new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime()
                })
                .slice(0, 10)
            setShows([...(live?.shows ?? []), ...scheduledSorted, ...(ended?.shows ?? [])])
            setOlderCursor(ended?.next_cursor ?? '')
            setHasOlderShows(!!ended?.has_more)
            setOlderFailed(false)
            setShowsPartialFailure(results.some(r => r === null))
            setShowsLoadedOnce(true)
        } finally {
            setShowsLoading(false)
        }
    }

    // Returns how many new shows were added. The first batch can repeat shows already listed, because it
    // restarts from the page where the 2-day cutoff stopped.
    async function loadOlderShows(): Promise<number> {
        if (!channelId || olderLoading) return 0
        setOlderLoading(true)
        setOlderFailed(false)
        try {
            const r: WhatnotShowsResponse | null = await post(getEndpoints().whatnot_shows, {
                channel_id: channelId,
                status: 'ended',
                older: true,
                cursor: olderCursor,
            })
            if (!r || !Array.isArray(r.shows)) {
                setOlderFailed(true)
                return 0
            }
            const added = r.shows.filter(sh => !shows.some(existing => existing.id === sh.id))
            setShows([...shows, ...added])
            setOlderCursor(r.next_cursor ?? '')
            setHasOlderShows(!!r.has_more)
            return added.length
        } catch {
            setOlderFailed(true)
            return 0
        } finally {
            setOlderLoading(false)
        }
    }

    async function changeWhatnotShow(value: string): Promise<boolean> {
        const resp = await post(getEndpoints().stream_set_whatnot_show, {
            stream_id: streamId,
            whatnot_show_id: value || null,
            whatnot_show_name: shows.find(sh => sh.id === value)?.title ?? null,
        })
        if (!resp?.success) {
            toast('Failed to update Whatnot show')
            return false
        }
        refreshStream()
        toast(value ? 'Whatnot show linked' : 'Whatnot show unlinked')
        return true
    }

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

    const showSkip = devMode || (showsLoadedOnce && (shows.length === 0 || showsPartialFailure))
    const needsStep = breaksStatus === 'ok' && breaks.length === 0 && !stream?.whatnot_show_id && !skipped
    const pageLoading = breaksStatus === 'loading' || (needsStep && !stream)
    const wantShows = showPickerOpen || (!!stream && needsStep)

    // Shows are slow to list, so fetch them only when the new-stream step or the picker needs them.
    // The Whatnot API key lives on the channel (DB-only column), so this also waits for the channel id.
    // A failed or partial load is retried the next time the picker opens.
    useEffect(() => {
        if (!channelId || !wantShows) return
        if (showsLoadedOnce && !showsPartialFailure) return
        void loadShows()
    }, [channelId, wantShows]);

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
            {pageLoading ? (
                <div className="text-center text-muted mt-5">Loading…</div>
            ) : stream && needsStep ? (
                <WhatnotShowStepComponent
                    shows={shows}
                    loading={showsLoading || !showsLoadedOnce}
                    partialFailure={showsPartialFailure}
                    showSkip={showSkip}
                    onSelect={changeWhatnotShow}
                    onRetry={() => void loadShows()}
                    onSkip={() => setSkipped(true)}
                />
            ) : (<>
            {/* Two equal halves: the centre line of the viewport is the seam. Buttons hug it from the left,
                the breaks list starts from it on the right. */}
            <div className="d-flex">
                <div className="w-50 d-flex justify-content-end">
                <div className='pe-3 d-flex flex-column gap-2'>
                    <div>
                        <label className="form-label mb-1">Whatnot show</label>
                        <small className="text-muted d-block">
                            {stream?.whatnot_show_id
                                ? (stream.whatnot_show_name ?? shows.find(sh => sh.id === stream.whatnot_show_id)?.title ?? stream.whatnot_show_id)
                                : 'No Whatnot show linked'}
                        </small>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-light"
                            disabled={!(channelId && stream)}
                            onClick={() => setShowPickerOpen(true)}
                        >
                            {!(channelId && stream) ? 'Loading…' : (stream.whatnot_show_id ? 'Change' : 'Select show')}
                        </button>
                    </div>
                    <div>
                        <label className="form-label mb-1">Status</label>{' '}
                        <StreamStatusBadge status={stream?.status}/>
                        <small className="text-muted d-block">
                            Last reconciliation:{' '}
                            {lastRun === undefined ? '…' : lastRun === null ? 'never' : (
                                <>
                                    <a href={`/stream/${streamId}/reconciliation`}>{lastRunText(lastRun)}</a>{' '}
                                    <RunStatusBadge status={lastRun.status}/>
                                </>
                            )}
                        </small>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!stream?.whatnot_show_id || !!reconciling}
                        title={stream?.whatnot_show_id ? '' : 'Link a Whatnot show first'}
                        onClick={() => runReconciliation(false)}
                    >
                        {reconciling === 'apply' ? 'Reconciling… (~1 min)' : 'Reconcile now'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={!stream?.whatnot_show_id || !!reconciling}
                        title={stream?.whatnot_show_id ? 'Report only, nothing is changed' : 'Link a Whatnot show first'}
                        onClick={() => runReconciliation(true)}
                    >
                        {reconciling === 'report' ? 'Building report… (~1 min)' : 'Reconcile report'}
                    </button>
                    {reconcileError && <div className="text-danger small">{reconcileError}</div>}
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
                </div>
                <div className="w-50 ps-3 d-flex flex-column align-items-start">
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
            </>)}
            {showPickerOpen && (
                <WhatnotShowPickerComponent
                    shows={shows}
                    loading={showsLoading || !showsLoadedOnce}
                    partialFailure={showsPartialFailure}
                    currentShowId={stream?.whatnot_show_id ?? null}
                    onSelect={changeWhatnotShow}
                    onRetry={() => void loadShows()}
                    onClose={() => setShowPickerOpen(false)}
                    hasOlder={hasOlderShows}
                    olderLoading={olderLoading}
                    olderFailed={olderFailed}
                    onLoadOlder={loadOlderShows}
                />
            )}
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