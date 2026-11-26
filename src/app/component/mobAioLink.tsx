'use client'

import {FC} from "react";

// Base URL of mobwebapp (MOB AIO), where streams and breaks are now created.
export function mobAioUrl(path: string): string | null {
    const base = process.env.NEXT_PUBLIC_MOBWEBAPP_URL
    if (!base) return null
    return base.replace(/\/+$/, '') + path
}

export const MobAioLink: FC<{ path: string, label?: string }> = ({path, label = 'Create in MOB AIO'}) => {
    const url = mobAioUrl(path)
    if (!url) return null
    return <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-light btn-sm">{label}</a>
}
