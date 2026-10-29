'use client'

// The `board:rips_flat` registry component (rips-flat-board-plan.md). The framed board art
// (boardArt.ts) as a backdrop, one square cell per team slot inside its gold frame
// (`RIPS_BOARD_INSET`). Ordering is ripsOrder.ts (team tiers or alphabet, no prices; built on
// board:cobra_flat's centre-out deal), the sold state is board:flat's (tiles/, CellSkin, AccentOverlay
// imported); the settled-baseline / grouping logic below is copied from FlatBoard.tsx. With the
// 'flip_art' back the settled cells are grouped differently — into free-form shapes of cells that
// share a side (flipArtShapes.ts, drawn by FlipArtOverlay) instead of flat's rectangles.
//
// No move animation on sale (plan §7.1), but with `soldPlacement: 'sides'` the re-deal waits: a
// sold cell flips and plays its press burst in the slot it was sold in, and only when that ends
// (the cell "settles") does the grid re-deal and the cell jump to the edges. With 'stay' every
// cell is dealt as unsold, so nothing ever moves. `reactsTo` is [] for the same reason as
// board:cobra_flat (no `sold` scene event).

import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import type {ElementProps} from '../../registry'
import {useLayoutData} from '../../useLayoutData'
import {MAX_COLS, splitRows} from '../board-cobra-flat/layout'
import {AccentOverlay} from '../board-flat/AccentOverlay'
import {computeGroups, rectGroup} from '../board-flat/tiles/grouping'
import {cellExposure} from '../board-flat/tiles/exposure'
import {styleForGroup} from '../board-flat/tiles/manifest'
import {useManifest} from '../board-flat/tiles/useManifest'
import {Group} from '../board-flat/tiles/types'
import {RIPS_BOARD_ART, RIPS_BOARD_INSET} from './boardArt'
import {FlipArtOverlay} from './FlipArtOverlay'
import {connectedShapes, shapeGeometry} from './flipArtShapes'
import {
    DEFAULT_RIPS_CELL_ORDER,
    DEFAULT_RIPS_SOLD_PLACEMENT,
    placeRipsCells,
    RIPS_CELL_ORDERS,
    RIPS_SOLD_PLACEMENTS,
    type RipsCell,
    type RipsCellOrder,
    type RipsSoldPlacement,
} from './ripsOrder'
import {useFlipArt} from './useFlipArt'
import {
    DEFAULT_RIPS_BACK_STYLE,
    DEFAULT_RIPS_TILE_SET,
    FLIP_ART_FRAME_RATIO,
    flipArtCover,
    RIPS_BACK_STYLES,
    RIPS_TILE_SETS,
    RipsFlatCell,
    type RipsBackStyle,
    type RipsTileSet,
} from './RipsFlatCell'
import './RipsFlatBoard.css'

// Every skin renders at this tier regardless of group size — same override as FlatBoard.tsx.
const FORCE_SKIN_TIER: 1 | 2 | 3 | null = 3

