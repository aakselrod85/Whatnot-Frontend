'use client'

// The `resultsThin` registry component (obs-layout-plan.md §2.4) — a compact, configurable
// sibling of `results` (§2.3, ResultsElement.tsx) for stages where the full results board is too
// heavy: alongside a board, or during `ripping`. Its own registry id (`resultsThin`, own singleton
// group) so a config may place both a full results board AND a thin list at the same time.
//
// Shares the data spine (`useLayoutData()` — never its own polling) and the ordering helper
// (elements/results/orderResults.ts) with §2.3: that helper's `{columns, sort}` contract was
// generalised in this step precisely so both callers share one ordering implementation instead of
// a second copy of the interleave logic.
//
// Row sizing is the full board's: the field height (`box.h`, or the part of it the rips board art
// leaves free) is divided by the row count and handed to the CSS as `--rest-row-h`, so every row
// always fits inside the field whatever the box height or column count — a tall box stretches the
// rows, a short one squeezes them, with no lower bound. Icon, abbreviation tile and text sizes all
// derive from that one row height in ThinResultRow.css; nothing is sized by a px setting any more.

import {useMemo} from 'react'
import type {ElementProps} from '../../registry'
import {useLayoutData} from '../../useLayoutData'
import {useSceneEvent} from '../../sceneEventBus'
import {orderResults} from '../results/orderResults'
import {NO_SERIES_TIER, tiersByEventId} from '../results/tiers'
import {ThinResultRow} from './ThinResultRow'
import {RipsTopDecoration} from './RipsTopDecoration'
import {RIPS_THIN_BOARD_SCALE, RIPS_THIN_BOARD_SLICE, RIPS_THIN_BOARD_SRC, RIPS_THIN_GRID_INSETS} from './ripsStyle'
import type {ResultsSort, ResultsThinStyle} from '../../schema'
import './ThinResults.css'
import './ThinResultsRips.css'

// Fixed cosmetic spacing of the default style's panel (ThinResults.css `.rest-grid`): its border,
// its inner padding and the vertical gap between rows. Declared HERE and handed to the CSS as
// custom properties (--rest-border / --rest-pad / --rest-gap) so the row-height maths below and
// the painted panel can never drift apart. Literal px, same as the full board's GRID_* constants.
const GRID_BORDER = 2
const GRID_PADDING = 10
const GRID_ROW_GAP = 4

// Registry defaults (registry.ts `makeElement()` leaves these fields unset on a freshly-added
// element so the component's own defaults apply, same convention as StashOrPassWrap's DEFAULT_*
// constants) — also used by ThinResultsSettings.tsx so the controls UI shows the same values.
export const DEFAULT_COLUMNS = 2
export const DEFAULT_SORT: ResultsSort = 'alphabetical'
export const DEFAULT_STYLE: ResultsThinStyle = 'default' // the only look this element had before styles
// The rips style's ledge + chains above the box (RipsTopDecoration.tsx): on unless switched off.
export const DEFAULT_TOP_DECORATION = true

