import {Logger} from "@/app/entity/logger";
import {MyOBSWebsocket} from "@/app/entity/my_obs_websocket";
import {useEffect, useMemo} from "react";

export function useOSBWebhook(url: string, logger: Logger, setIsConnected: (isConnected: boolean) => void) {
    const obs = useMemo(() => {
        return new MyOBSWebsocket(url, logger, setIsConnected)
        // logger and setIsConnected are stable for the life of the page (a useState initialiser and
        // a setState function), so the socket is rebuilt only when the URL actually changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url])

    // Close the socket this hook is replacing. Without this every URL edit left a live, identified
    // client connected to OBS with nothing referencing it — invisible while connecting was a manual
    // one-off, but the controls page now reconnects on its own, so the orphans would accumulate and
    // each one would keep answering OBS's heartbeats forever.
    useEffect(() => {
        return () => {
            // Never connected is the normal case here (the page rebuilt the socket before the
            // first attempt landed) and obs-websocket rejects a disconnect in that state.
            void obs.disconnect().catch(() => {})
        }
    }, [obs])

    return obs
}
