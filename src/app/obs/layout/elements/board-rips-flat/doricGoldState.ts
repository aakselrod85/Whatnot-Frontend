/** Static fronts travel with the existing 3D flip; the GPU only paints resting, unsold gold. */
export type GoldCell = {id: number; row: number; col: number; sold: boolean}
export type GoldState = GoldCell & {resumeAt: number}
// RipsFlatCell.css returns an un-sold cell to its front over 0.8s.
export const GOLD_RETURN_MS = 800
export function updateGoldState(previous: ReadonlyMap<number, GoldState>, cells: readonly GoldCell[], now: number): Map<number, GoldState> {
    return new Map(cells.map((cell) => {
        const old = previous.get(cell.id)
        const resumeAt = old?.sold && !cell.sold ? now + GOLD_RETURN_MS : old?.resumeAt ?? 0
        return [cell.id, {...cell, resumeAt}]
    }))
}
export function visibleGoldCells(state: ReadonlyMap<number, GoldState>, now: number): GoldState[] {
    return Array.from(state.values()).filter((cell) => !cell.sold && now >= cell.resumeAt)
}
