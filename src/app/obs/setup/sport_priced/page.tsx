'use client'

// Playground for `board:sport_priced`: renders the REAL board component (SportPricedBoard.tsx)
// against mock data — the 32 teams and prices of the priced stream — so tiles, tiers and the ball
// layout can be checked without a live stream or backend. Sell/reset and the board's own knobs are
// local state only; nothing is saved. `?sold=N` pre-sells the first N teams (for screenshots).

import {useEffect, useMemo, useState} from 'react'
import {Teams} from '@/app/common/teams'
import type {Event, PriceRange, SeriesTeamTotal, WNStream} from '@/app/entity/entities'
import type {Element, LayoutConfig} from '@/app/obs/layout/schema'
import {StaticLayoutDataProvider, type LayoutData} from '@/app/obs/layout/useLayoutData'
import {CueBusProvider} from '@/app/obs/layout/cueBus'
import {AnchorsProvider} from '@/app/obs/layout/anchors'
import {
    DEFAULT_BALL_COLS,
    DEFAULT_CELL_ASPECT,
    DEFAULT_PRICED_COLS,
    SportPricedBoard,
} from '@/app/obs/layout/elements/board-sport-priced/SportPricedBoard'

// Price left per team on the priced stream (0 = Side Card: no price of its own, shows the series
// default price).
const PRICES: Record<string, number> = {
    'New England Patriots': 375, 'New York Jets': 375, 'Detroit Lions': 350, 'Los Angeles Chargers': 300,
    'Las Vegas Raiders': 275, 'New York Giants': 275, 'Jacksonville Jaguars': 275, 'Los Angeles Rams': 275,
    'Baltimore Ravens': 275, 'Kansas City Chiefs': 275, 'Tampa Bay Buccaneers': 250, 'Dallas Cowboys': 250,
    'Chicago Bears': 225, 'Philadelphia Eagles': 225, 'Pittsburgh Steelers': 200, 'New Orleans Saints': 200,
    'Seattle Seahawks': 200, 'Buffalo Bills': 200, 'Carolina Panthers': 175, 'Green Bay Packers': 175,
    'Minnesota Vikings': 175, 'San Francisco 49ers': 175, 'Arizona Cardinals': 175, 'Atlanta Falcons': 150,
}
const PRICE_RANGES: PriceRange[] = [
    {id: 1, channel_id: 1, tier_id: 'best', price_from: 350},
    {id: 2, channel_id: 1, tier_id: 'good', price_from: 250},
    {id: 3, channel_id: 1, tier_id: 'mid', price_from: 100},
]
const BOX = {x: 0, y: 0, w: 893, h: 342}


export default function SportPricedPlayground() {
    const [soldIds, setSoldIds] = useState<Set<number>>(() => new Set())
    // Read after mount: the server render has no URL, so reading it in the initializer mismatched.
    useEffect(() => {
        const n = Math.max(0, parseInt(new URLSearchParams(window.location.search).get('sold') ?? '0', 10) || 0)
        if (n > 0) setSoldIds(new Set(Array.from({length: n}, (_, i) => i + 1)))
    }, [])
    const [cols, setCols] = useState(DEFAULT_PRICED_COLS)
    const [ballCols, setBallCols] = useState(DEFAULT_BALL_COLS)
    const [aspect, setAspect] = useState(DEFAULT_CELL_ASPECT)
    const [scale, setScale] = useState(1.5)
    const [shine, setShine] = useState(true)

    const events: Event[] = useMemo(
        () => Teams.map((team, i) => ({
            id: i + 1, index: i, break_id: 1, team, price: 0, is_giveaway: false, note: '', quantity: 1, giveaway_type: 0,
            customer: soldIds.has(i + 1) ? 'buyer' : '',
        })),
        [soldIds]
    )
    const teamPrices: SeriesTeamTotal[] = useMemo(
        () => Teams.map((team, i) => ({team, total_price: PRICES[team] ?? 0, price_left: soldIds.has(i + 1) ? 0 : PRICES[team] ?? 0})),
        [soldIds]
    )
    const element: Element = {kind: 'board', variant: 'sport_priced', cols, ballCols, cellAspect: aspect, shine, placements: {all: BOX}}
    const data = {
        config: {} as LayoutConfig,
        channel: null,
        stream: {id: 1, created_at: 0, name: 'demo', is_ended: false, active_break_id: 1} as WNStream,
        breakObject: null,
        events,
        series: {id: 1, name: 'demo', status: 'open', created_at: '', is_deleted: false, total_cards: 0, used_cards: 0, default_price: '$50-$149', kind: 'default'},
        priceRanges: PRICE_RANGES,
        teamPrices,
        seriesCount: null,
        pick2: null,
        stashorpass: null,
        boxesPerBreak: null,
        countSettings: null,
        photos: [],
        cardsBoardSettings: null,
        seriesPriceRanges: [],
        lastFetched: {},
        refetch: () => {},
    } as unknown as LayoutData

    const sellRandom = () => {
        const left = events.filter((e) => e.customer === '')
        if (left.length === 0) return
        const pick = left[Math.floor(Math.random() * left.length)]
        setSoldIds((s) => new Set(s).add(pick.id))
    }

    return (
        <div style={{padding: 16, background: '#0b0f17', minHeight: '100vh', color: '#ddd'}}>
            <div className="d-flex gap-3 align-items-end mb-3 flex-wrap" id="spp-controls">
                <button className="btn btn-sm btn-outline-light" onClick={sellRandom}>Sell a team</button>
                <button className="btn btn-sm btn-outline-light" onClick={() => setSoldIds(new Set())}>Reset</button>
                {([['Cols', cols, setCols, 1], ['Ball cells', ballCols, setBallCols, 1], ['Tile shape', aspect, setAspect, 0.1], ['Preview scale', scale, setScale, 0.25]] as const).map(([label, v, set, step]) => (
                    <label key={label} className="small">
                        {label}
                        <input type="number" step={step} className="form-control form-control-sm" style={{width: 90}} value={v}
                               onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) (set as (n: number) => void)(n) }}/>
                    </label>
                ))}
                <label className="small d-flex gap-1 align-items-center">
                    <input type="checkbox" checked={shine} onChange={(e) => setShine(e.target.checked)}/> Shine
                </label>
            </div>
            <div style={{width: BOX.w * scale, height: BOX.h * scale}}>
                <div id="spp-preview" style={{width: BOX.w, height: BOX.h, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'relative'}}>
                    <CueBusProvider>
                        <AnchorsProvider>
                            <StaticLayoutDataProvider value={data}>
                                <SportPricedBoard elementKey="preview" element={element} box={BOX} phase="all"/>
                            </StaticLayoutDataProvider>
                        </AnchorsProvider>
                    </CueBusProvider>
                </div>
            </div>
            <p className="small mt-2" style={{color: '#8a93a3'}}>
                Real board component, mock data (the priced stream&apos;s 32 teams). 893 × 342 is that stream&apos;s board slot.
            </p>
        </div>
    )
}
