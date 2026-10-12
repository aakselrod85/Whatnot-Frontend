// Step scheduler for `hitSequence` (hit-sequence-plan.md §3.4). Pure on purpose — no React, no DOM,
// only timers and an injectable clock — so it can be exercised by hand in a scratch script. The
// timeline engine under elements/animation/timeline/ is deliberately NOT reused (plan §1.6): this
// needs durations resolved at run time (video metadata, OBS playback end), not keyframe tracks.
//
// Timing model (plan §1.5): nothing is an absolute time. Step i starts at
// `(startAt === 'prevEnd' ? prevEnd : prevStart) + delayMs` of step i-1; the first step has both at 0.
// A step's end is only known after its hook answers, so `prevEnd` is a promise and only a step that
// asks for `prevEnd` waits on it; a `prevStart` step is free to overlap an unfinished one.
import type { HitStep } from '../../schema'

export type VideoStep = Extract<HitStep, { kind: 'video' }>
export type ObsStep = Extract<HitStep, { kind: 'obs' }>

export type RunHooks = {
    /** Starts the step's video and answers its duration in ms (override or natural length). */
    startVideo(step: VideoStep): number
    stopVideo(step: VideoStep): void
    /** Performs the OBS action and answers how long the step lasts (hold / until-ended / 0). */
    obs(step: ObsStep): Promise<number>
    reveal(): void
    ball(visible: boolean): void
    log(message: string): void
}

export type RunHandle = { abort(): void; done: Promise<void> }

export function runSteps(steps: HitStep[], hooks: RunHooks, now: () => number = () => performance.now()): RunHandle {
    const t0 = now()
    const elapsed = () => now() - t0
    let aborted = false
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const wakers = new Set<() => void>()
    const startedVideos: VideoStep[] = []
    const stoppedVideos = new Set<VideoStep>()
    let resolveDone: () => void = () => {}
    const done = new Promise<void>((resolve) => {
        resolveDone = resolve
    })

    // Resolves after `ms` (re-checked against the clock once, per the plan's "one setTimeout,
    // re-checked"), or immediately when the run is aborted.
    function wait(ms: number): Promise<void> {
        return new Promise((resolve) => {
            if (aborted || ms <= 0) return resolve()
            const wake = () => resolve()
            wakers.add(wake)
            const fire = (until: number) => {
                const t = setTimeout(() => {
                    timers.delete(t)
                    const left = until - elapsed()
                    if (!aborted && left > 1) return fire(until)
                    wakers.delete(wake)
                    resolve()
                }, Math.max(0, until - elapsed()))
                timers.add(t)
            }
            fire(elapsed() + ms)
        })
    }

    function at(absMs: number, fn: () => void) {
        const t = setTimeout(() => {
            timers.delete(t)
            if (!aborted) fn()
        }, Math.max(0, absMs - elapsed()))
        timers.add(t)
    }

    function stopVideo(step: VideoStep) {
        if (stoppedVideos.has(step)) return
        stoppedVideos.add(step)
        try {
            hooks.stopVideo(step)
        } catch (e) {
            hooks.log(`stopVideo failed: ${String(e)}`)
        }
    }

    // Returns the step's absolute end (ms since run start).
    function runOne(step: HitStep, start: number): Promise<number> {
        switch (step.kind) {
            case 'video': {
                let duration = 0
                try {
                    duration = Math.max(0, hooks.startVideo(step))
                    startedVideos.push(step)
                } catch (e) {
                    hooks.log(`video step failed: ${String(e)}`)
                }
                const end = start + duration
                at(end, () => stopVideo(step))
                return Promise.resolve(end)
            }
            case 'obs':
                return hooks.obs(step).then(
                    (duration) => {
                        const end = start + Math.max(0, duration)
                        // A `show` with a hold schedules its own hide at its end.
                        if (step.action === 'show' && step.holdMs !== undefined && !aborted) {
                            at(end, () => {
                                void hooks.obs({ ...step, action: 'hide', holdMs: undefined })
                            })
                        }
                        return end
                    },
                    (e) => {
                        hooks.log(`obs step failed: ${String(e)}`)
                        return start
                    }
                )
            case 'reveal':
                hooks.reveal()
                return Promise.resolve(start)
            case 'ball':
                hooks.ball(step.action === 'show')
                return Promise.resolve(start)
            case 'wait':
                return Promise.resolve(start + Math.max(0, step.durationMs))
        }
    }

    async function main() {
        let prevStart = 0
        let prevEnd: Promise<number> = Promise.resolve(0)
        const ends: Promise<number>[] = []
        for (const step of steps) {
            if (aborted) return
            const base = step.startAt === 'prevEnd' ? await prevEnd : prevStart
            if (aborted) return
            const start = base + Math.max(0, step.delayMs)
            await wait(start - elapsed())
            if (aborted) return
            const end = runOne(step, start)
            prevStart = start
            prevEnd = end
            ends.push(end)
        }
        const maxEnd = Math.max(0, ...(await Promise.all(ends)))
        await wait(maxEnd - elapsed())
    }

    void main()
        .catch((e) => hooks.log(`run failed: ${String(e)}`))
        .finally(() => resolveDone())

    return {
        abort() {
            if (aborted) return
            aborted = true
            timers.forEach((t) => clearTimeout(t))
            timers.clear()
            wakers.forEach((w) => w())
            wakers.clear()
            startedVideos.forEach(stopVideo)
            resolveDone()
        },
        done,
    }
}
