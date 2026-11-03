'use client'

import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {getEndpoints, post} from "@/app/lib/backend";
import {AddBreakResponse, Event, GiveawayTypeNone, WNBreak, WhatnotBreakOrders, WhatnotOrdersResponse} from "@/app/entity/entities";
import {Teams} from "@/app/common/teams";
import {sortBreaksById} from "@/app/common/breaks";
import {
    Bucket, GiveawayMismatch, GiveawayBucketsEditor, GiveawayMismatchesTable,
    addMissingGiveaways, bucketFromWhatnot, computeGiveawayMismatches, deleteExtraGiveaways,
} from "../giveawayAssignment";

const SKIP = -1
const NEW_BREAK = -2
const NOT_CHOSEN = 0
const TIMEZONE_KEY = 'giveaway_tz'
const EMPTY_CUSTOMERS = ['', '?']

type TeamStatus = 'mismatch' | 'price_mismatch' | 'no_event' | 'extra'
interface TeamRow {
    breakName: string
    team: string
    wnCustomer: string
    dbCustomer: string
    wnPrice: number | null
    dbPrice: number | null
    status: TeamStatus
    event: Event | null
}
interface Results {
    matchedTeams: number
    teamRows: TeamRow[]
}

const norm = (s: string) => (s ?? '').trim().toLowerCase()
const isRealCustomer = (c: string) => !EMPTY_CUSTOMERS.includes((c ?? '').trim())

const statusClass: Record<string, string> = {
    mismatch: 'bg-danger', price_mismatch: 'bg-warning text-dark', no_event: 'bg-warning text-dark', extra: 'bg-secondary',
}
const badge = (s: string) => <span className={`badge ${statusClass[s] ?? 'bg-secondary'}`}>{s}</span>

