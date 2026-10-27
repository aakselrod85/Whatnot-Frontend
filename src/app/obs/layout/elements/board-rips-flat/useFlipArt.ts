import {useEffect, useState} from 'react'

// The 'flip_art' back's painting: one image picked at random from
// public/images/rips_board/FlippedArt (listed by /api/flip-art) when the page loads, then never
// changed — the pick is cached at module level, so a board remount (stage change, settings edit)
// gets the same painting. Only a page reload picks again. The paintings differ in aspect, so the
// pick also carries its natural size for the cover maths (RipsFlatCell.tsx `flipArtCover`).

export type FlipArtImage = {src: string; w: number; h: number}

// Used if the listing fails or the folder is empty.
const FALLBACK_SRC = '/images/rips_board/FlippedArt/FlipArt1.png'

let picked: Promise<FlipArtImage | null> | null = null

function loadSize(src: string): Promise<FlipArtImage | null> {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve({src, w: img.naturalWidth, h: img.naturalHeight})
        img.onerror = () => resolve(null)
        img.src = src
    })
}

function pickOnce(): Promise<FlipArtImage | null> {
    if (!picked) {
        picked = fetch('/api/flip-art')
            .then((r) => (r.ok ? r.json() : {files: []}))
            .catch(() => ({files: []}))
            .then(({files}: {files: string[]}) =>
                loadSize(files.length > 0 ? files[Math.floor(Math.random() * files.length)] : FALLBACK_SRC)
            )
    }
    return picked
}

// null until the pick and its size are known (the back then has no painting yet).
export function useFlipArt(enabled: boolean): FlipArtImage | null {
    const [art, setArt] = useState<FlipArtImage | null>(null)
    useEffect(() => {
        if (!enabled) return
        let alive = true
        pickOnce().then((a) => {
            if (alive) setArt(a)
        })
        return () => {
            alive = false
        }
    }, [enabled])
    return enabled ? art : null
}
