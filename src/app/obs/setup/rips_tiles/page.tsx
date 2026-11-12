'use client'

// Real RIPS board with local fixtures. No sales or layout writes reach the backend.
import {useEffect, useMemo, useRef, useState} from 'react'
import {Teams} from '@/app/common/teams'
import type {Event, WNStream} from '@/app/entity/entities'
import type {Element, LayoutConfig} from '@/app/obs/layout/schema'
import {StaticLayoutDataProvider, type LayoutData} from '@/app/obs/layout/useLayoutData'
import {RipsFlatBoard} from '@/app/obs/layout/elements/board-rips-flat/RipsFlatBoard'
import {RIPS_TILE_SETS, type RipsTileSet, type RipsBackStyle} from '@/app/obs/layout/elements/board-rips-flat/RipsFlatCell'
import type {RipsCellOrder, RipsSoldPlacement} from '@/app/obs/layout/elements/board-rips-flat/ripsOrder'

const teams = [...Teams, 'Miscellaneous']
export default function RipsTilesPlayground() {
    const [sold, setSold] = useState<string[]>([])
    const [tileSet, setTileSet] = useState<RipsTileSet>('marble_auto')
    const [backStyle, setBackStyle] = useState<RipsBackStyle>('flip_art')
    const [cellOrder, setCellOrder] = useState<RipsCellOrder>('tier')
    const [soldPlacement, setSoldPlacement] = useState<RipsSoldPlacement>('sides')
    const [width, setWidth] = useState(900)
    const [count, setCount] = useState(33)
    const [mount, setMount] = useState(0)
    const [fallback, setFallback] = useState(false)
    const gpuExtension = useRef<WEBGL_lose_context | null>(null)
    const [gpuState, setGpuState] = useState('loading')
    useEffect(() => {
        const timer = setInterval(() => setGpuState(document.querySelector<HTMLCanvasElement>('#rips-tile-review canvas')?.dataset.goldState ?? 'not needed'), 500)
        return () => clearInterval(timer)
    }, [])
    const box = {x: 0, y: 300, w: width, h: Math.round(width * 260 / 1080)}
    const element: Element = {kind: 'board', variant: 'rips_flat', tileSet, backStyle, cellOrder, soldPlacement, placements: {all: box}}
    const events: Event[] = useMemo(() => teams.slice(0, count).map((team, i) => ({
        id: i + 1, index: i, break_id: 1, team, price: 0, is_giveaway: false, note: '', quantity: 1, giveaway_type: 0,
        customer: sold.includes(team) ? 'Preview buyer' : '',
    })), [sold, count])
    const data: LayoutData = {
        config: {} as LayoutConfig, channel: null,
        stream: {id: 1, active_break_id: 1} as WNStream, breakObject: null, events, series: null,
        priceRanges: [], teamPrices: [], seriesCount: null, pick2: null, stashorpass: null,
        boxesPerBreak: null, countSettings: null, photos: [], cardsBoardSettings: null,
        seriesPriceRanges: [], lastFetched: {events: 1}, refetch: () => {},
    }
    const toggleSale = (team: string) => setSold((current) => current.includes(team) ? current.filter((t) => t !== team) : [...current, team])
    const toggleGpu = () => {
        const canvas = document.querySelector<HTMLCanvasElement>('#rips-tile-review canvas.rfb-doric-gold')
        if (fallback) {
            gpuExtension.current?.restoreContext()
        } else {
            const extension = canvas?.getContext('webgl')?.getExtension('WEBGL_lose_context')
            if (!extension) return
            gpuExtension.current = extension
            extension.loseContext()
        }
        setFallback(!fallback)
    }
    return (
        <main style={{padding: 24, minHeight: '100vh', color: '#edf1f7', background: '#0c1421'}}>
            <h1>RIPS marble tiles</h1>
            <p>Real board, all 33 logos, local sale fixtures. No changes are saved.</p>
            <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24}}>
                <label>Tiles <select value={tileSet} onChange={(e) => setTileSet(e.target.value as RipsTileSet)}>{RIPS_TILE_SETS.map((v) => <option key={v}>{v}</option>)}</select></label>
                <label>Back <select value={backStyle} onChange={(e) => setBackStyle(e.target.value as RipsBackStyle)}><option value="flip_art">Flip art</option><option value="tiles">Grey tiles</option></select></label>
                <label>Order <select value={cellOrder} onChange={(e) => setCellOrder(e.target.value as RipsCellOrder)}><option value="tier">Tier</option><option value="alphabet">Alphabet</option></select></label>
                <label>Sold placement <select value={soldPlacement} onChange={(e) => setSoldPlacement(e.target.value as RipsSoldPlacement)}><option value="sides">Sides</option><option value="stay">Stay</option></select></label>
                <label>Board width <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>{[330, 660, 900, 1080].map((v) => <option key={v}>{v}</option>)}</select></label>
                <label>Slots <select value={count} onChange={(e) => setCount(Number(e.target.value))}>{[0, 1, 17, 32, 33].map((v) => <option key={v}>{v}</option>)}</select></label>
                <button onClick={() => setSold([])}>Refund all</button>
                <button onClick={() => setSold(teams)}>Sell all</button>
                <button onClick={() => {setMount((v) => v + 1); setFallback(false)}}>Remount board</button>
                <button onClick={toggleGpu}>{fallback ? 'Restore GPU' : 'Test GPU fallback'}</button>
            </div>
            <div id="rips-tile-review" style={{position: 'relative', width, height: box.h, marginBottom: 36}}>
                <StaticLayoutDataProvider value={data}>
                    <RipsFlatBoard key={mount} elementKey="preview" element={element} box={box} phase="all" />
                </StaticLayoutDataProvider>
            </div>
            <p>Gold GPU: {gpuState} · {sold.length} sold · click a team to sell/refund. Remount verifies already-sold cells do not replay their sale.</p>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 1100}}>
                {teams.map((team) => <button key={team} onClick={() => toggleSale(team)} style={{background: sold.includes(team) ? '#744b21' : '#20334b', color: 'white', border: '1px solid #536378', padding: '6px 10px', borderRadius: 4}}>{team}{sold.includes(team) ? ' · sold' : ''}</button>)}
            </div>
        </main>
    )
}
