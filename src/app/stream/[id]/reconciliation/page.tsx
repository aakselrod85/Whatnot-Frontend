'use client'

import React, {Suspense, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {getEndpoints, post} from "@/app/lib/backend";
import {ShowReconciliation, ShowReconciliationListItem, WNStream} from "@/app/entity/entities";
import {RunStatusBadge, StreamStatusBadge} from "../statusBadges";

const matchedClass: Record<string, string> = {name: 'bg-success', number: 'bg-info text-dark', manual: 'bg-primary', skipped: 'bg-secondary', none: 'bg-danger'}

function ReconciliationPage({params}: {params: {id: string}}) {
    const streamId = parseInt(params.id)
    const router = useRouter()
    const [noRun, setNoRun] = useState(false)
    const [rerunning, setRerunning] = useState<'apply' | 'report' | null>(null)
    const [run, setRun] = useState<ShowReconciliation | null>(null)
    const [streamStatus, setStreamStatus] = useState<string | undefined>(undefined)
    const [error, setError] = useState<string | null>(null)
    const [expanded, setExpanded] = useState<Set<number>>(new Set())
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const r: {item?: ShowReconciliationListItem | null} = await post(getEndpoints().stream_reconciliation, {stream_id: streamId})
                const row: ShowReconciliation | null = r?.item ? await post(getEndpoints().reconciliation_get, {id: r.item.id}) : null
                const st: WNStream = await post(getEndpoints().stream_get, {id: streamId})
                if (cancelled) return
                setRun(row)
                setNoRun(!row)
                setStreamStatus(st?.status)
            } catch (e) {
                if (!cancelled) setError(String(e))
            }
        }
        load()
        return () => { cancelled = true }
    }, [streamId, reloadKey])

    async function rerun(dryRun: boolean) {
        setRerunning(dryRun ? 'report' : 'apply')
        setError(null)
        try {
            const r = await post(getEndpoints().stream_reconcile, {stream_id: streamId, dry_run: dryRun})
            if (!r?.id) setError(r?.error ?? 'Reconciliation failed')
            setExpanded(new Set())
            setReloadKey(k => k + 1)
        } catch (e) {
            setError(String(e))
        } finally {
            setRerunning(null)
        }
    }

    async function markVerified() {
        const r = await post(getEndpoints().stream_set_status, {stream_id: streamId, status: 'verified'})
        if (r?.success) setReloadKey(k => k + 1)
        else setError(r?.error ?? 'Failed to mark verified')
    }

    const toggle = (i: number) => setExpanded(prev => {
        const n = new Set(prev)
        if (n.has(i)) n.delete(i); else n.add(i)
        return n
    })

    const report = run?.report?.breaks ? run.report : null // a failed run stores an empty report
    const fixedTeams = report ? report.breaks.reduce((a, b) => a + b.to_fix + b.to_fix_price, 0) : 0
    const addedGive = report?.giveaways.to_add ?? 0
    const addedEvents = report ? report.breaks.reduce((a, b) => a + (b.to_add?.length ?? 0), 0) : 0
    const ordersMapped = report?.orders_scanned ?? 0
    const fmt = (t: string | null) => t ? new Date(t).toLocaleString() : '—'

    return (
        <main className="d-flex justify-content-center mt-4 mb-5">
            <div style={{width: '70%', maxWidth: '100%'}}>
                <h4>Reconciliation <StreamStatusBadge status={streamStatus}/></h4>
                {error && <div className="alert alert-danger">{error}</div>}

                {noRun && (
                    <div className="alert alert-info">
                        No reconciliation has run yet for this stream.{' '}
                        <button className="btn btn-outline-primary btn-sm" disabled={!!rerunning} onClick={() => rerun(true)}>
                            {rerunning === 'report' ? 'Building report… (~1 min)' : 'Run report'}
                        </button>
                    </div>
                )}

                {run && (
                    <>
                        <div className="mb-2">
                            <strong>{report?.show?.title ?? run.show_id}</strong> · {ordersMapped} orders scanned · {run.trigger} ·
                            started {fmt(run.started_at)} · finished {fmt(run.finished_at)}
                        </div>

                        {run.status === 'applied' && (
                            <div className="alert alert-success">
                                All {ordersMapped} orders mapped, {fixedTeams} teams fixed, {addedEvents} new events added, {addedGive} giveaways added.
                            </div>
                        )}
                        {run.status === 'dry_run' && (
                            <div className="alert alert-info">
                                Report only, nothing was changed. If applied: all {ordersMapped} orders mapped, {fixedTeams} teams fixed, {addedEvents} new events added, {addedGive} giveaways added.
                            </div>
                        )}
                        {run.status === 'needs_manual' && report && (
                            <div className="alert alert-warning">
                                Nothing was changed. {report.blocking} blocking issues:
                                <ul className="mb-2">
                                    {report.breaks.filter(b => b.matched_by === 'none').map((b, i) => (
                                        <li key={`b${i}`}>Whatnot break without a match: {b.wn_name}</li>
                                    ))}
                                    {report.giveaways.unplaced.map((g, i) => (
                                        <li key={`g${i}`}>Unplaced giveaway: {g.title} · {g.username}</li>
                                    ))}
                                </ul>
                                <button className="btn btn-primary btn-sm"
                                        onClick={() => router.push(`/stream/${streamId}/whatnot-verify?reconciliation=${run.id}`)}>
                                    Map manually
                                </button>
                            </div>
                        )}
                        {run.status === 'failed' && <div className="alert alert-danger">Run failed: {run.error ?? 'unknown error'}</div>}
                        {run.status === 'running' && <div className="alert alert-info">Run in progress…</div>}

                        <div className="d-flex gap-2 mb-3">
                            <button className="btn btn-primary" disabled={!!rerunning || run.status === 'running'} onClick={() => rerun(false)}>
                                {rerunning === 'apply' ? 'Re-running… (~1 min)' : 'Re-run reconciliation'}
                            </button>
                            <button className="btn btn-outline-primary" disabled={!!rerunning || run.status === 'running'} onClick={() => rerun(true)}>
                                {rerunning === 'report' ? 'Building report… (~1 min)' : 'Re-run report'}
                            </button>
                            <a className="btn btn-outline-secondary" href={`https://www.whatnot.com/live/${run.show_id}`} target="_blank" rel="noopener noreferrer">
                                Go to show
                            </a>
                            {(streamStatus === 'ended' || streamStatus === 'failed_to_verify') && (
                                <button className="btn btn-success" onClick={markVerified}>Mark verified</button>
                            )}
                        </div>

                        {report && (
                            <>
                                <h6>Breaks</h6>
                                <table className="table table-bordered table-sm">
                                    <thead>
                                        <tr><th>Whatnot break</th><th>DB break</th><th>Matched by</th><th>Matched</th><th>{run.status === 'applied' ? 'Fixed' : 'To fix'}</th><th>{run.status === 'applied' ? 'Price fixed' : 'Price to fix'}</th><th>New events</th><th>Details</th></tr>
                                    </thead>
                                    <tbody>
                                        {report.breaks.map((b, i) => {
                                            const toAdd = b.to_add ?? []
                                            const hasLists = toAdd.length > 0 || b.extra.length > 0
                                            return (
                                                <React.Fragment key={i}>
                                                    <tr className={b.matched_by === 'none' ? 'table-danger' : ''}>
                                                        <td>{b.wn_name}</td>
                                                        <td>{b.break_name || '—'}</td>
                                                        <td><span className={`badge ${matchedClass[b.matched_by] ?? 'bg-secondary'}`}>{b.matched_by}</span></td>
                                                        <td>{b.matched}</td><td>{b.to_fix}</td><td>{b.to_fix_price}</td><td>{toAdd.length}</td>
                                                        <td>
                                                            {hasLists ? (
                                                                <a href="#" onClick={(e) => { e.preventDefault(); toggle(i) }}>
                                                                    {toAdd.length} new · {b.extra.length} extra {expanded.has(i) ? '▲' : '▼'}
                                                                </a>
                                                            ) : ''}
                                                        </td>
                                                    </tr>
                                                    {hasLists && expanded.has(i) && (
                                                        <tr>
                                                            <td colSpan={8}>
                                                                {toAdd.length > 0 && (
                                                                    <>
                                                                        <div className="small fw-bold">New events {run.status === 'applied' ? 'added' : 'to add'}</div>
                                                                        <table className="table table-sm small mb-1">
                                                                            <thead><tr><th>Team</th><th>Username</th><th>Price</th></tr></thead>
                                                                            <tbody>
                                                                                {toAdd.map((n, j) => <tr key={j}><td>{n.team}</td><td>{n.username}</td><td>{formatPrice(n.price)}</td></tr>)}
                                                                            </tbody>
                                                                        </table>
                                                                    </>
                                                                )}
                                                                {b.extra.length > 0 && (
                                                                    <>
                                                                        <div className="small fw-bold">Extra in DB</div>
                                                                        <ul className="small mb-1">
                                                                            {b.extra.map((x, j) => <li key={j}>{x.team} · {x.customer} · event {x.event_id}</li>)}
                                                                        </ul>
                                                                    </>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>

                                <h6>Giveaways</h6>
                                <div className="mb-2">{report.giveaways.to_add} {run.status === 'applied' ? 'added' : 'to add'} · {report.giveaways.unplaced.length} unplaced · {report.giveaways.extra.length} extra</div>
                                {(report.giveaways.items?.length ?? 0) > 0 && (
                                    <table className="table table-bordered table-sm">
                                        <thead><tr><th>Order time</th><th>Title</th><th>Username</th><th>Break</th><th>Placed by</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {report.giveaways.items?.map(g => (
                                                <tr key={g.order_id}>
                                                    <td>{new Date(g.created_at).toLocaleString()}</td>
                                                    <td>{g.title}</td><td>{g.username}</td><td>{g.break_name}</td><td>{g.placed_by}</td>
                                                    <td>{g.status === 'missing' ? (run.status === 'applied' ? 'added' : 'to add') : g.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {report.giveaways.unplaced.length > 0 && (
                                    <table className="table table-bordered table-sm">
                                        <thead><tr><th>Unplaced order</th><th>Title</th><th>Username</th></tr></thead>
                                        <tbody>
                                            {report.giveaways.unplaced.map((g, i) => <tr key={i}><td>{g.order_id}</td><td>{g.title}</td><td>{g.username}</td></tr>)}
                                        </tbody>
                                    </table>
                                )}
                                {report.giveaways.extra.length > 0 && (
                                    <table className="table table-bordered table-sm">
                                        <thead><tr><th>Break</th><th>Customer</th><th>Event id</th></tr></thead>
                                        <tbody>
                                            {report.giveaways.extra.map((g, i) => (
                                                <tr key={i}>
                                                    <td>{report.breaks.find(b => b.break_id === g.break_id)?.break_name ?? g.break_id}</td>
                                                    <td>{g.customer}</td><td>{g.event_id}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                <h6>Unparsed orders</h6>
                                {report.unparsed.length === 0 ? <div className="text-muted small mb-2">None.</div> : (
                                    <table className="table table-bordered table-sm">
                                        <thead><tr><th>Title</th><th>Username</th></tr></thead>
                                        <tbody>
                                            {report.unparsed.map((u, i) => <tr key={i}><td>{u.title}</td><td>{u.username}</td></tr>)}
                                        </tbody>
                                    </table>
                                )}
                            </>
                        )}
                    </>
                )}

                <button className="btn btn-secondary mt-2" onClick={() => router.push(`/stream/${streamId}`)}>Back to stream</button>
            </div>
        </main>
    )
}

const formatPrice = (price: number) => `$${price.toFixed(2)}`

export default function Page({params}: {params: {id: string}}) {
    return (
        <Suspense fallback={null}>
            <ReconciliationPage params={params}/>
        </Suspense>
    )
}