export function ThinResults({elementKey, element, box}: ElementProps) {
    const {events: rawEvents, breakObject, stream, refetch} = useLayoutData()

    // `element` is typed as the full `Element` union; ThinResults is only ever mounted for a
    // `resultsThin` element (registry.ts maps this component 1:1 to that kind), but the ternaries
    // below narrow defensively rather than assert, so a mismatched registration fails safe to
    // defaults instead of throwing.
    const columns = element.kind === 'resultsThin' ? (element.columns ?? DEFAULT_COLUMNS) : DEFAULT_COLUMNS
    const sort = element.kind === 'resultsThin' ? (element.sort ?? DEFAULT_SORT) : DEFAULT_SORT
    const style = element.kind === 'resultsThin' ? (element.style ?? DEFAULT_STYLE) : DEFAULT_STYLE
    const isRips = style === 'rips'
    // Rips only: the default style never draws the decoration whatever the flag says.
    const showTopDecoration =
        isRips && (element.kind === 'resultsThin' ? (element.topDecoration ?? DEFAULT_TOP_DECORATION) : DEFAULT_TOP_DECORATION)

    const {ordered} = useMemo(
        // 'row': .rest-grid is a plain grid-auto-flow:row, so it must be handed the sorted order
        // as is. The column-major scramble `results` uses would split each customer's run across
        // non-adjacent cells here.
        () => orderResults(rawEvents, {columns, sort, flow: 'row'}),
        [rawEvents, columns, sort]
    )

    // Same ranking as the full results board (../results/tiers.ts) so the two never disagree about
    // what tier a slot is — including the "nothing to rank by" case, which flattens everything.
    const hasSeries = !!breakObject?.series_id
    const tiers = useMemo(() => tiersByEventId(rawEvents, hasSeries), [rawEvents, hasSeries])

    // How many rows the grid actually renders — derived from the rendered list, not from
    // orderResults()'s `rows`, for the reason ResultsElement.tsx gives (the two interleaved blocks
    // share a row wherever the first ends mid-row, so that count overstates the truth).
    const visualRows = columns > 0 ? Math.ceil(ordered.length / columns) : 0

    // Row height from the box, exactly as the full board does it (ResultsElement.tsx). The field
    // the rows divide is:
    //   - default: the whole box, less the panel's own border and padding (both sides);
    //   - rips:    the part of the box the board art leaves free between its top and bottom bands
    //              (RIPS_THIN_GRID_INSETS — the same insets the grid is positioned with below);
    //              the grid has no border or padding of its own in that style.
    // The row gaps come off that, and what is left is split evenly. Deliberately NO minimum: rows
    // get as small as they must for every one of them to fit.
    const chromePx = isRips ? 0 : (GRID_BORDER + GRID_PADDING) * 2
    const fieldHeight = isRips
        ? box.h - (RIPS_THIN_GRID_INSETS.top + RIPS_THIN_GRID_INSETS.bottom) * RIPS_THIN_BOARD_SCALE
        : box.h
    const availableHeight = Math.max(0, fieldHeight - chromePx - GRID_ROW_GAP * Math.max(0, visualRows - 1))
    const rowHeightPx = visualRows > 0 ? availableHeight / visualRows : 0

    // Centre a short final row, exactly as the full board does (see ResultsElement.tsx for the
    // reasoning): the grid is laid out on twice as many tracks as columns with every cell spanning
    // two, so the shift is expressible in HALF columns — without that, one cell across four
    // columns can only manage a whole-column shift and lands off-centre.
    const lastRowStart = Math.max(0, (visualRows - 1) * columns)
    const lastRowCount = ordered.length - lastRowStart
    const lastRowOffset =
        lastRowCount > 0 && lastRowCount < columns ? columns - lastRowCount : 0

    // The style is a modifier class on the root (`rest-root--rips`); every rips rule in
    // ThinResultsRips.css is scoped under it, so the default look is untouched.
    const rootClass = isRips ? 'rest-root rest-root--rips' : 'rest-root'

    if (!stream) {
        return (
            <div className={rootClass}>
                <div className="rest-empty">Active stream is not set</div>
            </div>
        )
    }

    // Art paths are passed inline from ripsStyle.ts, the only place that names a file. The grid's
    // `inset` is the same RIPS_THIN_GRID_INSETS the row height above was derived from.
    // Rips board: ResultsThin.png drawn as a 9-slice (border-image) on its own layer under the
    // grid — corners at a fixed size (RIPS_THIN_BOARD_SLICE × RIPS_THIN_BOARD_SCALE), edges and
    // the blue middle stretched to the box.
    const sc = RIPS_THIN_BOARD_SCALE
    const sl = RIPS_THIN_BOARD_SLICE
    const boardArtStyle: React.CSSProperties | undefined = isRips
        ? {
              borderStyle: 'solid',
              borderWidth: `${sl.top * sc}px ${sl.right * sc}px ${sl.bottom * sc}px ${sl.left * sc}px`,
              borderImage: `url(${RIPS_THIN_BOARD_SRC}) ${sl.top} ${sl.right} ${sl.bottom} ${sl.left} fill stretch`,
          }
        : undefined
    const gi = RIPS_THIN_GRID_INSETS
    const gridInset = isRips
        ? {inset: `${gi.top * sc}px ${gi.right * sc}px ${gi.bottom * sc}px ${gi.left * sc}px`}
        : undefined

    return (
        <div className={rootClass}>
            <div className="rest-frame">
                {isRips && <div className="rest-board-art" style={boardArtStyle}/>}
                {/* Only mounted once there is a row to size — `repeat(0, ...)` is not valid CSS,
                    and the full board gates its grid the same way. */}
                {visualRows > 0 && (
                    <div
                        className="rest-grid"
                        style={
                            {
                                ...gridInset,
                                '--rest-rows': visualRows,
                                '--rest-row-h': `${rowHeightPx}px`,
                                '--rest-border': `${GRID_BORDER}px`,
                                '--rest-pad': `${GRID_PADDING}px`,
                                '--rest-gap': `${GRID_ROW_GAP}px`,
                                '--rest-columns': columns,
                                '--rest-tracks': columns * 2,
                            } as React.CSSProperties
                        }
                    >
                        {ordered.map((event, i) => (
                            <ThinResultRow
                                key={event.id}
                                event={event}
                                gridColumnStart={
                                    lastRowOffset > 0 && i === lastRowStart ? lastRowOffset + 1 : undefined
                                }
                                tier={tiers.get(event.id) ?? NO_SERIES_TIER}
                                highBidTeam={breakObject?.high_bid_team ?? ''}
                                giveawayTeam={breakObject?.giveaway_team ?? ''}
                                isRips={isRips}
                            />
                        ))}
                    </div>
                )}
            </div>
            {/* Sibling of .rest-frame, not inside it: the frame clips (ThinResults.css), and the
                decoration draws above the box — the registry entry is `unclipped` for it. */}
            {showTopDecoration && <RipsTopDecoration box={box} />}
        </div>
    )
}

export default ThinResults
