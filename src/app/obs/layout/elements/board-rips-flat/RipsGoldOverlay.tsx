'use client'

import {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {DORIC_FRAME} from './doricMaterials'
import {createDoricGoldRenderer} from './doricGoldRenderer'
import {updateGoldState, visibleGoldCells, type GoldCell, type GoldState} from './doricGoldState'

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

type Props = {cells: readonly GoldCell[]; cellPx: number; cols: number; rows: number; left: number; top: number}

export function RipsGoldOverlay({cells, cellPx, cols, rows, left, top}: Props) {
    const ref = useRef<HTMLCanvasElement>(null)
    const states = useRef(new Map<number, GoldState>())
    const dimensions = useRef({cellPx, cols, rows})
    const wake = useRef<() => void>(() => {})
    const [generation, setGeneration] = useState(0)

    // Commit sale/removal/re-deal changes before paint, so no gold is left over sold artwork.
    useClientLayoutEffect(() => {
        states.current = updateGoldState(states.current, cells, performance.now())
        dimensions.current = {cellPx, cols, rows}
        wake.current()
    }, [cells, cellPx, cols, rows])

    useEffect(() => {
        const canvas = ref.current
        if (!canvas) return
        let renderer: ReturnType<typeof createDoricGoldRenderer> | undefined
        let disposed = false, lost = false, inView = true, raf = 0, elapsed = 0, last = 0
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
        const stop = () => {cancelAnimationFrame(raf); raf = 0; last = 0}
        const draw = (now: number) => {
            if (!renderer || lost) return
            const d = dimensions.current
            renderer.draw(visibleGoldCells(states.current, now), d.cellPx, d.cols, d.rows, elapsed)
        }
        const tick = (now: number) => {
            raf = 0
            if (last) elapsed += Math.min(now - last, 100) / 1000
            last = now
            draw(now)
            raf = requestAnimationFrame(tick)
        }
        const refresh = () => {
            stop()
            if (!renderer || lost) return
            const active = inView && !document.hidden && !reducedMotion.matches
                && Array.from(states.current.values()).some((cell) => !cell.sold)
            if (!active) {canvas.dataset.goldState = 'paused'; renderer.clear(); return}
            canvas.dataset.goldState = 'active'
            draw(performance.now())
            raf = requestAnimationFrame(tick)
        }
        wake.current = refresh
        const image = new Image()
        image.onload = () => {
            if (disposed || lost) return
            try {renderer = createDoricGoldRenderer(canvas, image); refresh()}
            catch {canvas.dataset.goldState = 'fallback'} // Full static frame stays visible.
        }
        image.onerror = () => {canvas.dataset.goldState = 'fallback'}
        image.src = DORIC_FRAME[1]
        const observer = new IntersectionObserver(([entry]) => {inView = entry.isIntersecting; refresh()})
        observer.observe(canvas)
        const contextLost = (event: Event) => {event.preventDefault(); lost = true; canvas.dataset.goldState = 'lost'; stop()}
        const contextRestored = () => setGeneration((value) => value + 1)
        canvas.addEventListener('webglcontextlost', contextLost)
        canvas.addEventListener('webglcontextrestored', contextRestored)
        document.addEventListener('visibilitychange', refresh)
        reducedMotion.addEventListener('change', refresh)
        return () => {
            disposed = true
            stop()
            wake.current = () => {}
            image.onload = null
            image.onerror = null
            observer.disconnect()
            canvas.removeEventListener('webglcontextlost', contextLost)
            canvas.removeEventListener('webglcontextrestored', contextRestored)
            document.removeEventListener('visibilitychange', refresh)
            reducedMotion.removeEventListener('change', refresh)
            renderer?.clear()
            renderer?.dispose()
        }
    }, [generation])

    return <canvas ref={ref} className="rfb-doric-gold" aria-hidden="true" data-gold-state="loading" style={{left, top, width: cols * cellPx, height: rows * cellPx}} />
}