// Layout effect on the client so the "already sold at mount" baseline is committed before the
// first paint (see FlatBoard.tsx); useEffect on the server where layout effects only warn.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/*
 * Integer-pixel layout (FlatBoard.tsx's useIntegerBoardLayout, with BASE_PAD replaced by the
 * backdrop's inset, given in art px and scaled with the stretched backdrop). Callback ref because the "No active stream / break" early returns mount a
 * different root before the real wrapper (same reason as useCobraFlatLayout).
 *
 * Returns the same numbers twice: `layoutVars` (CSS vars for the grid / AccentOverlay) and
 * `metrics` (plain px) for the 'marble_auto' tile set, which needs each cell's position on the
 * canvas to pick its piece of the marble sheet (RipsFlatCell.tsx `marbleOrigin`).
 */
type RipsFlatMetrics = {cellPx: number; padLeft: number; padTop: number}

function useRipsFlatLayout(rowCount: number) {
    const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null)
    const [wrapSize, setWrapSize] = useState({w: 0, h: 0})

    useEffect(() => {
        const el = wrapEl
        if (!el) return
        const measure = () => setWrapSize({w: el.clientWidth, h: el.clientHeight})
        measure()
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(measure)
            ro.observe(el)
            return () => ro.disconnect()
        }
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [wrapEl])

    const {w, h} = wrapSize
    if (w === 0 || h === 0 || rowCount === 0) return {wrapRef: setWrapEl, layoutVars: null, metrics: null}

    const insetL = Math.round((w * RIPS_BOARD_INSET) / RIPS_BOARD_ART.w)
    const insetR = insetL
    const insetT = Math.round((h * RIPS_BOARD_INSET) / RIPS_BOARD_ART.h)
    const insetB = insetT
    const insetW = Math.max(0, w - insetL - insetR)
    const insetH = Math.max(0, h - insetT - insetB)

    let cellPx = Math.max(1, Math.min(Math.floor(insetW / MAX_COLS), Math.floor(insetH / rowCount)))
    cellPx -= cellPx % 3 // sub-tile lines (3 per cell) land on integers too
    if (cellPx <= 0) cellPx = 3

    // Leftover inside the inset is split into the padding so the grid is centred on both axes.
    const leftoverX = insetW - MAX_COLS * cellPx
    const leftoverY = insetH - rowCount * cellPx
    const padLeft = insetL + Math.floor(leftoverX / 2)
    const padRight = insetR + leftoverX - Math.floor(leftoverX / 2)
    const padTop = insetT + Math.floor(leftoverY / 2)
    const padBottom = insetB + leftoverY - Math.floor(leftoverY / 2)

    const layoutVars = {
        '--cell-px': `${cellPx}px`,
        '--pad-left': `${padLeft}px`,
        '--pad-right': `${padRight}px`,
        '--pad-top': `${padTop}px`,
        '--pad-bottom': `${padBottom}px`,
    } as React.CSSProperties
    const metrics: RipsFlatMetrics = {cellPx, padLeft, padTop}

    return {wrapRef: setWrapEl, layoutVars, metrics}
}

// The element's `tileSet` (set in /obs/controls) picks the front-face art; anything unknown falls
// back to the default.
function tileSetOf(element: ElementProps['element']): RipsTileSet {
    const v = element.kind === 'board' ? element.tileSet : undefined
    return v && (RIPS_TILE_SETS as readonly string[]).includes(v) ? v : DEFAULT_RIPS_TILE_SET
}

// Same for `backStyle` (the back-face art, RipsFlatCell.tsx); independent of the tile set.
function backStyleOf(element: ElementProps['element']): RipsBackStyle {
    const v = element.kind === 'board' ? element.backStyle : undefined
    return v && (RIPS_BACK_STYLES as readonly string[]).includes(v) ? v : DEFAULT_RIPS_BACK_STYLE
}

// The two order selects (ripsOrder.ts); unknown values fall back to the defaults.
function cellOrderOf(element: ElementProps['element']): RipsCellOrder {
    const v = element.kind === 'board' ? element.cellOrder : undefined
    return v && (RIPS_CELL_ORDERS as readonly string[]).includes(v) ? v : DEFAULT_RIPS_CELL_ORDER
}

function soldPlacementOf(element: ElementProps['element']): RipsSoldPlacement {
    const v = element.kind === 'board' ? element.soldPlacement : undefined
    return v && (RIPS_SOLD_PLACEMENTS as readonly string[]).includes(v) ? v : DEFAULT_RIPS_SOLD_PLACEMENT
}

