// OBS side of a hit-sequence run (hit-sequence-plan.md §3.6): executes one `obs` step through the
// layout page's own connection (obsConnection.tsx) and never throws or stalls the sequence because
// OBS is down — a disconnected or failing call is logged and skipped, and the step still answers a
// duration so the clock is unaffected. Every OBS call is bounded by a timeout HERE (the wrapper is
// deliberately a thin pass-through).
import type { LayoutObs } from '../../obsConnection'
import type { ObsStep } from './runner'

export const OBS_CALL_TIMEOUT_MS = 2000
export const PLAY_SAFETY_MS = 15_000

/** A scene item this run turned on and has not turned off yet; the cleanup pass hides leftovers. */
export type ShownItem = { scene: string; sceneItemId: number }

export function withTimeout<T>(p: Promise<T>, ms = OBS_CALL_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms)
        p.then(
            (v) => {
                clearTimeout(t)
                resolve(v)
            },
            (e) => {
                clearTimeout(t)
                reject(e)
            }
        )
    })
}

const shownKey = (i: ShownItem) => `${i.scene}\u0000${i.sceneItemId}`

/** Executes `step`; answers how long the step lasts (hold / until playback ends / 0). */
export async function executeObsStep(
    step: ObsStep,
    team: string,
    obs: LayoutObs | null,
    log: (message: string) => void,
    shown: Map<string, ShownItem>
): Promise<number> {
    const label = step.label ?? `${step.action} (${step.id})`
    const holdMs = step.action === 'show' ? step.holdMs ?? 0 : 0
    if (!obs || !obs.isConnected()) {
        log(`OBS disconnected — skipped ${label}`)
        return holdMs
    }
    // `{team}` is substituted in the source name only, never the scene (plan §3.3).
    const items = step.items.map((it) => ({ scene: it.scene, source: it.source.replaceAll('{team}', team) }))

    if (step.action === 'play') {
        const sources = items.map((i) => i.source).filter((s) => s !== '')
        if (sources.length === 0) return 0
        const t0 = performance.now()
        let ended: Promise<number> | null = null
        let unsub = () => {}
        if (step.waitForEnd) {
            // Subscribed BEFORE the play call so a very short clip cannot end unobserved.
            ended = new Promise<number>((resolve) => {
                const safety = setTimeout(() => {
                    unsub()
                    log(`${label}: playback end not reported within ${PLAY_SAFETY_MS} ms, continuing`)
                    resolve(PLAY_SAFETY_MS)
                }, PLAY_SAFETY_MS)
                unsub = obs.onMediaPlaybackEnded(sources[0], () => {
                    clearTimeout(safety)
                    unsub()
                    resolve(performance.now() - t0)
                })
            })
        }
        await Promise.all(
            sources.map((source) =>
                withTimeout(obs.playMedia(source)).catch((e) => log(`${label}: play "${source}" failed: ${String(e)}`))
            )
        )
        return ended ? ended : 0
    }

    if (step.action === 'showPlay') {
        // Show, let OBS autoplay ("Restart playback when source becomes active" — no
        // TriggerMediaInputAction), wait for the first item's playback end, then hide.
        const resolvedAll = (
            await Promise.all(
                items.map(async (it) => {
                    try {
                        const r = await withTimeout(obs.resolveItem(it.scene, it.source))
                        if (!r) log(`${label}: "${it.source}" not found in scene "${it.scene}", skipped`)
                        return r
                    } catch (e) {
                        log(`${label}: "${it.source}" failed: ${String(e)}`)
                        return null
                    }
                })
            )
        ).filter((r): r is ShownItem => r !== null)
        if (resolvedAll.length === 0 || items[0].source === '') return 0
        const t0 = performance.now()
        let unsub = () => {}
        // Subscribed BEFORE enabling so a very short clip cannot end unobserved.
        const ended = new Promise<number>((resolve) => {
            const safety = setTimeout(() => {
                unsub()
                log(`${label}: playback end not reported within ${PLAY_SAFETY_MS} ms, continuing`)
                resolve(PLAY_SAFETY_MS)
            }, PLAY_SAFETY_MS)
            unsub = obs.onMediaPlaybackEnded(items[0].source, () => {
                clearTimeout(safety)
                unsub()
                resolve(performance.now() - t0)
            })
        })
        resolvedAll.forEach((r) => shown.set(shownKey(r), r))
        await Promise.all(
            resolvedAll.map((r) =>
                withTimeout(obs.setSceneItemEnabled(r.scene, r.sceneItemId, true)).catch((e) =>
                    log(`${label}: enabling ${r.scene}#${r.sceneItemId} failed: ${String(e)}`)
                )
            )
        )
        const duration = await ended
        await Promise.all(
            resolvedAll.map((r) =>
                withTimeout(obs.setSceneItemEnabled(r.scene, r.sceneItemId, false)).then(
                    () => {
                        shown.delete(shownKey(r))
                    },
                    (e) => log(`${label}: hiding ${r.scene}#${r.sceneItemId} failed: ${String(e)}`)
                )
            )
        )
        return duration
    }

    const enable = step.action === 'show'
    await Promise.all(
        items.map(async (it) => {
            try {
                const resolved = await withTimeout(obs.resolveItem(it.scene, it.source))
                if (!resolved) {
                    log(`${label}: "${it.source}" not found in scene "${it.scene}", skipped`)
                    return
                }
                // Every show is registered, before the call, whether or not it has a hold: a later
                // `hide` step removes it, and anything still here when the run ends or aborts is
                // hidden by the cleanup pass (hit-sequence-plan.md §3.6). A show that half-fails is
                // hidden by the same pass.
                if (enable) shown.set(shownKey(resolved), resolved)
                await withTimeout(obs.setSceneItemEnabled(resolved.scene, resolved.sceneItemId, enable))
                if (!enable) shown.delete(shownKey(resolved))
            } catch (e) {
                log(`${label}: "${it.source}" failed: ${String(e)}`)
            }
        })
    )
    return holdMs
}

/** Cleanup pass (plan §3.6): hide everything still in `shown`. Resolves `true` when nothing is left
 *  to retry (empty or all hidden), `false` when OBS was down or a call failed (items stay in `shown`). */
export async function hideShown(obs: LayoutObs | null, shown: Map<string, ShownItem>, log: (message: string) => void): Promise<boolean> {
    if (shown.size === 0) return true
    if (!obs || !obs.isConnected()) return false
    await Promise.all(
        Array.from(shown.entries()).map(([key, item]) =>
            withTimeout(obs.setSceneItemEnabled(item.scene, item.sceneItemId, false)).then(
                () => {
                    shown.delete(key)
                },
                (e) => log(`cleanup: hiding ${item.scene}#${item.sceneItemId} failed: ${String(e)}`)
            )
        )
    )
    return shown.size === 0
}
