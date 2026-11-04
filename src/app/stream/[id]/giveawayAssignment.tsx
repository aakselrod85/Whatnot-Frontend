import React from "react";
import {getEndpoints, post} from "@/app/lib/backend";
import {Event, WNBreak, WhatnotOrdersResponse} from "@/app/entity/entities";
import {getGiveawayType} from "@/app/utils/whatnot_product";

export const GAP_THRESHOLD_MS = 10 * 60 * 1000

export interface GiveawayRow {
    orderId: string
    productName: string
    buyer: string
    placedAt: Date
    csvBefore: string
    csvAfter: string
}

export interface Bucket {
    break: WNBreak
    rows: GiveawayRow[]
}

export interface GiveawayMismatch {
    type: 'missing' | 'extra'
    breakName: string
    breakId: number
    buyer: string
    productName: string
    giveawayType: number
    eventId?: number
}

export function formatTime(d: Date, tz: string): string {
    return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz})
}

export function bucketFromWhatnot(resp: WhatnotOrdersResponse, breaks: WNBreak[], wnNameToBreakId?: Map<string, number>): Bucket[] {
    type Entry = {title: string; at: Date; wnBreak?: string; give?: {orderId: string; buyer: string}}
    const timeline: Entry[] = []
    for (const b of resp.breaks ?? []) {
        for (const o of b.orders ?? []) timeline.push({title: `${b.name} - ${o.team}`, at: new Date(o.created_at), wnBreak: b.name})
    }
    for (const g of resp.giveaways ?? []) {
        timeline.push({title: g.title, at: new Date(g.created_at), give: {orderId: g.order_id, buyer: g.username}})
    }
    for (const u of resp.unparsed ?? []) timeline.push({title: u.title, at: new Date(u.created_at)})
    timeline.sort((a, b) => a.at.getTime() - b.at.getTime())

    const norm = (x: string) => x.trim().toLowerCase()
    const rowsByBreak = new Map<number, GiveawayRow[]>()
    for (const b of breaks) rowsByBreak.set(b.id, [])
    let prevBreakId: number | null = null
    let lastAt: number | null = null
    let clusterIdx = 0
    timeline.forEach((e, i) => {
        if (!e.give) return
        // Which break does this giveaway belong to? Giveaways are usually announced between breaks,
        // so look at the TIME GAP to the last team order rather than just taking the nearest one:
        // a big gap after break N's last sale, with break N+1's sales following, means the giveaway
        // belongs to N+1. A small gap means it was run inside break N.
        let before: Entry | undefined
        for (let j = i - 1; j >= 0 && !before; j--) if (timeline[j].wnBreak) before = timeline[j]
        let after: Entry | undefined
        for (let j = i + 1; j < timeline.length && !after; j++) if (timeline[j].wnBreak) after = timeline[j]
        const gapFromBefore = before ? e.at.getTime() - before.at.getTime() : Infinity
        const wnName = (gapFromBefore > GAP_THRESHOLD_MS && after ? after : (before ?? after))?.wnBreak
        let breakId: number | undefined
        if (wnName) {
            if (wnNameToBreakId) breakId = wnNameToBreakId.get(wnName)
            else breakId = breaks.find(b => norm(b.name) === norm(wnName!))?.id
        }
        if (breakId === undefined || !rowsByBreak.has(breakId)) {
            // fallback: time-gap clustering over giveaways, same as the CSV path
            if (lastAt !== null && e.at.getTime() - lastAt > GAP_THRESHOLD_MS) clusterIdx++
            breakId = prevBreakId !== null && clusterIdx === 0
                ? prevBreakId
                : (breaks[clusterIdx]?.id ?? breaks[breaks.length - 1]?.id ?? 0)
        }
        lastAt = e.at.getTime()
        prevBreakId = breakId
        rowsByBreak.get(breakId)?.push({
            orderId: e.give.orderId,
            productName: e.title,
            buyer: e.give.buyer,
            placedAt: e.at,
            csvBefore: timeline[i - 1]?.title ?? '',
            csvAfter: timeline[i + 1]?.title ?? '',
        })
    })
    for (const rows of Array.from(rowsByBreak.values())) rows.sort((a, c) => a.placedAt.getTime() - c.placedAt.getTime())
    return breaks.map(b => ({break: b, rows: rowsByBreak.get(b.id) ?? []}))
}

