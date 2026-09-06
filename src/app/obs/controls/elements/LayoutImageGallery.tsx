'use client'

// Full-screen overlay listing every image previously uploaded for a channel via
// `/api/layout/image/upload` (obs-image-box-plan.md §6), so an operator can reuse one instead of
// uploading it again. Opened from ImageBoxSettings' Gallery button. Not the Bootstrap JS modal —
// a plain fixed-position backdrop + panel (`ctl-gallery-*` in controls.css), closable via the ×
// button, Escape, or a click on the backdrop itself (clicks inside the panel must not bubble to
// the backdrop's own click handler).

import {useEffect, useState} from 'react'
import type {LayoutImage} from '@/app/entity/entities'
import {getEndpoints, post} from '@/app/lib/backend'

type Props = {
    channelId: number
    currentUrl?: string
    onSelect: (img: LayoutImage) => void
    onClose: () => void
}

function formatSize(width: number, height: number, sizeBytes: number): string {
    const dims = width > 0 && height > 0 ? `${width} × ${height}` : 'size unknown'
    if (sizeBytes <= 0) return dims
    return `${dims} · ${Math.round(sizeBytes / 1024)} KB`
}

export default function LayoutImageGallery({channelId, currentUrl, onSelect, onClose}: Props) {
    const [images, setImages] = useState<LayoutImage[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    useEffect(() => {
        let cancelled = false
        setImages(null)
        setError(null)
        post(getEndpoints().layout_image_list, {channel_id: channelId}).then((result) => {
            if (cancelled) return
            if (result && Array.isArray(result.images)) {
                setImages(result.images as LayoutImage[])
            } else {
                setError('Failed to load images.')
            }
        })
        return () => {
            cancelled = true
        }
    }, [channelId])

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    async function deleteImage(img: LayoutImage) {
        if (!window.confirm(`Delete "${img.name}"? This cannot be undone.`)) return
        setDeletingId(img.id)
        try {
            const result = await post(getEndpoints().layout_image_delete, {id: img.id})
            if (result && result.success) {
                setImages((prev) => (prev ? prev.filter((i) => i.id !== img.id) : prev))
            } else {
                setError('Failed to delete image.')
            }
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div
            className="ctl-gallery-backdrop"
            onClick={onClose}
        >
            <div
                className="ctl-gallery-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Images"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="ctl-gallery-header">
                    <h5 className="mb-0">
                        Images
                        {images && <span className="ctl-gallery-count text-secondary"> ({images.length})</span>}
                    </h5>
                    <button type="button" className="ctl-gallery-close" aria-label="Close" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="ctl-gallery-body">
                    {images === null && !error && <div className="text-secondary">Loading…</div>}
                    {error && <div className="text-danger">{error}</div>}
                    {images !== null && images.length === 0 && !error && (
                        <div className="text-secondary">No images uploaded yet.</div>
                    )}
                    {images !== null && images.length > 0 && (
                        <div className="ctl-gallery-grid">
                            {images.map((img) => {
                                const isCurrent = img.url === currentUrl
                                return (
                                    <div
                                        key={img.id}
                                        className={`ctl-gallery-card${isCurrent ? ' ctl-gallery-card--current' : ''}`}
                                    >
                                        <div className="ctl-gallery-thumb">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={img.url} alt="" />
                                        </div>
                                        <div className="fw-bold text-break">{img.name}</div>
                                        <div className="small text-secondary">
                                            {formatSize(img.width, img.height, img.size_bytes)}
                                        </div>
                                        <div className="d-flex gap-2 mt-1">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-primary flex-grow-1"
                                                disabled={isCurrent}
                                                onClick={() => {
                                                    onSelect(img)
                                                    onClose()
                                                }}
                                            >
                                                {isCurrent ? 'Selected' : 'Select'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                disabled={deletingId === img.id}
                                                onClick={() => deleteImage(img)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