export function RipsFlatBoard({box, element}: ElementProps) {
    const {stream, events: rawEvents, lastFetched} = useLayoutData()
    const manifest = useManifest()
    const tileSet = tileSetOf(element)
    const backStyle = backStyleOf(element)
    const cellOrder = cellOrderOf(element)
    const soldPlacement = soldPlacementOf(element)
    const art = useFlipArt(backStyle === 'flip_art')

    // Cells whose sale effect (flip + press burst) has finished — only these join the shared
    // grouping, and the grid is not re-dealt while any sold cell is still outside this set.
    const [settled, setSettled] = useState<Set<number>>(new Set())
    // One-time baseline guard, reset whenever this board (re)mounts.
    const initializedRef = useRef(false)

    const events = useMemo(() => rawEvents.filter((e) => !e.is_giveaway && !e.note), [rawEvents])

    const handleSettled = useCallback((id: number) => {
        setSettled((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
    }, [])

    // Baseline: on the first real events snapshot every already-sold cell is marked settled (no
    // animation); afterwards only prune ids no longer sold. See FlatBoard.tsx for the full WHY.
    useIsomorphicLayoutEffect(() => {
        const flippedIds = new Set(events.filter((e) => e.customer !== '').map((e) => e.id))
        if (!initializedRef.current) {
            if (!lastFetched.events) return
            initializedRef.current = true
            setSettled(flippedIds)
            return
        }
        setSettled((prev) => {
            let changed = false
            const next = new Set<number>()
            prev.forEach((id) => (flippedIds.has(id) ? next.add(id) : (changed = true)))
            return changed ? next : prev
        })
    }, [events, lastFetched.events])

    const cells: RipsCell[] = useMemo(
        () => events.map((e) => ({eventId: e.id, team: e.team, sold: e.customer !== ''})),
        [events]
    )

    // While a sold cell is still playing its effect the deal is frozen at the last one made with
    // nothing pending, so a second cell settling meanwhile cannot shift the one still bursting.
    // Falls back to the live deal if the set of events itself changed meanwhile (or before the
    // mount baseline, when there is nothing frozen yet). With 'stay' sales never change the deal.
    const hasPending = useMemo(
        () => events.some((e) => e.customer !== '' && !settled.has(e.id)),
        [events, settled]
    )
    const frozenCellsRef = useRef<RipsCell[] | null>(null)
    useEffect(() => {
        if (!hasPending) frozenCellsRef.current = cells
    }, [hasPending, cells])
    const dealtCells = useMemo(() => {
        const frozen = frozenCellsRef.current
        if (!hasPending || !frozen || frozen.length !== cells.length) return cells
        const ids = new Set(cells.map((c) => c.eventId))
        return frozen.every((c) => ids.has(c.eventId)) ? frozen : cells
    }, [hasPending, cells])

    const rowSizes = useMemo(() => splitRows(events.length), [events.length])
    const rowCount = rowSizes.length
    const placed = useMemo(
        () => placeRipsCells(dealtCells, cellOrder, soldPlacement),
        [dealtCells, cellOrder, soldPlacement]
    )
    const {wrapRef, layoutVars, metrics} = useRipsFlatLayout(rowCount)

    const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])

    // Flat's grouping, over the {row, col} addresses from placeRipsCells (+ the integer column
    // offset that centres a short row, plan §3) instead of posFromIndex.
    const items = useMemo(
        () =>
            placed.flatMap((row) => {
                const offset = Math.floor((MAX_COLS - row.length) / 2)
                return row.map((p) => ({eventId: p.eventId, row: p.row, col: p.col + offset}))
            }),
        [placed]
    )

    // Sold cells whose effect has finished — the only ones that join the 'tiles' groups or the
    // 'flip_art' shapes; a cell still flipping / bursting stays a piece of its own.
    const settledPositions = useMemo(
        () => items
            .map((it) => {
                const e = eventById.get(it.eventId)
                return e && e.customer !== '' && settled.has(e.id) ? {row: it.row, col: it.col, order: e.index} : null
            })
            .filter((p): p is NonNullable<typeof p> => p !== null),
        [items, eventById, settled]
    )

    const {groups, posGroup} = useMemo(() => {
        const positions = settledPositions
        // A fully flipped complete rows x cols grid is one group, regardless of sale order.
        const boardComplete = events.length > 0
            && positions.length === events.length
            && events.length === rowCount * MAX_COLS
        const groups = boardComplete
            ? [rectGroup(0, 0, rowCount - 1, MAX_COLS - 1)]
            : computeGroups(positions)
        const posGroup = new Map<string, Group>()
        groups.forEach((g) => {
            for (let r = g.r0; r <= g.r1; r++) {
                for (let c = g.c0; c <= g.c1; c++) posGroup.set(`${r},${c}`, g)
            }
        })
        return {groups, posGroup}
    }, [settledPositions, events.length, rowCount])

    // 'flip_art' shapes: settled sold cells grouped by shared sides (flipArtShapes.ts), any outline.
    const flipShapes = useMemo(
        () => (backStyle === 'flip_art' ? connectedShapes(settledPositions) : []),
        [backStyle, settledPositions]
    )

    const waitingFontSize = Math.max(16, box.h * 0.1)

    if (!stream) {
        return (
            <div className="rfb-root">
                <span className="rfb-waiting" style={{fontSize: `${waitingFontSize}px`}}>No active stream</span>
            </div>
        )
    }

    if (!stream.active_break_id) {
        return (
            <div className="rfb-root">
                <span className="rfb-waiting" style={{fontSize: `${waitingFontSize}px`}}>No active break</span>
            </div>
        )
    }

    // 'flip_art' back: the painting in cover over the whole MAX_COLS x rowCount grid (its top-left
    // is cell (0,0)'s, i.e. (padLeft, padTop) inside the element), and the exposed-side frame's
    // thickness in whole px. Both only exist in that mode so the 'tiles' markup stays as it was.
    // The painting is the page's random pick (useFlipArt); until it is known the backs are frame only.
    const flipArt = backStyle === 'flip_art'
    const artCover = flipArt && metrics && art
        ? {src: art.src, ...flipArtCover(art.w, art.h, MAX_COLS * metrics.cellPx, rowCount * metrics.cellPx)}
        : null
    const artFramePx = metrics ? Math.round(metrics.cellPx * FLIP_ART_FRAME_RATIO) : 0
    const artVars = (flipArt && metrics ? {'--art-frame-px': `${artFramePx}px`} : {}) as React.CSSProperties

    return (
        <div className="rfb-root" ref={wrapRef} style={{...(layoutVars ?? {}), ...artVars, '--cols': MAX_COLS, '--rows': rowCount} as React.CSSProperties}>
            {layoutVars && metrics && (
                <>
                    <div className="rfb-grid">
                        {items.map((it) => {
                            const e = eventById.get(it.eventId)
                            if (!e) return null
                            let group: Group | undefined = posGroup.get(`${it.row},${it.col}`)
                            // Sold but not yet settled (effect still playing): a standalone tile.
                            if (!group && e.customer !== '') {
                                group = {r0: it.row, c0: it.col, r1: it.row, c1: it.col, cells: 1, tier: 1, key: `solo-${e.id}`}
                            }
                            // Where this cell's top-left lands on the 1080x1920 canvas: the element's
                            // box plus the grid padding plus whole cells (inside the element 1 CSS px
                            // is 1 canvas px — Stage.tsx scales the canvas as a whole). Only the
                            // 'marble_auto' set reads it.
                            const marbleOrigin = tileSet === 'marble_auto'
                                ? {x: box.x + metrics.padLeft + it.col * metrics.cellPx, y: box.y + metrics.padTop + it.row * metrics.cellPx}
                                : undefined
                            return (
                                <RipsFlatCell
                                    key={e.id}
                                    event={e}
                                    manifest={manifest}
                                    exposure={group ? cellExposure({row: it.row, col: it.col}, group) : undefined}
                                    styleId={group && manifest ? styleForGroup(manifest, group.key) : undefined}
                                    tier={group ? (FORCE_SKIN_TIER ?? group.tier) : undefined}
                                    alreadySettled={settled.has(e.id)}
                                    onSettled={handleSettled}
                                    style={{gridRow: it.row + 1, gridColumn: it.col + 1}}
                                    tileSet={tileSet}
                                    marbleOrigin={marbleOrigin}
                                    backStyle={backStyle}
                                    // The sheet's top-left relative to THIS cell: the cover offset
                                    // minus whole cells.
                                    flipArt={artCover
                                        ? {src: artCover.src, sheetW: artCover.sheetW, sheetH: artCover.sheetH, x: artCover.offsetX - it.col * metrics.cellPx, y: artCover.offsetY - it.row * metrics.cellPx}
                                        : undefined}
                                />
                            )
                        })}
                    </div>
                    {/* 'flip_art': the settled cells' backs as free-form shapes (touching cells
                        merged, cut to the outline) in one SVG; the grey skin's decorations have
                        no place over the painting. */}
                    {flipArt
                        ? artCover && (
                            <FlipArtOverlay
                                shapes={flipShapes.map((cells) => shapeGeometry(cells, metrics.cellPx, artFramePx))}
                                sheet={artCover}
                                padLeft={metrics.padLeft}
                                padTop={metrics.padTop}
                            />
                        )
                        : <AccentOverlay manifest={manifest} groups={groups} cols={MAX_COLS} rows={rowCount} />}
                </>
            )}
        </div>
    )
}

export default RipsFlatBoard