/** Moves rows to the breaks saved by an earlier manual mapping (order id -> break id). */
export function applyGiveawayOverrides(buckets: Bucket[], overrides: Record<string, number>): Bucket[] {
    const target = (row: GiveawayRow, current: number) => {
        const id = overrides[row.orderId]
        return id !== undefined && buckets.some(b => b.break.id === id) ? id : current
    }
    const all = buckets.flatMap(b => b.rows.map(row => ({row, breakId: target(row, b.break.id)})))
    return buckets.map(b => ({
        break: b.break,
        rows: all.filter(x => x.breakId === b.break.id).map(x => x.row).sort((a, c) => a.placedAt.getTime() - c.placedAt.getTime()),
    }))
}

/** eventsByBreak must already be filtered to is_giveaway events. */
export function computeGiveawayMismatches(buckets: Bucket[], eventsByBreak: Map<number, Event[]>): GiveawayMismatch[] {
    const results: GiveawayMismatch[] = []
    for (const bucket of buckets) {
        const breakId = bucket.break.id
        const breakName = bucket.break.name
        const dbEvents = eventsByBreak.get(breakId) ?? []

        const csvByBuyer = new Map<string, GiveawayRow[]>()
        for (const row of bucket.rows) {
            if (!csvByBuyer.has(row.buyer)) csvByBuyer.set(row.buyer, [])
            csvByBuyer.get(row.buyer)!.push(row)
        }
        const dbByCustomer = new Map<string, number[]>()
        for (const e of dbEvents) {
            if (!dbByCustomer.has(e.customer)) dbByCustomer.set(e.customer, [])
            dbByCustomer.get(e.customer)!.push(e.id)
        }

        const buyers = new Set([...Array.from(csvByBuyer.keys()), ...Array.from(dbByCustomer.keys())])
        for (const buyer of Array.from(buyers)) {
            const csvRows = csvByBuyer.get(buyer) ?? []
            const dbIds = dbByCustomer.get(buyer) ?? []
            const surplusCsv = csvRows.slice(dbIds.length)
            const surplusDb = dbIds.slice(csvRows.length)
            for (const row of surplusCsv) {
                results.push({type: 'missing', breakName, breakId, buyer, productName: row.productName, giveawayType: getGiveawayType(row.productName)})
            }
            for (const eventId of surplusDb) {
                results.push({type: 'extra', breakName, breakId, buyer, productName: '', giveawayType: 0, eventId})
            }
        }
    }
    return results
}

export async function addMissingGiveaways(mismatches: GiveawayMismatch[], onProgress: (msg: string) => void): Promise<void> {
    const toFix = mismatches.filter(m => m.type === 'missing')
    for (let i = 0; i < toFix.length; i++) {
        const mm = toFix[i]
        onProgress(`Adding missing giveaways: ${toFix.length - i} of ${toFix.length} left (${mm.buyer})…`)
        await post(getEndpoints().event_add, {
            id: 0,
            index: -1,
            break_id: mm.breakId,
            customer: mm.buyer,
            price: 0,
            team: '',
            is_giveaway: true,
            note: '',
            quantity: 1,
            giveaway_type: mm.giveawayType,
        })
    }
}

export async function deleteExtraGiveaways(mismatches: GiveawayMismatch[], onProgress: (msg: string) => void): Promise<void> {
    const toDelete = mismatches.filter(m => m.type === 'extra' && m.eventId !== undefined)
    for (let i = 0; i < toDelete.length; i++) {
        const mm = toDelete[i]
        onProgress(`Deleting extra giveaways: ${toDelete.length - i} of ${toDelete.length} left (${mm.buyer})…`)
        await post(getEndpoints().event_delete, {id: mm.eventId})
    }
}

