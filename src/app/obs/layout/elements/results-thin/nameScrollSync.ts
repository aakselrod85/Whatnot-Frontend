// Shared clock for the running nicknames of every style (ThinResultRow.tsx). Every cell whose
// nickname does not fit registers here; this file then keeps ALL of them in step, in rounds:
//
//   everyone sets off together  ->  each name slides by its own length at the common speed
//   (a short name arrives first and waits)  ->  the longest name arrives  ->  PAUSE  ->  next round.
//
// Before the very first round everyone stands still for START_PAUSE. Timings: scrollStyle.ts.
//
// How: one animation per name, all with the SAME duration (the longest slide + PAUSE) and the same
// start time, so they cannot drift apart. Whenever the set of running names changes (a name
// appears, changes, stops being cut off, or a cell is resized) all animations are rebuilt together
// and the run begins again with the START_PAUSE. Many changes in one go (a whole board redrawing)
// cause one rebuild, not one per cell.

import {SCROLL_PAUSE_MS, SCROLL_SPEED, SCROLL_START_PAUSE_MS} from './scrollStyle'

type Entry = {mover: HTMLElement; distance: number; anim?: Animation}

/** Timings of one clock: speed in px per second, pauses in ms (see scrollStyle.ts). */
export type NameScrollTimings = {speed: number; pauseMs: number; startPauseMs: number}

/**
 * Add (or replace) a running name. `key` identifies the cell, `mover` is the element that slides,
 * `distance` is how far it must slide for the next copy to sit where this one started (px).
 * Returns the function that removes it again.
 */
export type RegisterNameScroll = (key: object, mover: HTMLElement, distance: number) => () => void

/**
 * A separate clock with its own timings: names registered with it move in step with each other,
 * not with names of another clock. resultsThin uses `registerNameScroll` below; the 'sports' skin
 * of `results` makes its own (results/SportsResults.tsx) with the timings in its sportsStyle.ts.
 */
export function createNameScrollSync(timings: NameScrollTimings): RegisterNameScroll {
    const entries = new Map<object, Entry>()
    let rebuildTimer: ReturnType<typeof setTimeout> | undefined

    function register(key: object, mover: HTMLElement, distance: number): () => void {
        const previous = entries.get(key)
        // Nothing changed (the cell's resize observer fires on its first look too): leave everyone be.
        if (previous && previous.mover === mover && previous.distance === distance) {
            return () => unregister(key)
        }
        previous?.anim?.cancel()
        entries.set(key, {mover, distance})
        scheduleRebuild()
        return () => unregister(key)
    }

    function unregister(key: object) {
        const entry = entries.get(key)
        if (!entry) return
        entry.anim?.cancel()
        entries.delete(key)
        scheduleRebuild()
    }

    function scheduleRebuild() {
        if (rebuildTimer !== undefined) return
        rebuildTimer = setTimeout(rebuild, 0)
    }

    function rebuild() {
        rebuildTimer = undefined
        if (entries.size === 0) return

        const slideMs = (distance: number) => (distance / timings.speed) * 1000
        let longestMs = 0
        entries.forEach((e) => {
            longestMs = Math.max(longestMs, slideMs(e.distance))
        })
        const round = longestMs + timings.pauseMs
        const startTime = document.timeline.currentTime

        entries.forEach((e) => {
            e.anim?.cancel()
            const far = `translateX(${-e.distance}px)`
            const anim = e.mover.animate(
                [
                    {transform: 'translateX(0)', offset: 0},
                    {transform: far, offset: slideMs(e.distance) / round},
                    // Stay at the far position until the longest name has arrived and the pause is
                    // over. The restart at the end of the round is not a visible jump: the second copy
                    // of the name sits exactly where the first one started.
                    {transform: far, offset: 1},
                ],
                {duration: round, delay: timings.startPauseMs, iterations: Infinity, easing: 'linear'}
            )
            anim.startTime = startTime
            e.anim = anim
        })
    }

    return register
}

/** The resultsThin clock (scrollStyle.ts timings). */
export const registerNameScroll: RegisterNameScroll = createNameScrollSync({
    speed: SCROLL_SPEED,
    pauseMs: SCROLL_PAUSE_MS,
    startPauseMs: SCROLL_START_PAUSE_MS,
})
