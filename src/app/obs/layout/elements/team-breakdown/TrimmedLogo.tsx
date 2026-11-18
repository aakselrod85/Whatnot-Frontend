'use client'

// A logo that fills its box as far as its own proportions allow, ignoring the transparent margins
// many logo files carry. The visible (non-transparent) bounds are measured once per file on a
// canvas and cached; until then the whole file is shown "contain" like a plain <img>.

import { useEffect, useState } from 'react'

type Bounds = { x: number; y: number; w: number; h: number } // fractions of the file's size
type Trim = { bounds: Bounds; aspect: number } // aspect = visible width / visible height in px

const cache = new Map<string, Promise<Trim | null>>()

function measure(src: string): Promise<Trim | null> {
    let p = cache.get(src)
    if (!p) {
        p = new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                const W = img.naturalWidth
                const H = img.naturalHeight
                const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
                if (!ctx || !W || !H) return resolve(null)
                ctx.canvas.width = W
                ctx.canvas.height = H
                ctx.drawImage(img, 0, 0)
                let data: Uint8ClampedArray
                try {
                    data = ctx.getImageData(0, 0, W, H).data
                } catch {
                    return resolve(null)
                }
                let minX = W, minY = H, maxX = -1, maxY = -1
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        if (data[(y * W + x) * 4 + 3] > 16) {
                            if (x < minX) minX = x
                            if (x > maxX) maxX = x
                            if (y < minY) minY = y
                            if (y > maxY) maxY = y
                        }
                    }
                }
                if (maxX < 0) return resolve(null)
                const w = maxX - minX + 1
                const h = maxY - minY + 1
                resolve({ bounds: { x: minX / W, y: minY / H, w: w / W, h: h / H }, aspect: w / h })
            }
            img.onerror = () => resolve(null)
            img.src = src
        })
        cache.set(src, p)
    }
    return p
}

type Props = {
    src: string
    // The box to fill, in px, relative to the positioned parent.
    left: number
    top: number
    width: number
    height: number
    // CSS `filter` (the outline).
    filter?: string
}

export function TrimmedLogo({ src, left, top, width, height, filter }: Props) {
    const [trim, setTrim] = useState<Trim | null>(null)
    useEffect(() => {
        let alive = true
        setTrim(null)
        measure(src).then((t) => alive && setTrim(t))
        return () => {
            alive = false
        }
    }, [src])

    if (!trim) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="tbd-logo" src={src} alt="" style={{ left, top, width, height, objectFit: 'contain', filter }} />
        )
    }

    // Size of the visible part, "contain" in the box, centred.
    const vw = Math.min(width, height * trim.aspect)
    const vh = vw / trim.aspect
    // The whole file is drawn larger so its visible part lands exactly on that rectangle; the
    // transparent margins hang outside the box, invisible.
    const fullW = vw / trim.bounds.w
    const fullH = vh / trim.bounds.h
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            className="tbd-logo"
            src={src}
            alt=""
            style={{
                left: left + (width - vw) / 2 - trim.bounds.x * fullW,
                top: top + (height - vh) / 2 - trim.bounds.y * fullH,
                width: fullW,
                height: fullH,
                filter,
            }}
        />
    )
}
