'use client'

// The layout page's OWN obs-websocket connection (hit-sequence-plan.md §4). Why it exists:
// `window.obsstudio` exposes nothing for scene items or media, but a browser source is ordinary
// Chromium on the OBS machine, so it can dial obs-websocket exactly like the controls page does —
// which lets a sale-driven sequence run on ONE page with ONE clock and no return path.
//
// Only dialled when the config holds a `hitSequence` element (`enabled`); every other layout
// behaves exactly as before. The reconnect loop is COPIED in shape from controls/useControls.ts
// (fixed RETRY_MS, one attempt in flight, one timer pending, `connect()` resolves on failure so
// success is read from `isConnected()`), minus its "stop retrying" switch: a browser source has
// no operator to press Retry, so it retries forever. The socket builder is copied from
// component/useOSBWebhook.ts, not imported (that hook wants a page-level Logger).
//
// The wrapper stays thin: callers own their timeouts (obsSteps.ts `withTimeout`), and every method
// REJECTS with a plain Error when disconnected instead of letting `guardIsConnected()` throw
// synchronously.

import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Logger } from '@/app/entity/logger'
import { MyOBSWebsocket } from '@/app/entity/my_obs_websocket'

export type LayoutObsStatus = 'off' | 'connecting' | 'connected' | 'reconnecting'

export type LayoutObs = {
    isConnected(): boolean
    status(): LayoutObsStatus
    attempts(): number
    lastError(): string | null
    resolveItem(scene: string, source: string): Promise<{ scene: string; sceneItemId: number } | null>
    setSceneItemEnabled(scene: string, sceneItemId: number, enabled: boolean): Promise<void>
    playMedia(source: string): Promise<void>
    onMediaPlaybackEnded(source: string, cb: () => void): () => void
    onConnected(cb: () => void): () => void
}

/** Snapshot for the dev panel (re-renders it; the handle above is stable and does not). */
export type LayoutObsInfo = { status: LayoutObsStatus; attempts: number; lastError: string | null; log: string[] }

// Same value and same reasoning as useControls.ts: OBS may be started before or after the source
// loads, and either order must converge within one interval.
const RETRY_MS = 5000
const LOG_LINES = 20

const ObsContext = createContext<LayoutObs | null>(null)
const InfoContext = createContext<LayoutObsInfo | null>(null)