const byTime = (a: GiveawayRow, c: GiveawayRow) => a.placedAt.getTime() - c.placedAt.getTime()

export function moveRow(buckets: Bucket[], fromBreakId: number, rowIndex: number, toBreakId: number): Bucket[] {
    const row = buckets.find(b => b.break.id === fromBreakId)!.rows[rowIndex]
    return buckets.map(b => {
        if (b.break.id === fromBreakId) return {...b, rows: b.rows.filter((_, i) => i !== rowIndex)}
        if (b.break.id === toBreakId) return {...b, rows: [...b.rows, row].sort(byTime)}
        return b
    })
}

export function moveFromRow(buckets: Bucket[], fromBreakId: number, rowIndex: number, toBreakId: number): Bucket[] {
    const rows = buckets.find(b => b.break.id === fromBreakId)!.rows
    const pivotTime = rows[rowIndex].placedAt.getTime()
    const toKeep = rows.filter(r => r.placedAt.getTime() < pivotTime)
    const toMove = rows.filter(r => r.placedAt.getTime() >= pivotTime)
    return buckets.map(b => {
        if (b.break.id === fromBreakId) return {...b, rows: toKeep}
        if (b.break.id === toBreakId) return {...b, rows: [...b.rows, ...toMove].sort(byTime)}
        return b
    })
}

export function GiveawayBucketsEditor({buckets, breaks, timezone, onChange}: {
    buckets: Bucket[]
    breaks: WNBreak[]
    timezone: string
    onChange: (buckets: Bucket[]) => void
}) {
    return (
        <>
            {buckets.map(bucket => (
                <div key={bucket.break.id} className="border rounded p-3 mb-3">
                    <strong className="d-block mb-2">
                        {bucket.break.name} ({bucket.rows.length} giveaway{bucket.rows.length !== 1 ? 's' : ''})
                    </strong>
                    {bucket.rows.length > 0 && (
                        <table className="table table-sm mb-0">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Buyer</th>
                                    <th>Time</th>
                                    <th>Move to break</th>
                                    <th>Move this + all next to break</th>
                                    <th>Event before</th>
                                    <th>Event after</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bucket.rows.map((row, rowIdx) => (
                                    <tr key={rowIdx}>
                                        <td>{row.productName}</td>
                                        <td>{row.buyer}</td>
                                        <td>{formatTime(row.placedAt, timezone)}</td>
                                        <td>
                                            <select
                                                className="form-select form-select-sm"
                                                value=""
                                                onChange={e => {
                                                    if (e.target.value) onChange(moveRow(buckets, bucket.break.id, rowIdx, parseInt(e.target.value)))
                                                }}
                                            >
                                                <option value="">— stay —</option>
                                                {breaks.filter(b => b.id !== bucket.break.id).map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                className="form-select form-select-sm"
                                                value=""
                                                onChange={e => {
                                                    if (e.target.value) onChange(moveFromRow(buckets, bucket.break.id, rowIdx, parseInt(e.target.value)))
                                                }}
                                            >
                                                <option value="">— stay —</option>
                                                {breaks.filter(b => b.id !== bucket.break.id).map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="text-muted">{row.csvBefore || '—'}</td>
                                        <td className="text-muted">{row.csvAfter || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ))}
        </>
    )
}

export function GiveawayMismatchesTable({mismatches}: {mismatches: GiveawayMismatch[]}) {
    return (
        <table className="table table-bordered mt-3">
            <thead>
                <tr>
                    <th>Break</th>
                    <th>Buyer</th>
                    <th>Product</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
                {mismatches.map((mm, i) => (
                    <tr key={i}>
                        <td>{mm.breakName}</td>
                        <td>{mm.buyer}</td>
                        <td>{mm.productName || '—'}</td>
                        <td>
                            {mm.type === 'missing'
                                ? <span className="text-danger">Missing in DB</span>
                                : <span className="text-warning">Extra in DB</span>
                            }
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
