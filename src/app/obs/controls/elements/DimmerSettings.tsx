'use client'

// Settings for `dimmer` (schema.ts's `dimmer` variant): a colour picker and an opacity slider
// that together edit the ONE stored value, `color` as `#rrggbbaa`. There is deliberately no
// separate opacity field in the config — the native picker only speaks `#rrggbb`, so this panel
// splits the stored string into the picker's 6 digits plus the slider's percentage
// (dimmerColor.ts) and joins them back into one string on every write. Like FrameSettings/
// TextSettings, this mutates the element itself via `onPatchElement` (ElementsPanel's `mutate` ->
// debounced `pushConfig`) — the config path already pushes to OBS, so no `useSettingWrite` here
// (that hook is for settings that live on the BACKEND, not inside LayoutConfig).

import type { Element } from '@/app/obs/layout/schema'
import { joinDimmerColor, splitDimmerColor } from '@/app/obs/layout/elements/dimmer/dimmerColor'
import type { PatchElement } from './ElementBlock'
import { ColorField } from './TickerSettings'

type Props = {
    elementKey: string
    element: Element
    onPatchElement: PatchElement
}

export default function DimmerSettings({ elementKey, element, onPatchElement }: Props) {
    if (element.kind !== 'dimmer') return null

    const { rgb, alphaPct } = splitDimmerColor(element.color)

    // Each control re-joins its own new value with the OTHER control's current value — the
    // picker never touches the alpha, the slider never touches the rgb.
    function setRgb(next: string) {
        onPatchElement(elementKey, { color: joinDimmerColor(next, alphaPct) })
    }

    function setAlphaPct(next: number) {
        onPatchElement(elementKey, { color: joinDimmerColor(rgb, next) })
    }

    return (
        <div className="d-flex flex-column gap-2">
            <div>
                <label className="form-label mb-0 small">Color</label>
                {/* `key={rgb}` remounts the uncontrolled picker whenever the stored colour changes
                    from elsewhere (another session, an undo) — see ColorField's own comment. */}
                <ColorField key={rgb} value={rgb} onCommit={setRgb} />
            </div>
            <div>
                <label className="form-label mb-0 small">Opacity ({alphaPct}%)</label>
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    className="form-range"
                    value={alphaPct}
                    onChange={(e) => setAlphaPct(parseInt(e.target.value, 10) || 0)}
                />
            </div>
        </div>
    )
}
