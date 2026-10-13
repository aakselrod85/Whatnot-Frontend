'use client'

// Settings for the `frame` element (obs-layout-plan.md §1.7, rewritten for §2.5, 'rips' style in
// §2.5's rips subsection): a style select, four per-side widths (Top/Right/Bottom/Left, px), the
// thickness of the gradient frame (default style only), plus the existing above/below-content
// toggle. The image URL field is gone — the frame is code-drawn or masked art now (see
// ../../layout/elements/frame/).
//
// The style select (schema.ts `FRAME_STYLES`, same control as ResultsSettings.tsx's) picks the
// skin. The four per-side widths mean the same thing in both styles — how far the opaque surround
// reaches in from each screen edge — only the caption changes: the default style's "black fill"
// is the rips style's cut-out inset. Frame width is hidden for 'rips': that frame is the art's
// fixed 16px band (ripsAssets.ts `RIPS_FRAME_BAND`), deliberately not a setting.
//
// Frame width is deliberately NOT part of the per-stage machinery below: the frame is the
// channel's constant furniture and it is the black fill around it that stages move, so it is one
// number for all four sides and every stage.
//
// `borders` is the first element setting that varies BY STAGE (obs-layout-plan.md §2.5), so this
// mirrors ElementBlock.tsx's Box editor: while there is no override for the current stage, edits
// go to the shared `all` entry ("same on every stage" stays one edit); "Override for this stage"
// clones the current effective values into `borders[currentPhase]` so they can diverge; "Use
// shared values" removes that override again. Like FrameSettings's box counterpart, this mutates
// the element itself via `onPatchElement` (ElementsPanel's `mutate` -> debounced `pushConfig`,
// same 400ms debounce `onSetPlacement` uses for box fields) rather than a separate endpoint — no
// `useSettingWrite`, nothing here lives on the backend outside the layout config.

import type { Element, FrameStyle, Phase, PlacementKey, Sides } from '@/app/obs/layout/schema'
import { DEFAULT_FRAME_BORDERS, DEFAULT_FRAME_WIDTH } from '@/app/obs/layout/schema'
import type { PatchElement } from './ElementBlock'

type Props = {
    elementKey: string
    element: Element
    currentPhase: Phase
    onPatchElement: PatchElement
}

const FIELDS: Array<{ field: keyof Sides; label: string }> = [
    { field: 'top', label: 'Top' },
    { field: 'right', label: 'Right' },
    { field: 'bottom', label: 'Bottom' },
    { field: 'left', label: 'Left' },
]

export default function FrameSettings({ elementKey, element, currentPhase, onPatchElement }: Props) {
    if (element.kind !== 'frame') return null

    const style: FrameStyle = element.style ?? 'default'
    const isRips = style === 'rips'

    const bordersMap = element.borders ?? {}
    const overrideSides = bordersMap[currentPhase]
    const sharedSides = bordersMap.all ?? DEFAULT_FRAME_BORDERS
    const effective = overrideSides ?? sharedSides
    const hasOverride = !!overrideSides

    const frameWidth = element.frameWidth ?? DEFAULT_FRAME_WIDTH

    const z = element.z ?? 0
    const above = z >= 0

    function setStyle(next: FrameStyle) {
        onPatchElement(elementKey, { style: next })
    }

    function setField(field: keyof Sides, value: number) {
        const targetKey: PlacementKey = hasOverride ? currentPhase : 'all'
        const base = hasOverride ? (overrideSides as Sides) : sharedSides
        const nextSides: Sides = { ...base, [field]: value }
        onPatchElement(elementKey, { borders: { ...bordersMap, [targetKey]: nextSides } })
    }

    function overrideForStage() {
        onPatchElement(elementKey, { borders: { ...bordersMap, [currentPhase]: { ...effective } } })
    }

    function useSharedValues() {
        const rest = { ...bordersMap }
        delete rest[currentPhase]
        onPatchElement(elementKey, { borders: rest })
    }

    function setFrameWidth(value: number) {
        onPatchElement(elementKey, { frameWidth: value })
    }

    function setAbove(nextAbove: boolean) {
        onPatchElement(elementKey, { z: nextAbove ? 10 : -10 })
    }

    return (
        <div>
            <div className="mb-2">
                <label className="form-label mb-0 small">Style</label>
                <select
                    className="form-select form-select-sm"
                    style={{ width: '120px' }}
                    value={style}
                    onChange={(e) => setStyle(e.target.value as FrameStyle)}
                >
                    <option value="default">Default</option>
                    <option value="rips">Rips</option>
                </select>
            </div>
            <div className="small text-muted mb-1">
                {isRips ? 'Cut-out inset from each edge (px)' : 'Black fill from each edge (px)'}
            </div>
            <div className="d-flex gap-3 flex-wrap mb-2">
                {FIELDS.map(({ field, label }) => (
                    <div className="mb-2" key={field}>
                        <label className="form-label mb-0 small">{label}</label>
                        <input
                            type="number"
                            min={0}
                            className="form-control form-control-sm"
                            style={{ width: '90px' }}
                            value={effective[field]}
                            onChange={(e) => setField(field, Math.max(0, parseInt(e.target.value, 10) || 0))}
                        />
                    </div>
                ))}
            </div>
            {hasOverride ? (
                <button type="button" className="btn btn-sm btn-link p-0 mb-2" onClick={useSharedValues}>
                    Use shared values
                </button>
            ) : (
                <button type="button" className="btn btn-sm btn-link p-0 mb-2" onClick={overrideForStage}>
                    Override for this stage
                </button>
            )}
            {!isRips && (
                <div className="mb-2">
                    <label className="form-label mb-0 small">Frame width (px)</label>
                    <input
                        type="number"
                        min={0}
                        className="form-control form-control-sm"
                        style={{ width: '90px' }}
                        value={frameWidth}
                        onChange={(e) => setFrameWidth(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    />
                    <div className="form-text mt-0">Same on every side and every stage.</div>
                </div>
            )}
            <div className="btn-group btn-group-sm d-block" role="group">
                <button
                    type="button"
                    className={`btn ${above ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setAbove(true)}
                >
                    Above content
                </button>
                <button
                    type="button"
                    className={`btn ${!above ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setAbove(false)}
                >
                    Below content
                </button>
            </div>
        </div>
    )
}