export function LayoutObsProvider({ url, enabled, children }: { url: string; enabled: boolean; children: ReactNode }) {
    const [info, setInfo] = useState<LayoutObsInfo>({ status: 'off', attempts: 0, lastError: null, log: [] })
    // Mirrors of `info` for the stable handle, which must read the latest values without being
    // rebuilt on every change.
    const statusRef = useRef<LayoutObsStatus>('off')
    const attemptsRef = useRef(0)
    const lastErrorRef = useRef<string | null>(null)
    const logRef = useRef<string[]>([])
    const connectedListeners = useRef<Set<() => void>>(new Set())
    const resolveCache = useRef<Map<string, { scene: string; sceneItemId: number }>>(new Map())

    function publishInfo() {
        setInfo({ status: statusRef.current, attempts: attemptsRef.current, lastError: lastErrorRef.current, log: logRef.current.slice() })
    }

    // Built once per URL and closed on URL change/unmount (the five lines of useOSBWebhook.ts).
    const obs = useMemo(() => {
        if (!enabled) return null
        const logger: Logger = {
            add: (value: string) => {
                console.info(`[layout/obs] ${value}`)
                logRef.current = [...logRef.current, value].slice(-LOG_LINES)
                publishInfo()
            },
            addMany: (values: string[]) => values.forEach((v) => logger.add(v)),
        }
        let wasConnected = false
        return new MyOBSWebsocket(url, logger, (isConnected) => {
            // Rising edge only (§4.4): pending cleanups run when OBS comes back.
            if (isConnected && !wasConnected) connectedListeners.current.forEach((fn) => fn())
            wasConnected = isConnected
        })
        // `publishInfo` only touches refs and a setState; stable for the page's life.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, enabled])

    useEffect(() => {
        if (!obs) return
        return () => {
            // Never connected is the normal case (rebuilt before the first attempt landed) and
            // obs-websocket rejects a disconnect in that state.
            void obs.disconnect().catch(() => {})
        }
    }, [obs])

    // Reconnect loop — copied from useControls.ts (see header); retries forever.
    useEffect(() => {
        if (!obs) {
            statusRef.current = 'off'
            publishInfo()
            return
        }
        let stopped = false
        let timer: ReturnType<typeof setTimeout> | null = null
        // Exactly one attempt in flight and at most one timer pending, always. A single FAILED
        // attempt triggers scheduleRetry() twice — from the finally below and from
        // `ConnectionClosed`, which obs-websocket emits for a failed attempt too — so without both
        // guards attempts would double every RETRY_MS.
        let inFlight = false

        function clearTimer() {
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
        }

        function attempt() {
            if (stopped || !obs || inFlight) return
            clearTimer()
            if (obs.isConnected()) return
            inFlight = true
            statusRef.current = attemptsRef.current > 0 ? 'reconnecting' : 'connecting'
            publishInfo()
            obs.connect().finally(() => {
                inFlight = false
                if (stopped || !obs) return
                if (obs.isConnected()) {
                    statusRef.current = 'connected'
                    attemptsRef.current = 0
                    lastErrorRef.current = null
                    publishInfo()
                    return
                }
                attemptsRef.current += 1
                lastErrorRef.current = obs.lastError
                scheduleRetry()
            })
        }

        function scheduleRetry() {
            // While an attempt is in flight its own finally() schedules the next wait.
            if (stopped || inFlight) return
            clearTimer()
            statusRef.current = 'reconnecting'
            publishInfo()
            timer = setTimeout(attempt, RETRY_MS)
        }

        function onClosed() {
            if (stopped) return
            resolveCache.current.clear()
            scheduleRetry()
        }

        obs.webSocket.on('ConnectionClosed', onClosed)
        if (!obs.isConnected()) attempt()

        return () => {
            stopped = true
            clearTimer()
            obs.webSocket.off('ConnectionClosed', onClosed)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [obs])

    const handle = useMemo<LayoutObs | null>(() => {
        if (!obs) return null
        const down = () => Promise.reject(new Error('obs disconnected'))
        return {
            isConnected: () => obs.isConnected(),
            status: () => statusRef.current,
            attempts: () => attemptsRef.current,
            lastError: () => lastErrorRef.current,
            resolveItem: (scene, source) => {
                if (!obs.isConnected()) return down()
                const cacheKey = `${scene}\u0000${source}`
                const hit = resolveCache.current.get(cacheKey)
                if (hit) return Promise.resolve(hit)
                // Nested scenes/groups are not searched (same limit as findSceneItemInProgramScene).
                return obs.getSceneItemList({ name: scene, uuid: '' }).then((items) => {
                    const match = items.find((i) => i.name === source)
                    if (!match) return null
                    const found = { scene, sceneItemId: parseInt(match.uuid, 10) }
                    resolveCache.current.set(cacheKey, found)
                    return found
                })
            },
            setSceneItemEnabled: (scene, id, enabled) => (obs.isConnected() ? obs.setSceneItemEnabled(scene, id, enabled) : down()),
            playMedia: (source) => (obs.isConnected() ? obs.playMedia(source) : down()),
            onMediaPlaybackEnded: (source, cb) => obs.onMediaPlaybackEnded(source, cb),
            onConnected: (cb) => {
                connectedListeners.current.add(cb)
                return () => {
                    connectedListeners.current.delete(cb)
                }
            },
        }
    }, [obs])

    return (
        <ObsContext.Provider value={handle}>
            <InfoContext.Provider value={enabled ? info : null}>{children}</InfoContext.Provider>
        </ObsContext.Provider>
    )
}

/** `null` when the provider is absent or disabled. */
export function useLayoutObs(): LayoutObs | null {
    return useContext(ObsContext)
}

/** Dev-panel status snapshot; `null` when the provider is absent or disabled. */
export function useLayoutObsInfo(): LayoutObsInfo | null {
    return useContext(InfoContext)
}
