'use client'

import React, {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import Papa from "papaparse";
import {getEndpoints, post} from "@/app/lib/backend";
import {Event, WNBreak} from "@/app/entity/entities";
import {isGiveaway} from "@/app/utils/whatnot_product";
import {sortBreaksById} from "@/app/common/breaks";
import {
    Bucket, GiveawayMismatch, GiveawayRow, GiveawayBucketsEditor, GiveawayMismatchesTable,
    GAP_THRESHOLD_MS, addMissingGiveaways, computeGiveawayMismatches, deleteExtraGiveaways,
} from "../giveawayAssignment";

const TIMEZONE_KEY = 'giveaway_tz'
const PATTERN_KEY = 'giveaway_pattern'
const DEFAULT_PATTERN = 'giveaway'

function parseUtc(s: string): Date {
    return new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z')
}

function parseAndBucket(content: string, breaks: WNBreak[], pattern: string): Bucket[] {
    const result = Papa.parse<Record<string, string>>(content, {header: true, skipEmptyLines: true})

    // Sort all non-cancelled rows globally so neighbors reflect the full CSV context
    const allSorted = result.data
        .filter(r => !r.cancelled_or_failed)
        .map(r => ({productName: r.product_name, placedAt: parseUtc(r.placed_at), buyer: r.buyer_username ?? r.buyer, orderId: r.order_id ?? ''}))
        .sort((a, b) => a.placedAt.getTime() - b.placedAt.getTime())

    type InternalRow = GiveawayRow & { clusterIndex: number }
    const giveaways: InternalRow[] = allSorted
        .flatMap((r, i) => isGiveaway(r.productName, pattern) ? [{
            orderId: r.orderId,
            productName: r.productName,
            buyer: r.buyer,
            placedAt: r.placedAt,
            csvBefore: allSorted[i - 1]?.productName ?? '',
            csvAfter: allSorted[i + 1]?.productName ?? '',
            clusterIndex: 0,
        }] : [])

    // Cluster by time gaps and map each cluster index → break id
    const clusterBreak = new Map<number, number>()
    let clusterIdx = 0
    clusterBreak.set(0, breaks[0]?.id ?? 0)
    for (let i = 1; i < giveaways.length; i++) {
        const gap = giveaways[i].placedAt.getTime() - giveaways[i - 1].placedAt.getTime()
        if (gap > GAP_THRESHOLD_MS) {
            clusterIdx++
            clusterBreak.set(clusterIdx, breaks[clusterIdx]?.id ?? breaks[breaks.length - 1]?.id ?? 0)
        }
        giveaways[i].clusterIndex = clusterIdx
    }

    // Distribute rows into per-break buckets
    const rowsByBreak = new Map<number, GiveawayRow[]>()
    for (const b of breaks) rowsByBreak.set(b.id, [])
    for (const g of giveaways) {
        const breakId = clusterBreak.get(g.clusterIndex) ?? breaks[0]?.id ?? 0
        rowsByBreak.get(breakId)?.push({
            orderId: g.orderId,
            productName: g.productName,
            buyer: g.buyer,
            placedAt: g.placedAt,
            csvBefore: g.csvBefore,
            csvAfter: g.csvAfter,
        })
    }

    return breaks.map(b => ({break: b, rows: rowsByBreak.get(b.id) ?? []}))
}

export default function Page({params}: {params: {id: string}}) {
    const streamId = parseInt(params.id)
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [breaks, setBreaks] = useState<WNBreak[]>([])
    const [buckets, setBuckets] = useState<Bucket[] | null>(null)
    const [fileErrors, setFileErrors] = useState<{orderId: string; error: string}[] | null>(null)
    const [mismatches, setMismatches] = useState<GiveawayMismatch[] | null>(null)
    const [progress, setProgress] = useState<string | null>(null)
    const [didFix, setDidFix] = useState(false)
    const [timezone, setTimezone] = useState('UTC')
    const [timezoneList, setTimezoneList] = useState<string[]>([])
    const [csvContent, setCsvContent] = useState<string | null>(null)
    const [giveawayPattern, setGiveawayPattern] = useState(DEFAULT_PATTERN)

    useEffect(() => {
        post(getEndpoints().stream_breaks, {id: streamId})
            .then((b: WNBreak[]) => setBreaks(sortBreaksById(b)))
        const stored = localStorage.getItem(TIMEZONE_KEY)
        setTimezone(stored ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
        setTimezoneList(Intl.supportedValuesOf('timeZone'))
        setGiveawayPattern(localStorage.getItem(PATTERN_KEY) ?? DEFAULT_PATTERN)
    }, [streamId])

    function handleTimezoneChange(tz: string) {
        setTimezone(tz)
        localStorage.setItem(TIMEZONE_KEY, tz)
    }

    function handlePatternChange(pattern: string) {
        setGiveawayPattern(pattern)
        localStorage.setItem(PATTERN_KEY, pattern)
    }

    function processContent(content: string, pattern: string) {
        applyBuckets(parseAndBucket(content, breaks, pattern))
    }

    function applyBuckets(parsed: Bucket[]) {
        const emptyBuyerRows = parsed.flatMap(b => b.rows).filter(r => !r.buyer)
        if (emptyBuyerRows.length > 0) {
            setFileErrors(emptyBuyerRows.map(r => ({orderId: r.orderId || '—', error: `No buyer for "${r.productName}"`})))
            setBuckets(null)
            return
        }
        setFileErrors(null)
        setBuckets(parsed)
        setMismatches(null)
        setDidFix(false)
    }

    function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const content = ev.target?.result as string
            setCsvContent(content)
            processContent(content, giveawayPattern)
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    async function handleVerify() {
        if (!buckets) return

        const breakDb = new Map<number, Event[]>()
        for (let i = 0; i < buckets.length; i++) {
            const bucket = buckets[i]
            setProgress(`Fetching ${i + 1} of ${buckets.length}: ${bucket.break.name}…`)
            const resp: {events: Event[]} = await post(getEndpoints().break_events, {break_id: bucket.break.id})
            breakDb.set(bucket.break.id, (resp.events ?? []).filter(e => e.is_giveaway))
        }
        setProgress(null)
        setMismatches(computeGiveawayMismatches(buckets, breakDb))
    }

    async function handleAddMissing() {
        if (!mismatches) return
        await addMissingGiveaways(mismatches, setProgress)
        setMismatches(m => m!.filter(x => x.type !== 'missing'))
        setDidFix(true)
        setProgress(null)
    }

    async function handleDeleteExtra() {
        if (!mismatches) return
        await deleteExtraGiveaways(mismatches, setProgress)
        setMismatches(m => m!.filter(x => x.type !== 'extra'))
        setDidFix(true)
        setProgress(null)
    }

    const totalRows = buckets?.reduce((sum, b) => sum + b.rows.length, 0) ?? 0
    const missingCount = mismatches?.filter(m => m.type === 'missing').length ?? 0
    const extraCount = mismatches?.filter(m => m.type === 'extra').length ?? 0

    return (
        <main className="d-flex justify-content-center mt-4">
            <div style={{minWidth: 700}}>
                <h4>Giveaways</h4>

                {!buckets && (
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

                        <div className="mb-3">
                            <label className="form-label">Giveaway pattern (What is the text that is present in all giveaways, i.e. giveaway #1; giveaway #2; giveaway #3 - means that pattern is the word &quot;giveaway&quot;)</label>
                            <input
                                type="text"
                                className="form-control"
                                value={giveawayPattern}
                                onChange={e => handlePatternChange(e.target.value)}
                            />
                        </div>

                        {fileErrors && (
                            <table className="table table-bordered table-sm mb-3">
                                <thead>
                                    <tr><th>Order ID</th><th>Error</th></tr>
                                </thead>
                                <tbody>
                                    {fileErrors.map((e, i) => (
                                        <tr key={i} className="text-danger">
                                            <td>{e.orderId}</td>
                                            <td>{e.error}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {progress && <div className="alert alert-info">{progress}</div>}

                        <div className="mb-3 d-flex gap-2">
                            <input type="file" accept=".csv" ref={fileInputRef} className="d-none" onChange={handleFileSelected}/>
                            <button
                                className="btn btn-secondary"
                                disabled={!giveawayPattern.trim()}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Upload selling report (.csv)
                            </button>
                        </div>

                        <button className="btn btn-secondary mt-2" onClick={() => router.push(`/stream/${streamId}`)}>
                            Cancel
                        </button>
                    </>
                )}

                {buckets && totalRows === 0 && (
                    <>
                        <div className="alert alert-warning">No giveaway entries found in this file.</div>
                        <div className="mb-3">
                            <label className="form-label">Giveaway pattern (What is the text that is present in all giveaways, i.e. giveaway #1; giveaway #2; giveaway #3 - means that pattern is the word &quot;giveaway&quot;)</label>
                            <input
                                type="text"
                                className="form-control"
                                value={giveawayPattern}
                                onChange={e => handlePatternChange(e.target.value)}
                            />
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-primary"
                                disabled={!giveawayPattern.trim() || csvContent === null}
                                onClick={() => processContent(csvContent!, giveawayPattern)}
                            >
                                Detect
                            </button>
                            <button className="btn btn-secondary" onClick={() => router.push(`/stream/${streamId}`)}>
                                Back to stream
                            </button>
                        </div>
                    </>
                )}

                {buckets && totalRows > 0 && mismatches === null && (
                    <>
                        <GiveawayBucketsEditor buckets={buckets} breaks={breaks} timezone={timezone} onChange={setBuckets}/>

                        {progress && (
                            <div className="alert alert-info">{progress}</div>
                        )}

                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-primary"
                                disabled={!!progress}
                                onClick={handleVerify}
                            >
                                Verify
                            </button>
                            <button className="btn btn-secondary" onClick={() => router.push(`/stream/${streamId}`)}>
                                Cancel
                            </button>
                        </div>
                    </>
                )}

                {mismatches !== null && (
                    <>
                        {mismatches.length === 0 && (
                            <>
                                <div className="alert alert-success">
                                    {didFix ? 'All mismatches fixed.' : 'All giveaways match!'}
                                </div>
                                <button className="btn btn-primary" onClick={() => router.push(`/stream/${streamId}`)}>
                                    Back to stream
                                </button>
                            </>
                        )}

                        {mismatches.length > 0 && (
                            <>
                                <GiveawayMismatchesTable mismatches={mismatches}/>

                                {progress && <div className="alert alert-info">{progress}</div>}

                                <div className="d-flex gap-2">
                                    {missingCount > 0 && (
                                        <button
                                            className="btn btn-warning"
                                            disabled={!!progress}
                                            onClick={handleAddMissing}
                                        >
                                            Add {missingCount} missing
                                        </button>
                                    )}
                                    {extraCount > 0 && (
                                        <button
                                            className="btn btn-danger"
                                            disabled={!!progress}
                                            onClick={handleDeleteExtra}
                                        >
                                            Delete {extraCount} extra
                                        </button>
                                    )}
                                    <button className="btn btn-secondary" onClick={() => router.push(`/stream/${streamId}`)}>
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