export default function Page({params}: {params: {id: string}}) {
    const streamId = parseInt(params.id)
    const router = useRouter()
    const [breaks, setBreaks] = useState<WNBreak[] | null>(null)
    const [orders, setOrders] = useState<WhatnotOrdersResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [matchIds, setMatchIds] = useState<number[]>([])
    const [progress, setProgress] = useState<string | null>(null)
    const [results, setResults] = useState<Results | null>(null)
    const [fixDone, setFixDone] = useState(false)
    const [showUnparsed, setShowUnparsed] = useState(false)
    const [giveBuckets, setGiveBuckets] = useState<Bucket[] | null>(null)
    const [giveMismatches, setGiveMismatches] = useState<GiveawayMismatch[] | null>(null)
    const [timezone, setTimezone] = useState('UTC')
    const [timezoneList, setTimezoneList] = useState<string[]>([])

    useEffect(() => {
        setTimezone(localStorage.getItem(TIMEZONE_KEY) ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
        setTimezoneList(Intl.supportedValuesOf('timeZone'))
    }, [])

    function handleTimezoneChange(tz: string) {
        setTimezone(tz)
        localStorage.setItem(TIMEZONE_KEY, tz)
    }

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const br: WNBreak[] = await post(getEndpoints().stream_breaks, {id: streamId})
                const sorted = sortBreaksById(Array.isArray(br) ? br : [])
                const resp = await post(getEndpoints().stream_whatnot_orders, {stream_id: streamId})
                if (cancelled) return
                if (!resp || resp.error) {
                    setError(resp?.error ?? 'Failed to fetch orders from Whatnot')
                    return
                }
                const r = resp as WhatnotOrdersResponse
                setBreaks(sorted)
                setOrders(r)
                // Auto-match: exact (case-insensitive) name first; otherwise by the last number in the
                // name, e.g. Whatnot "💥 🏈 Multi-year Multi-Sport 3🏈💥" ↔ our "Break 3", but only when
                // exactly one unused break carries that number.
                const lastNumber = (name: string): string | null => {
                    const nums = name.match(/\d+/g)
                    return nums ? String(parseInt(nums[nums.length - 1])) : null
                }
                const used = new Set<number>()
                const ids = (r.breaks ?? []).map(wb => {
                    const m = sorted.find(x => !used.has(x.id) && norm(x.name) === norm(wb.name))
                    if (m) { used.add(m.id); return m.id }
                    return NOT_CHOSEN
                })
                ;(r.breaks ?? []).forEach((wb, i) => {
                    if (ids[i] !== NOT_CHOSEN) return
                    const n = lastNumber(wb.name)
                    if (n === null) return
                    const candidates = sorted.filter(x => !used.has(x.id) && lastNumber(x.name) === n)
                    if (candidates.length === 1) { used.add(candidates[0].id); ids[i] = candidates[0].id }
                })
                setMatchIds(ids)
            } catch (e) {
                if (!cancelled) setError(String(e))
            }
        }
        load()
        return () => { cancelled = true }
    }, [streamId])

    const wnBreaks: WhatnotBreakOrders[] = orders?.breaks ?? []
    const allChosen = matchIds.length > 0 && matchIds.every(id => id !== NOT_CHOSEN)

    async function fetchEvents(breakId: number): Promise<Event[]> {
        const resp: {events: Event[]} = await post(getEndpoints().break_events, {break_id: breakId})
        return resp?.events ?? []
    }

    async function createBreak(wb: WhatnotBreakOrders): Promise<WNBreak> {
        const date = (new Date()).toISOString()
        const body: WNBreak = {
            high_bid_floor: 0, id: 0, day_id: streamId, name: wb.name,
            start_date: date, end_date: date, is_deleted: false, high_bid_team: '', giveaway_team: ''
        }
        const response: AddBreakResponse = await post(getEndpoints().break_add, body)
        const custom = Array.from(new Set(wb.orders.map(o => o.team))).filter(t => !Teams.includes(t))
        const spots = [...Teams, ...custom]
        for (let j = 0; j < spots.length; j++) {
            const ev: Event = {
                id: 0, index: j, giveaway_type: GiveawayTypeNone, break_id: response.id, customer: '',
                price: 0, team: spots[j], is_giveaway: false, note: '', quantity: 0
            }
            await post(getEndpoints().event_add, ev)
        }
        return {...body, id: response.id}
    }

    async function runVerify() {
        if (!orders || !breaks) return
        const curBreaks: WNBreak[] = breaks
        setResults(null)
        setFixDone(false)
        let breaks_: WNBreak[] = curBreaks
        let ids = [...matchIds]
        for (let i = 0; i < wnBreaks.length; i++) {
            if (ids[i] !== NEW_BREAK) continue
            setProgress(`Creating break ${wnBreaks[i].name}…`)
            const nb = await createBreak(wnBreaks[i])
            breaks_ = sortBreaksById([...breaks_, nb])
            ids[i] = nb.id
            setBreaks(breaks_)
            setMatchIds([...ids])
        }
        const allBreaks = breaks_
        const matchIds_ = ids
        const eventsByBreak = new Map<number, Event[]>()
        for (let i = 0; i < allBreaks.length; i++) {
            setProgress(`Verifying ${i + 1} of ${allBreaks.length}: ${allBreaks[i].name}…`)
            eventsByBreak.set(allBreaks[i].id, await fetchEvents(allBreaks[i].id))
        }

        const teamRows: TeamRow[] = []
        let matchedTeams = 0
        wnBreaks.forEach((wb, idx) => {
            const breakId = matchIds_[idx]
            if (breakId === SKIP) return
            const events = (eventsByBreak.get(breakId) ?? []).filter(e => !e.is_giveaway)
            const claimed = new Set<number>()
            for (const o of wb.orders) {
                const ev = events.find(e => e.team === o.team && !claimed.has(e.id))
                if (!ev) {
                    teamRows.push({breakName: wb.name, team: o.team, wnCustomer: o.username, dbCustomer: '', wnPrice: o.price, dbPrice: null, status: 'no_event', event: null})
                    continue
                }
                claimed.add(ev.id)
                if (norm(ev.customer) !== norm(o.username)) {
                    teamRows.push({breakName: wb.name, team: o.team, wnCustomer: o.username, dbCustomer: ev.customer, wnPrice: o.price, dbPrice: ev.price, status: 'mismatch', event: ev})
                } else if (Math.round((ev.price ?? 0) * 100) !== Math.round(o.price * 100)) {
                    // Customer is right but the price differs (typically 0 in the DB): still fixable.
                    teamRows.push({breakName: wb.name, team: o.team, wnCustomer: o.username, dbCustomer: ev.customer, wnPrice: o.price, dbPrice: ev.price, status: 'price_mismatch', event: ev})
                } else {
                    matchedTeams++
                }
            }
            for (const ev of events) {
                if (claimed.has(ev.id) || !isRealCustomer(ev.customer)) continue
                teamRows.push({breakName: wb.name, team: ev.team, wnCustomer: '', dbCustomer: ev.customer, wnPrice: null, dbPrice: ev.price, status: 'extra', event: ev})
            }
        })

        // Giveaways: assign once (manual moves survive re-verify), diff on every run
        let buckets = giveBuckets
        if (!buckets) {
            const wnNameToBreakId = new Map<string, number>()
            wnBreaks.forEach((wb, idx) => { if (matchIds_[idx] > 0) wnNameToBreakId.set(wb.name, matchIds_[idx]) })
            buckets = bucketFromWhatnot(orders, allBreaks, wnNameToBreakId)
            setGiveBuckets(buckets)
        }
        const giveEvents = new Map<number, Event[]>()
        eventsByBreak.forEach((evs, id) => giveEvents.set(id, evs.filter(e => e.is_giveaway)))
        setGiveMismatches(computeGiveawayMismatches(buckets, giveEvents))
        setResults({matchedTeams, teamRows})
        setProgress(null)
    }

    async function handleAutoFix() {
        if (!results) return
        const fixes = results.teamRows.filter(r => (r.status === 'mismatch' || r.status === 'price_mismatch') && r.event)
        for (let i = 0; i < fixes.length; i++) {
            setProgress(`Fixing ${i + 1} of ${fixes.length}: ${fixes[i].team}…`)
            await post(getEndpoints().event_update, {...fixes[i].event!, customer: fixes[i].wnCustomer, ...(fixes[i].wnPrice != null ? {price: fixes[i].wnPrice} : {})})
        }
        await runVerify()
        setFixDone(true)
    }

    const mismatchCount = results?.teamRows.filter(r => r.status === 'mismatch' || r.status === 'price_mismatch').length ?? 0
    const count = (s: TeamStatus) => results?.teamRows.filter(r => r.status === s).length ?? 0
    const giveMissing = giveMismatches?.filter(m => m.type === 'missing').length ?? 0
    const giveExtra = giveMismatches?.filter(m => m.type === 'extra').length ?? 0

    async function recheckGiveaways(buckets: Bucket[] | null = giveBuckets) {
        if (!buckets) return
        const evs = new Map<number, Event[]>()
        for (let i = 0; i < buckets.length; i++) {
            setProgress(`Checking giveaways ${i + 1} of ${buckets.length}: ${buckets[i].break.name}…`)
            evs.set(buckets[i].break.id, (await fetchEvents(buckets[i].break.id)).filter(e => e.is_giveaway))
        }
        setGiveMismatches(computeGiveawayMismatches(buckets, evs))
        setProgress(null)
    }

    async function handleAddMissing() {
        if (!giveMismatches) return
        await addMissingGiveaways(giveMismatches, setProgress)
        await recheckGiveaways()
    }

    async function handleDeleteExtra() {
        if (!giveMismatches) return
        await deleteExtraGiveaways(giveMismatches, setProgress)
        await recheckGiveaways()
    }

    return (
        <main className="d-flex justify-content-center mt-4">
            <div style={{width: '70%', maxWidth: '100%'}}>
                <h4>Whatnot verification</h4>

                {error && <div className="alert alert-danger">{error}</div>}
                {!error && !orders && <div className="alert alert-info">Fetching orders from Whatnot…</div>}

                {orders && breaks && !results && (
                    <>
                        <div className="mb-2">
                            <strong>{orders.show.title}</strong> ({orders.show.status}) · {orders.orders_scanned} orders scanned
                        </div>
                        <table className="table table-bordered table-sm ">
                            <thead>
                                <tr><th>Whatnot break</th><th>Orders</th><th>Matched to</th></tr>
                            </thead>
                            <tbody>
                                {wnBreaks.map((wb, i) => (
                                    <tr key={i}>
                                        <td>{wb.name}</td>
                                        <td>{wb.orders.length}</td>
                                        <td>
                                            <select
                                                className="form-select form-select-sm"
                                                value={matchIds[i]}
                                                disabled={!!progress}
                                                onChange={(e) => setMatchIds(prev => prev.map((v, j) => j === i ? parseInt(e.target.value) : v))}
                                            >
                                                <option value={NOT_CHOSEN}>— select —</option>
                                                <option value={SKIP}>— skip —</option>
                                                <option value={NEW_BREAK}>Add as new break</option>
                                                {(breaks ?? []).filter(b => b.id === matchIds[i] || !matchIds.includes(b.id)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(orders.unparsed ?? []).length > 0 && (
                            <div className="text-muted small mb-2">
                                {orders.unparsed.length} unparsed orders{' '}
                                <a href="#" onClick={(e) => { e.preventDefault(); setShowUnparsed(v => !v) }}>{showUnparsed ? 'hide' : 'show'}</a>
                                {showUnparsed && (
                                    <ul className="mb-0">
                                        {orders.unparsed.map((u, i) => <li key={i}>{u.order_id} · {u.title} · {u.username}</li>)}
                                    </ul>
                                )}
                            </div>
                        )}
                        {progress && <div className="alert alert-info">{progress}</div>}
                    </>
                )}

                {orders && results && (
                    <>
                        <div className="mb-2">
                            {results.matchedTeams} teams match, {count('mismatch')} mismatches, {count('price_mismatch')} price mismatches, {count('no_event')} no_event, {count('extra')} extra ·
                            giveaways: {giveMissing} missing, {giveExtra} extra
                        </div>
                        <h6>Teams</h6>
                        {results.teamRows.length === 0 ? (
                            <div className="alert alert-success">All teams match!</div>
                        ) : (
                            <table className="table table-bordered table-sm ">
                                <thead>
                                    <tr><th>Break</th><th>Team</th><th>Whatnot customer</th><th>Your customer</th><th>WN $</th><th>DB $</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {results.teamRows.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.breakName}</td><td>{r.team}</td><td>{r.wnCustomer}</td><td>{r.dbCustomer}</td>
                                            <td>{r.wnPrice ?? ''}</td><td>{r.dbPrice ?? ''}</td><td>{badge(r.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <h6>Giveaways</h6>
                        {giveBuckets && (
                            <>
                                <div className="mb-3 d-flex align-items-center gap-2">
                                    <label className="form-label mb-0">Timezone</label>
                                    <select
                                        className="form-select form-select-sm w-auto"
                                        value={timezone}
                                        onChange={e => handleTimezoneChange(e.target.value)}
                                    >
                                        {timezoneList.map(tz => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </select>
                                </div>
                                <GiveawayBucketsEditor buckets={giveBuckets} breaks={breaks ?? []} timezone={timezone} onChange={setGiveBuckets}/>
                                <button className="btn btn-primary mb-2" disabled={!!progress} onClick={() => recheckGiveaways()}>
                                    Re-check giveaways
                                </button>
                            </>
                        )}
                        {giveMismatches && (giveMismatches.length === 0 ? (
                            <div className="alert alert-success">All giveaways match!</div>
                        ) : (
                            <>
                                <GiveawayMismatchesTable mismatches={giveMismatches}/>
                                <div className="d-flex gap-2 mb-3">
                                    {giveMissing > 0 && (
                                        <button className="btn btn-warning" disabled={!!progress} onClick={handleAddMissing}>
                                            Add {giveMissing} missing giveaway{giveMissing !== 1 ? 's' : ''}
                                        </button>
                                    )}
                                    {giveExtra > 0 && (
                                        <button className="btn btn-danger" disabled={!!progress} onClick={handleDeleteExtra}>
                                            Delete {giveExtra} extra
                                        </button>
                                    )}
                                </div>
                            </>
                        ))}
                        {fixDone && <div className="alert alert-success">Fixed successfully.</div>}
                        {progress && <div className="alert alert-info">{progress}</div>}
                    </>
                )}

                <div className="d-flex gap-2">
                    {orders && !results && (
                        <button className="btn btn-primary" disabled={!allChosen || !!progress} onClick={runVerify}>
                            Verify
                        </button>
                    )}
                    {results && mismatchCount > 0 && (
                        <button className="btn btn-warning" disabled={!!progress} onClick={handleAutoFix}>
                            Auto-fix {mismatchCount} team{mismatchCount !== 1 ? 's' : ''}
                        </button>
                    )}
                    {results && (
                        <button className="btn btn-primary" disabled={!!progress} onClick={runVerify}>
                            Re-verify
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => router.push(`/stream/${streamId}`)}>
                        Back to stream
                    </button>
                </div>
                {results && mismatchCount > 0 && (
                    <div className="text-muted small mt-2">
                        Auto-fix sets the DB customer and price to the Whatnot values for every mismatch and price mismatch.
                    </div>
                )}
            </div>
        </main>
    )
}
