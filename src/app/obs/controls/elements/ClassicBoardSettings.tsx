'use client'

// Settings for `board:classic`: whether special (non-team) spots get their own row under the team
// board or join the team pool (`specialSpotsOwnRow`, see ClassicBoard.tsx). Patches the element
// itself via `onPatchElement`, like RipsFlatBoardSettings; no backend endpoint involved.

import type {Element} from '@/app/obs/layout/schema'
import type {PatchElement} from './ElementBlock'

type Props = {
    elementKey: string
    element: Element
    onPatchElement: PatchElement
}

export default function ClassicBoardSettings({elementKey, element, onPatchElement}: Props) {
    if (element.kind !== 'board') return null
    const ownRow = element.specialSpotsOwnRow !== false
    const id = `classic-special-own-row-${elementKey}`
    return (
        <div className="form-check mb-2">
            <input
                type="checkbox"
                className="form-check-input"
                id={id}
                checked={ownRow}
                onChange={(e) => onPatchElement(elementKey, {specialSpotsOwnRow: e.target.checked})}
            />
            <label className="form-check-label small" htmlFor={id}>
                Special spots on own row
            </label>
        </div>
    )
}
