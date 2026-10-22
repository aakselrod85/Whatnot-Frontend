// Pure-TypeScript schema for the OBS layout system.
// See obs-layout-plan.md §1.2 for the design this file implements, §1.7 for v2 (persistent
// elements via 'all', the frame element kind, `z` render order, and transition becoming a
// controls-only action instead of a phase), and §1.9 for v3 (scene events, `reactions`, the
// `Cue` discriminated union, and boxless elements — the standalone `effect` element kind it
// replaced is gone, see config.ts `migrateConfig`).

import type { SceneEventName } from './sceneEvents'

// A stage (formerly a fixed `selling | results | ripping` union) is now per-channel config data
// (obs-layout-plan.md follow-up: "configurable stages") — an operator can add and remove stages,
// so a phase is only ever validated against ONE config's `LayoutConfig.stages`, never a global
// constant. `id` is derived once at creation time (see the controls-side Stages tab) and is
// immutable afterwards: every element's `placements` key on it, so renaming would orphan them.
export type Stage = { id: string; label: string }

// Loosened from the old 3-literal union to a plain string: which strings are actually valid is now
// a property of one `LayoutConfig.stages` array, checked at runtime (config.ts's `isPhase`), not
// something the type system can express any more.
export type Phase = string

// A placement is keyed by a real phase, or 'all' — a persistent fallback used when no
// phase-specific placement exists. Resolution: placements[phase] ?? placements.all (see
// `resolveBox` in config.ts).
export type PlacementKey = Phase | 'all'

export type Box = { x: number; y: number; w: number; h: number }

// Per-side widths (px, >= 0) — used by the `frame` element's `borders` (obs-layout-plan.md §2.5).
// Kept separate from `Box`: a border has no x/y, only four independent thicknesses.
export type Sides = { top: number; right: number; bottom: number; left: number }

export type ElementKind =
    | 'board'
    | 'results'
    | 'resultsThin'
    | 'cards'
    | 'widget'
    | 'reserved'
    | 'ripbar'
    | 'frame'
    | 'animation'
    | 'text'
    | 'imageBox'
    | 'priceRanges'
    | 'priceSign'
    | 'ripsScene'
    | 'ticker'
    | 'cameraShelf'
    | 'obsToggle'
    | 'hitSequence'
    | 'dimmer'

// ---- hitSequence (hit-sequence-plan.md §3.1) ---------------------------------------------------
export type HitStepBase = {
    id: string // stable, generated once in the settings panel (random 8 chars)
    label?: string // settings/dev-panel display only
    startAt: 'prevEnd' | 'prevStart' // relative to the previous step; the first step ignores it
    delayMs: number // >= 0, added to that instant
}
export type VideoVariant = {
    id: string // stable, generated like a step id
    label?: string // "from left", "from right"
    src: string // URL under /public
    pivot?: { x: number; y: number; d: number } // ball centre + diameter IN THIS FILE'S PIXELS at the key frame; pivot mode only
    when: 'always' | 'cellLeftOfBall' | 'cellRightOfBall' // eligibility per run
}
export type VideoPlacement =
    | { mode: 'screen' } // stretched to the 1080x1920 canvas
    | {
          mode: 'pivot'
          anchor: 'ball' | 'cell' // which board anchor the pivot lands on
          match: 'size' | 'none' // 'size': scale so pivot.d == anchor diameter x sizeFactor
          sizeFactor: number // default 1; 'size' only
          scale: number // default 1; 'none' only (absolute video scale)
          offset: { dx: number; dy: number } // canvas px, applied last
      }
export type HitStep =
    | (HitStepBase & {
          kind: 'video'
          variants: VideoVariant[] // >= 1; exactly one is chosen per run
          placement: VideoPlacement // shared by every variant
          durationMs?: number // override the file's natural length
          speed?: number // playback rate multiplier, default 1; applies to every variant of the step
      })
    | (HitStepBase & {
          kind: 'obs'
          // showPlay = show, let OBS autoplay (media source with 'Restart playback when source
          // becomes active'), wait for playback end, hide. holdMs/waitForEnd are ignored for it.
          action: 'show' | 'hide' | 'play' | 'showPlay'
          items: { scene: string; source: string }[] // source may contain `{team}`
          holdMs?: number // 'show' only: auto-hide after this long
          waitForEnd?: boolean // 'play' only: step lasts until playback ends
      })
    | (HitStepBase & { kind: 'reveal' }) // flips the hit cell to sold (reveal-sold cue)
    | (HitStepBase & { kind: 'ball'; action: 'hide' | 'show' }) // the board's ball art; duration 0
    | (HitStepBase & { kind: 'wait'; durationMs: number })

export const HIT_STEP_KINDS = ['video', 'obs', 'reveal', 'ball', 'wait'] as const

export const BOARD_VARIANTS = ['flat', 'classic', 'cobra', 'cobra_flat', 'rips_flat', 'sport_style'] as const
export type BoardVariant = (typeof BOARD_VARIANTS)[number]

// `count` split into `boxesLeft`/`chasersLeft` (obs-layout-plan.md §2.7) — mirrors upstream commit
// e31e2aa splitting the old single `/channel/[id]/widget/count` page into two, so each cell can be
// placed and positioned independently. See registry.ts `makeElement`/config.ts `migrateConfig` for
// the stored-config migration this required.
export const WIDGET_IDS = ['pick2', 'stashorpass', 'name', 'boxesPerBreak', 'boxesLeft', 'chasersLeft'] as const
export type WidgetId = (typeof WIDGET_IDS)[number]

// `ticker` (obs-ticker-plan.md §3): one FIXED slot per WidgetId — the operator switches each on/off
// and recolours it; order is always the canonical WIDGET_IDS order, never a free list. `label`
// overrides the default label text ("Pick 2", …, see TickerElement.tsx's DEFAULT_TICKER_LABELS);
// empty/undefined = default. Colours are `#rrggbb` (validated by config.ts's ticker validator);
// undefined = the component's own DEFAULT_LABEL_COLOR/DEFAULT_VALUE_COLOR.
export type TickerSlot = {
    enabled: boolean
    label?: string // max 40 chars
    labelColor?: string // CSS hex '#rrggbb', default '#9fd6ff'
    valueColor?: string // CSS hex '#rrggbb', default '#ffffff'
    // chasersLeft ONLY (config.ts rejects it on any other slot): colour of the "/" in a
    // "<count> / <pct>%" value. Undefined = the slot's value colour.
    slashColor?: string // CSS hex '#rrggbb'
    // chasersLeft ONLY: the "Show %" line. The percentage is shown only while it is at or above
    // this value (and the channel's show_percentage toggle is on); below it, only the card count.
    // Integer 0..100. Undefined = the component's DEFAULT_SHOW_PCT_MIN.
    showPctMin?: number
}
export type TickerDirection = 'left' | 'right'
export const TICKER_DIRECTIONS = ['left', 'right'] as const
// The band behind the text: 'stadium' (ticker/band.ts — a stadium ribbon screen drawn in code,
// once, at the exact size) or 'image' (the original curve.png). The ticker's font: 'orbitron'
// (solid) or 'handjet' (the original dot-matrix face — ~7x more work to redraw each frame and hard
// for the stream encoder).
export type TickerBand = 'stadium' | 'image'
export const TICKER_BANDS = ['stadium', 'image'] as const
export type TickerFont = 'orbitron' | 'handjet'
export const TICKER_FONTS = ['orbitron', 'handjet'] as const

// Seeded by `makeElement` (registry.ts) for a freshly-placed ticker — all six widgets on, no label/
// colour overrides. Cloned per element (never shared by reference) in `makeElement`'s `ticker` case.
export const DEFAULT_TICKER_SLOTS: Record<WidgetId, TickerSlot> = Object.fromEntries(
    WIDGET_IDS.map((id) => [id, { enabled: true }])
) as Record<WidgetId, TickerSlot>

export const FRAME_VARIANTS = ['static'] as const
export type FrameVariant = (typeof FRAME_VARIANTS)[number]

// Skin of the `frame` element — same reasoning as `RESULTS_STYLES` below: a field rather than a
// registry variant because a style only changes how the frame is painted, not its settings,
// singleton group or stage behaviour, and an absent field keeps every stored config on the
// code-drawn look. 'default' is the code-drawn black fill + drifting gradient; 'rips' paints the
// marble art in public/images/static/rips with a cut-out and a fixed 16px gold 9-slice frame
// (see elements/frame/FrameElement.tsx).
export const FRAME_STYLES = ['default', 'rips'] as const
export type FrameStyle = (typeof FRAME_STYLES)[number]

// obs-layout-plan.md §1.9's wrap-around stash-or-pass, plus `stashOrPassWrapTl` — the same
// animation rebuilt on a local label timeline (stash-or-pass-timeline-plan.md). The two are
// deliberately both available so they can be placed together and compared; whichever wins, the
// other is deleted and this union goes back to one member.
export const ANIMATION_IDS = [
    'stashOrPassWrap',
    'stashOrPassWrapTl',
    'stashOrPassWrapRing',
    'stashOrPassSportStyle',
] as const
export type AnimationId = (typeof ANIMATION_IDS)[number]

// How an `imageBox`'s uploaded image fits its box — maps 1:1 onto CSS `object-fit`: contain =
// `contain` (whole image visible, letterboxed), cover = `cover` (box filled, overflow cropped),
// stretch = `fill` (ignores aspect ratio). See elements/image-box/ImageBoxElement.tsx.
export const IMAGE_FITS = ['contain', 'cover', 'stretch'] as const
export type ImageFit = (typeof IMAGE_FITS)[number]

// `imageBox.position` — a percentage pair (each 0..100) mapped straight onto CSS
// `object-position` (obs-image-box-plan.md §5): 50/50 = centred (the default), 0/0 = the image's
// top-left corner pinned to the box's top-left, 100/100 = its bottom-right corner pinned to the
// box's bottom-right. Meaningless for `fit: 'stretch'` (a stretched image has no slack to pan).
export const DEFAULT_IMAGE_POSITION = { x: 50, y: 50 }

// Sort mode shared by `results` (§2.3, always 'alphabetical') and `resultsThin` (§2.4, operator
// choice) — see elements/results/orderResults.ts.
export const RESULTS_SORTS = ['alphabetical', 'customer'] as const
export type ResultsSort = (typeof RESULTS_SORTS)[number]

// Skin of the `results` element. A field on the element rather than a registry variant (the way
// boards do it) because a style changes only how the grid is painted — data, settings and the
// singleton group are identical — and an absent field keeps every pre-existing config on the
// original look. 'rips' paints the grid over the art in public/images/results/rips (see
// elements/results/ripsStyle.ts).
export const RESULTS_STYLES = ['default', 'rips'] as const
export type ResultsStyle = (typeof RESULTS_STYLES)[number]

// Skin of the `resultsThin` element — same reasoning as `RESULTS_STYLES`. Its own constant rather
// than a reuse of that one so the two elements' style lists can diverge. 'rips' paints the board
// and its cells over the art in public/images/results_mini/rips (see
// elements/results-thin/ripsStyle.ts).
export const RESULTS_THIN_STYLES = ['default', 'rips'] as const
export type ResultsThinStyle = (typeof RESULTS_THIN_STYLES)[number]

// Per-element opt-out of a native reaction its registry entry declares in `reactsTo` (registry.ts)
// — default (key absent, or `undefined`) is "on"; only `false` turns it off. See config.ts
// `effectiveReactions()`.
export type Reactions = Partial<Record<SceneEventName, boolean>>

// Which element kinds may be mirrored — the SOURCE side of `mirrorOf` (obs-layout-text-mirror-plan.md).
// Single source of truth: the controls page shows the Mirror button only for these kinds, and
// config.ts's validator refuses a `mirrorOf` whose source is any other kind. Add a kind here to
// make it mirrorable; nothing else needs to change (`resolveEffective` is kind-agnostic).
export const MIRRORABLE_KINDS = ['text'] as const satisfies readonly ElementKind[]
export type MirrorableKind = (typeof MIRRORABLE_KINDS)[number]

// Present on every element kind so a mirror can be of any kind the allowlist admits. A mirror
// is the same element again at another X/Y: it inherits everything but its placements' x/y and
// stores nothing else of its own. Resolving the inheritance is centralised in exactly one place,
// config.ts's `resolveEffective` — every renderer/editor reads a merged element through that,
// never through this field directly. Code elsewhere may read `mirrorOf` only for POLICY ("is
// this a mirror" / "who mirrors this"), never to itself merge properties.
export type MirrorFields = { mirrorOf?: string }

export type Element = (
    // `sport_style` (sport-style-board-plan.md §2, R1 fix 5, R3) carries extra fields, read only by
    // that variant and left `undefined` by every other board: `cols` (cells per row,
    // operator-set), `turf`/`patch` (opaque JSON blobs the operator pastes from the
    // /obs/setup/sport_style/* playgrounds' own Export output — `unknown` on purpose, never
    // validated here, see SportStyleBoard.tsx's deep-merge over its own defaults), `margin` (px,
    // transparent band between the element's edge and the painted field on every side; default
    // 0). The field's own edge gap — field edge to the outer strips — is NOT here: it is the
    // `edgeGap` key of the `turf` blob, the same knob the board playground exports.
    // `edgeMode`/`sortMode` (R3.4) are chosen from two selects in SportStyleBoardSettings, same
    // config path (`onPatchElement`), no validation — the component narrows with defaults exactly
    // like `cols`. `edgeMode: 'tiered'` draws a per-tier medal edge (tierSkins.ts) instead of
    // today's auto-palette wear; `sortMode: 'centered'` deals cells `board:cobra_flat`'s way
    // (value-centred, sold pushed to the edges) instead of alphabetically.
    // `tileSet` is read only by `rips_flat` (README "Rips board marble tiles"): which front-face art
    // the cells show, chosen from RipsFlatBoardSettings; unset = DEFAULT_RIPS_TILE_SET.
    // `backStyle` is its back-face counterpart, independent of `tileSet` (any front with either
    // back): 'tiles' is the grey sub-tile skin, 'flip_art' the shared painting behind a per-group
    // gold frame (RipsFlatCell.tsx). Same select panel; unset = DEFAULT_RIPS_BACK_STYLE ('tiles').
    | {
          kind: 'board'
          variant: BoardVariant
          cols?: number
          turf?: unknown
          patch?: unknown
          margin?: number
          edgeMode?: 'plain' | 'tiered'
          sortMode?: 'alphabetical' | 'centered'
          tileSet?: 'veined' | 'clean' | 'icons' | 'marble_auto'
          backStyle?: 'tiles' | 'flip_art'
          // board:sport_style only (every other variant ignores all three; hit-sequence-plan.md §2.1):
          // the ball slot — a `hole.cols x hole.rows` block of grid cells at the TOP CENTRE that no
          // team is dealt into; the ball art renders there and is published as anchor `ball`.
          hole?: { cols: number; rows: number }
          // Length of the ball's long axis as a fraction of the hole's DIAGONAL; default 0.95. The
          // art is rotated -45deg to lie along that diagonal.
          ballScale?: number
          // 'gated': a cell that sells AFTER the mount baseline keeps rendering unsold until a
          // `reveal-sold` cue names its event id, or GATE_TIMEOUT_MS passes. Default 'immediate'.
          soldReveal?: 'immediate' | 'gated'
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    | { kind: 'widget'; widget: WidgetId; placements: Partial<Record<PlacementKey, Box>>; z?: number; reactions?: Reactions }
    // `cards` carries its own main-area/threshold settings (cards-main-area-plan.md §1) — split out
    // of the old shared `cards | ripbar | reserved` variant it used to be lumped into (see that
    // variant just below for the two kinds it still covers). `mainAreaHeightPct` is the top share
    // of the box nothing covers, in % of box height (1..100), default DEFAULT_MAIN_AREA_HEIGHT_PCT
    // (CardsElement.tsx). `mainAreaMaxCards` is the on-screen card-count threshold at/under which
    // the board packs into that main area instead of the full box, default
    // DEFAULT_MAIN_AREA_MAX_CARDS (0 = never use the main area, today's behaviour). Both optional —
    // unset means "reproduce today's behaviour" (full box, always), so an existing config needs no
    // migration.
    | {
          kind: 'cards'
          mainAreaHeightPct?: number
          mainAreaMaxCards?: number
          // cards-auto-show-pending-plan.md §1: list-mode only (a carousel has no zoom to
          // acknowledge with, see CardsElement.tsx's `autoShow` derivation) — when on, a pending
          // card (§2/§3 above) is zoomed on stream by itself, one at a time, for up to 10s each,
          // instead of waiting for the operator to hover it. Optional, default false — unset
          // reproduces today's behaviour (operator-driven only).
          autoShowPending?: boolean
          // List mode: draw the tier frames (and compose v1 photos inside them). Optional, default
          // true; false = bare cards, board packs as if no card had a tier.
          showFrames?: boolean
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // `ripbar`/`reserved`: plain boxed elements with no fields of their own beyond `placements`
    // (see config.ts's `plainKind` factory).
    | { kind: 'ripbar' | 'reserved'; placements: Partial<Record<PlacementKey, Box>>; z?: number; reactions?: Reactions }
    // `results` carries its own column count (obs-layout-plan.md §2.3 + the 1f refactor); the
    // grid and the ordering interleave both read it, so they can never disagree.
    | {
          kind: 'results'
          columns?: number
          sort?: ResultsSort
          style?: ResultsStyle
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // Compact/configurable sibling of `results` (obs-layout-plan.md §2.4) — its own registry id
    // (`resultsThin`) rather than a `results` variant, so a config may place both at once (e.g.
    // the full board during `results` plus a thin list next to the board during `selling`/
    // `ripping`). Reuses `elements/results/orderResults.ts` with these as its `{columns, sort}`.
    // Same field set as `results`: row, icon and text sizes all derive from `box` (box.h divided
    // by the row count, see ThinResults.tsx), so there is nothing else to configure. Older stored
    // configs may still carry `textSize`/`iconSize` from before that change; unknown keys are
    // ignored by validateConfig (config.ts), so they load fine and are simply not read.
    | {
          kind: 'resultsThin'
          columns?: number
          sort?: ResultsSort
          style?: ResultsThinStyle
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // FE-generated frame (obs-layout-plan.md §2.5 — replaces the old full-canvas `<img>`).
    // Settings, stacked from the canvas edge inwards:
    //   - `borders` — how far the opaque surround reaches in from each screen edge, per side (the
    //     plain BLACK fill in the default style; the edge of the cut-out in the marble in 'rips').
    //     Per-stage, resolved exactly like `placements` — `borders[phase] ?? borders.all`, see
    //     `resolveBorders` in config.ts — so "same on every stage" is one edit (`all`) and a stage
    //     can still override.
    //   - `frameWidth` — the thickness of the gradient frame drawn just inside that black fill.
    //     One number for all four sides, and NOT per-stage: the frame is the channel's constant
    //     furniture, it is the black fill around it that stages move (see FrameSettings.tsx).
    //     Default style only — the 'rips' gold frame is a fixed 16px band (its art is 16px).
    //   - `style` — which skin (`FRAME_STYLES`); absent = 'default', so configs stored before the
    //     field existed render exactly as they always have.
    // The registry id/variant stays `static` even though the frame is code-drawn (default) or a
    // masked art layer (rips) rather than a stretched image (see registry.ts's comment on that).
    | {
          kind: 'frame'
          variant: FrameVariant
          style?: FrameStyle
          borders?: Partial<Record<PlacementKey, Sides>>
          frameWidth?: number
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // Boxless (obs-layout-plan.md §1.9, entrance/orbit rewrite in §2.2): `target` names another
    // element's key to glue to via useResolvedBox() — undefined means "the first board in the
    // config" (resolved by the component itself, not stored here, so re-ordering boards never
    // needs a config rewrite). `pad` is the band's offset from the target's box edge (registry
    // default 24). `bandThickness` is the marquee band's own thickness (registry default 56).
    // `speed` is the marquee scroll speed in canvas px/s (registry default 220). `holdMs` is the
    // entrance's "hold" beat duration (spec §2/§7.1 — the single most likely timing to need
    // retuning without a redeploy; registry default 220). There is no `durationMs`/auto-dismiss:
    // the orbit runs until the operator toggles `OverlayState.active.stash_or_pass` off.
    | {
          kind: 'animation'
          animation: AnimationId
          target?: string
          // board-anchors-plan.md §3: which of `target`'s registry-declared `anchors`
          // (registry.ts's `RegistryEntry.anchors`) to glue to instead of its plain resolved box —
          // undefined means "the whole box" (useTargetShape, anchors.tsx). Deliberately NOT
          // cross-checked against the target's current registry entry here or in config.ts: a board
          // variant swap must not invalidate the whole config. A stale/unpublished name simply falls
          // back to the box at render time, and the settings panel flags it (see
          // StashOrPassWrapSettings.tsx's "Attach to" select).
          targetAnchor?: string
          pad?: number
          bandThickness?: number // deprecated: bands now size themselves to their text
          laneFontSize?: number
          speed?: number
          holdMs?: number
          /**
           * Playback rate for `stashOrPassWrapTl`'s timeline. 1 = the choreography's real spec
           * timings; lower is slower. Defaults to DEFAULT_RATE (0.2), which reproduces the pace of
           * the `stashOrPassWrap` element this one is being compared against — that one bakes in a
           * committed `TIME_SCALE = 5`, so a rate-1 rebuild runs five times faster than the thing
           * it replaces. Unused by `stashOrPassWrap`.
           */
          rate?: number
          /**
           * `animation:stashOrPassSportStyle` only (stash-or-pass-quarters-plan.md Revision 2,
           * R1). The lane is a filled ring shape, not a stroked centreline: `cornerWidth` is the
           * OUTER corner radius in canvas px (default: the element's own lane thickness), and
           * `cornerRoundness` (0..1) sets the INNER corner radius as a fraction of `cornerWidth`
           * (default 0.5). Both are clamped at render to fit the rect they round. Unused by every
           * other animation id.
           */
          cornerWidth?: number
          cornerRoundness?: number
          /** `animation:stashOrPassSportStyle` only: thickness (canvas px) of the static idle ring, 0 = off (default 10). */
          idleThickness?: number
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // Free-form operator text (obs-layout-plan.md §2.12) — a custom string and a font size,
    // centred on both axes in its box. `fontSize` is absolute canvas px (see TextElement.tsx's
    // comment for why: unlike the circle widgets' fixed-content readouts, this holds arbitrary
    // text the operator sizes by eye, so it is deliberately NOT derived from `box`). `text` is
    // capped at MAX_TEXT_LENGTH (below) by config.ts's validator.
    | {
          kind: 'text'
          text?: string
          fontSize?: number
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // An operator-uploaded picture rendered inside the layout itself (obs-image-box-plan.md): the
    // controls page uploads a file to `/api/layout/image/upload`, the backend stores it on
    // DigitalOcean Spaces and returns a public URL, and that URL is stored here. The layout page
    // renders an `<img>` at the element's box/layer like any other element — no OBS involvement.
    // `fit` picks how the image fills its box (default 'contain', see IMAGE_FITS above).
    | {
          kind: 'imageBox'
          url?: string
          // Display label shown in the settings panel (element's own name + `W × H px`), copied
          // from the gallery row or the upload form's Name field (obs-image-box-plan.md §6). Never
          // read by the layout page itself.
          name?: string
          fit?: ImageFit
          // Which part of the image shows when `fit` crops or letterboxes it (obs-image-box-plan.md
          // §5) — a percentage pair, default DEFAULT_IMAGE_POSITION (centred). Ignored by `stretch`.
          position?: { x: number; y: number }
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // Series-scoped raw-text readout of a `price_ranges` series' contents
    // (series-price-ranges-plan.md §4) — "how many cards in each price band". The ranges
    // themselves are series data (SeriesPriceRange, entities.ts), edited on the controls page's
    // PriceRangesSettings and read through useLayoutData's `seriesPriceRanges` source, not stored
    // here. It has two per-element settings, stored in LayoutConfig like `text.fontSize`:
    // `labelFontSize` (the range label) and `badgeFontSize` (the count badge), both absolute
    // canvas px.
    | {
          kind: 'priceRanges'
          labelFontSize?: number
          badgeFontSize?: number
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // A second readout of the same `price_ranges` series as `priceRanges` above, drawn as a stone
    // pedestal with one stone tablo per range stacked upward (obs-price-sign-plan.md v2,
    // elements/price-sign/PriceSignElement.tsx). Not in MIRRORABLE_KINDS.
    | {
          kind: 'priceSign'
          fontScale?: number // multiplier on the derived text size, > 0, default 1
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // Sunset-mountain layered scene (rips-scene-plan.md §5). `recipe` is an opaque blob exported by
    // /obs/setup/rips_scene and merged over defaults by the component (rips_scene/recipe.ts's
    // `mergeRecipe`) — deliberately not validated, same as `board:sport_style`'s `turf`/`patch`. Not
    // in MIRRORABLE_KINDS.
    | {
          kind: 'ripsScene'
          recipe?: unknown
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // Curved LED-band text ticker (obs-ticker-plan.md) — a static `curve.png` texture with one line
    // of "label: value" parts compiled from the six circle widgets' data, looped forever along the
    // band's centreline. The circle widgets themselves are not placed; this only reuses their data
    // sources and settings panels (elements/ticker/TickerElement.tsx,
    // controls/elements/TickerSettings.tsx). `slots` is REQUIRED (not optional-with-a-component-default) — a
    // list of six independently-toggled entries has no single sane "leave it unset" default; a
    // freshly-added ticker is seeded with `DEFAULT_TICKER_SLOTS` (all six enabled, no overrides).
    // Every other field is optional — component defaults (TickerElement.tsx's DEFAULT_* constants)
    // apply when unset, same convention as `priceRanges`'s labelFontSize/badgeFontSize Not in
    // MIRRORABLE_KINDS (§3: "a moving ticker mirrored elsewhere would drift out of phase").
    | {
          kind: 'ticker'
          slots: Record<WidgetId, TickerSlot>
          separator?: string // default '   •   '; capped at MAX_TEXT_LENGTH
          fontSize?: number // canvas px, default 48
          speed?: number // canvas px/s, 0..600, default 90; 0 = static
          direction?: TickerDirection // default 'left' (text travels right→left)
          // Anti-aliasing for the moving dot-matrix text: Gaussian blur radius in canvas px, 0..3,
          // default 0.6; 0 = off. Averages each dot's edge over neighbouring pixels so sub-pixel
          // motion stops making dots and the gaps between them flicker.
          soften?: number
          band?: TickerBand // default 'stadium'
          font?: TickerFont // default 'orbitron'
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // The "Current Break" cabinet with a live-camera window (obs-camera-shelf-plan.md, including
    // its 2026-09-24 "Revisions" section) — a FIXED-SIZE cabinet drawing (header band, side posts,
    // lit ledge) scaled uniformly off the box width, whose middle is a transparent window; the OBS
    // camera source sits UNDER the layout browser source and shows through it, so real boxes
    // appear to stand on the shelf. Reads no break/stream data (NEEDS_BY_ID is `[]`) — everything
    // here is either static art or an OBS binding. Not in MIRRORABLE_KINDS: a mirror would show a
    // second hole with no second camera behind it.
    | {
          kind: 'cameraShelf'
          label?: string // header text; default DEFAULT_SHELF_LABEL ('CURRENT BREAK'), see the component
          labelFontSize?: number // canvas px at scale 1 (i.e. for a 1080-wide box); default 40
          // Label's top edge, in shelf.png pixels down from the art's top edge (scaled by `s` like
          // every other rect); default SHELF_RECTS.label.y (assets.ts). Operator-tunable because
          // the blank plate's position is hand-measured off the art, not printed by the build script.
          labelOffsetY?: number
          glare?: boolean // draw shelf_glare.png over the window; default true
          glareOpacity?: number // 0..1; default 0.6
          // CSS `#rrggbb` the gap fills (below) are painted in; default DEFAULT_FILL_COLOR (the
          // component), sampled off the art's own dark blue-grey inner faces so the fill reads as
          // more cabinet rather than as a black square sitting inside it.
          fillColor?: string
          // 0..100. 0 = the gap fills are the solid `fillColor` slab (default). Above 0 they paint no
          // colour at all: only a `backdrop-filter` blur of that strength, so whatever LAYOUT
          // element sits behind the shelf shows through the strips softened but untinted. (Only
          // page content is behind the strips — the OBS camera is a separate source below the
          // whole page and never reaches the gap area by construction.)
          fillBlur?: number
          // Vertical flip: the frame and glare art are mirrored top-to-bottom so the header plate
          // sits UNDER the window (a shelf the boxes hang below, or a second shelf stacked upside
          // down against the first). The label stays upright and its Y offset is then measured
          // from the art's BOTTOM edge instead of its top. Default false.
          flip?: boolean
          // Camera source's own aspect ratio (w/h), read once from OBS via the settings panel's
          // "Read from OBS" button (or typed by hand). The art's window has its own fixed aspect
          // (SHELF_RECTS.window), so when the camera is a different shape, `cameraGaps` fills the
          // difference with left/right or top/bottom strips of `fillColor` instead of stretching
          // the camera picture (which the layout page cannot do to begin with — it never touches
          // the camera pixels, only paints around them). Unset = no gap fill, the raw window shows.
          cameraAspect?: number
          // OBS enable/disable moved to the `obsToggle` element (obs-visibility-toggle-plan.md §11).
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // Boxless, invisible element that carries an operator-defined list of OBS scene item (source)
    // names (obs-visibility-toggle-plan.md) — a generalisation of `cameraShelf`'s old two fixed
    // `obsSource`/`obsBackingSource` fields into a dynamic list, with no art and no visual output.
    // Through the stage-hooks mechanism (stageHooks.ts, elements/obs-toggle/mount.ts) it enables
    // every listed source when a stage containing this element is entered, and disables them all
    // when such a stage is left for one that does not contain it. Not in MIRRORABLE_KINDS — a
    // mirror would just duplicate the same toggle with no visual meaning.
    | {
          kind: 'obsToggle'
          // OBS scene item (source) names this element enables when a stage containing it is
          // entered and disables when such a stage is left for one that lacks it — via the stage-
          // hooks mechanism (stageHooks.ts, elements/obs-toggle/mount.ts). Empty/absent = no-op.
          // Order is display order only; the toggles run concurrently.
          sources?: string[]
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // Boxless, invisible except while a sequence plays (hit-sequence-plan.md): on a sale observed on
    // the layout it plays an ordered step list (videos, OBS scene-item actions, reveal). Not in
    // MIRRORABLE_KINDS.
    | {
          kind: 'hitSequence'
          target?: string // board element key; default first board:sport_style in config
          steps?: HitStep[] // empty/absent = detect hits, reveal them immediately, play nothing
          queueCap?: number // default 3
          minTier?: 'regular' | 'mid' | 'good' | 'best' // lowest tier that plays; default 'mid', 'regular' = every hit
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
    // Boxless full-canvas tint (elements/dimmer/DimmerElement.tsx): ONE semi-transparent rectangle
    // over the whole 1080x1920 canvas, meant to sit at the bottom of the layout so it darkens
    // whatever OBS shows under the browser source (the camera) while every element above it stays
    // at full brightness. Which stages it is on is just its `placements` (the box inside is never
    // read — the layout mounts boxless elements full-canvas), and where it sits in the stack is the
    // ordinary `z`. `color` is the one setting: an `#rrggbbaa` hex with the alpha baked in rather
    // than a separate opacity field, so the config carries exactly one value and the settings
    // panel's picker + slider only ever compose that one string. A 6-digit `#rrggbb` is accepted
    // too (= fully opaque); absent = DEFAULT_DIMMER_COLOR. Not in MIRRORABLE_KINDS — a copy of a
    // full-canvas rectangle at another x/y is meaningless.
    | {
          kind: 'dimmer'
          color?: string
          placements: Partial<Record<PlacementKey, Box>>
          z?: number
          reactions?: Reactions
      }
) & MirrorFields

export type LayoutConfig = {
    version: 1
    canvas: { w: 1080; h: 1920 }
    // Ordered — this order IS the prev/dropdown/next cycle on the controls page and the Stream
    // Deck's next_stage/prev_stage wrap. Always non-empty and always contains the three built-ins
    // (see `BUILT_IN_STAGES` below) — enforced by config.ts's `validateConfig`.
    stages: Stage[]
    elements: Record<string, Element> // key = stable id, e.g. 'board', 'camera', 'pick2'
    obsBindings: {
        transitionSource?: string
        cameraItem?: string
        // Transition is a controls-only action (the layout page never learns about it) — see
        // obs-layout-plan.md §1.7 "Transition as a controls action".
        useTransition?: boolean
        // The layout page's own obs-websocket URL (hit-sequence-plan.md §4.6); default
        // ws://localhost:4455. Only dialled when the config contains a `hitSequence` element.
        layoutObsUrl?: string
    }
}

// A named, per-channel snapshot of a LayoutConfig (obs-layout-presets-plan.md). Wire shape as
// stored/returned by the backend, snake_case like every other entity consumed raw (`series_id`,
// `active_break_id`). `config` is deliberately typed `unknown`, not `LayoutConfig`: it is whatever
// blob was stored — possibly under an older schema version — and only becomes a trustworthy
// `LayoutConfig` by passing `migrateConfig` + `validateConfig` on load (see `applyPreset` below).
export type LayoutPreset = {
    id: number
    channel_id: number
    name: string
    config: unknown
    created_at: string
    updated_at: string
}

export type OverlayState = {
    phase: Phase
    phaseData?: Record<string, unknown> // discarded on phase change
    overrides?: Record<string, { visible?: boolean }>
    /**
     * Scene events that are currently LATCHED ON (obs-layout-plan.md §2.2). Most scene events are
     * momentary — the cue plays an animation and is over. A few (stash-or-pass) stay up until the
     * operator toggles them off, which can be minutes, so their on/off-ness is state rather than a
     * cue: a browser source that reloads mid-orbit reads this and resumes, while the cue that rode
     * alongside the toggle (and played the entrance) is long gone.
     */
    active?: Partial<Record<SceneEventName, boolean>>
}

// Discriminated cue union (obs-layout-plan.md §1.9), split into the two channels it can ride
// (see the DURABLE/TRANSIENT split below `BUS_EVENT_NAME`) so the type system — not just naming
// and comments — enforces which cue can go on which bus.

// Rides the DURABLE bus (BusPayload, BUS_EVENT_NAME below). Every emit is preceded by a backend
// state write that bumps `seq`, which is what lets a reloaded browser source catch up: state is
// re-read on mount, so a durable cue's effects survive a refresh even though the cue itself is
// long gone by then.
export type DurableCue =
    // `event` carries a semantic scene event (see sceneEvents.ts); `photos-changed` and `refetch`
    // are the pre-existing data-spine cues (useLayoutData.tsx), formalized here instead of the
    // previous open `{kind: string, ...}` shape.
    | { kind: 'event'; name: SceneEventName; params?: Record<string, unknown> }
    | { kind: 'photos-changed' }
    | { kind: 'refetch'; key: string }

// Rides the TRANSIENT bus (CuePayload, BUS_CUE_EVENT_NAME below). No backend write, no `seq` —
// meaningless a moment after it fires, so nothing here needs to (or could safely) survive a
// browser-source refresh.
export type TransientCue =
    // The operator hovering a card in the controls page's card grid; the `cards` element zooms
    // that card the same way a local hover does. `photoId: null` means "nothing highlighted".
    // Rides the TRANSIENT bus (BUS_CUE_EVENT_NAME below), never a BusPayload: it fires on mouse
    // movement, and the BusPayload path writes state to the backend and bumps `seq` on every emit.
    | { kind: 'highlight-photo'; photoId: number | null }
    // The board:sport_style settings panel's "Regenerate turf"/"Regenerate teams" buttons
    // (sport-style-board-plan.md R1 fix 6) — re-rolls one of the element's two module-level seeds
    // (turf render, or every team's edge wear) and re-renders. No backend write: like
    // `highlight-photo`, it means nothing a moment after it fires, so the TRANSIENT bus (never a
    // BusPayload) is the right channel.
    | { kind: 'sport-style-regenerate'; target: 'turf' | 'wear' }
    // hitSequence (hit-sequence-plan.md §3.1). The first two are emitted IN-PAGE by the hitSequence
    // element for the board; the last two rehearse / abort a sequence from the controls panel or
    // the layout dev panel.
    | { kind: 'reveal-sold'; eventId: number; boardKey?: string }
    | { kind: 'ball-visible'; visible: boolean; boardKey?: string }
    | { kind: 'hit-sequence-test'; elementKey: string; eventId: number }
    | { kind: 'hit-sequence-abort'; elementKey?: string }

export type Cue = DurableCue | TransientCue

export type BusPayload = {
    seq: number
    state: OverlayState
    config: LayoutConfig
    cue?: DurableCue
}

// The three stages every config is born with and can never fully lose — deleting one is refused
// by the Stages tab UI, and config.ts's `validateConfig` rejects a config missing any of them
// outright, since an ungoverned config would leave elements placed on a stage nothing can reach.
// They CAN be reordered — this array's order is not itself meaningful, it's a set of ids/labels.
export const BUILT_IN_STAGES: Stage[] = [
    { id: 'selling', label: 'Selling' },
    { id: 'results', label: 'Results' },
    { id: 'ripping', label: 'Ripping' },
]

// What `defaultConfig()` (config.ts) seeds `stages` with, and what `migrateConfig` backfills onto
// any config stored before `stages` existed. Same three, same order, as `BUILT_IN_STAGES` — kept
// as a separate constant (rather than every caller reusing BUILT_IN_STAGES directly) so the two
// concerns — "which stages can never be deleted" vs. "what a fresh config starts with" — can drift
// independently if a future change ever needs them to.
export const DEFAULT_STAGES: Stage[] = BUILT_IN_STAGES.map((s) => ({ ...s }))

export const CANVAS: { w: 1080; h: 1920 } = { w: 1080, h: 1920 }

// Fallback used by `resolveBorders` (config.ts) when a `frame` element has no `borders` at all,
// and by `makeElement` (registry.ts) as the default for a freshly-added frame. Lives here (not in
// config.ts or registry.ts) so both can import one literal without a circular dependency between
// those two files.
export const DEFAULT_FRAME_BORDERS: Sides = { top: 24, right: 24, bottom: 24, left: 24 }

// Fallback used by `resolveFrameWidth` (config.ts) when a `frame` element has no `frameWidth`, and
// by `makeElement` (registry.ts) for a freshly-added frame. 8px was the width of the fixed edge
// ornament this setting replaces, so a config stored before `frameWidth` existed keeps the same
// overall footprint it had: its `borders` become the black fill and the frame sits inside them.
export const DEFAULT_FRAME_WIDTH = 8

// Cap on `text` element's `text` field (obs-layout-plan.md §2.12: "Validate text as a string
// (capped)"). 500 was picked as generous for a few lines of operator copy while still being far
// short of anything that could bloat the config payload or overflow a box in a way `white-space:
// pre-wrap` can't just wrap around. Enforced by config.ts's validator and used as the controls
// textarea's `maxLength` (TextSettings.tsx) so the two never disagree.
export const MAX_TEXT_LENGTH = 500

// `dimmer.color` (see the variant's comment): black at 60% — `0x99` = 153/255 — dark enough that
// the camera reads as "dimmed" without going to a blackout. Seeded by `makeElement` (registry.ts)
// and the fallback the component/settings panel use for an absent or unparsable value. Lives here,
// like DEFAULT_FRAME_WIDTH, so config.ts and registry.ts share one literal without importing each
// other.
export const DEFAULT_DIMMER_COLOR = '#00000099'

// What `dimmer.color` may look like: `#rrggbb` or `#rrggbbaa`, either case. config.ts's validator
// rejects anything else; the element's own helpers (elements/dimmer/dimmerColor.ts) normalise a
// 6-digit value to fully opaque and anything unparsable to DEFAULT_DIMMER_COLOR at render time.
export const DIMMER_COLOR_RE = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i

export const BUS_EVENT_NAME = 'mob:trigger'
export const DEV_CHANNEL_NAME = 'mob:bus'

// ── Return path: layout -> controls ─────────────────────────────────────────────────────────
// The ONLY channel that flows this direction (obs-browser-event-bus.md §8). The `cards` element
// (pending-sold-cards-plan.md §2.3) publishes which photo ids are pending-removal so the controls
// page's CardsSettings (§3) can tint the matching cards. Plain BroadcastChannel, no obs-websocket
// involved: works because an OBS browser source and an OBS custom browser dock share one Chromium
// profile, so it does nothing in a plain Chrome tab controls page (accepted — the tint is missing
// there, nothing else breaks).
export const PENDING_CHANNEL_NAME = 'mob:pending'
// `autoShowingId` (cards-auto-show-pending-plan.md §4): which pending card, if any, is currently
// being auto-zoomed on stream (null = none) — lets the controls grid mark that one card "on
// stream" with a clear outline so the operator knows which one to hover to hold it past its 10s.
// Optional on receive (usePendingFromLayout.ts) so an older layout page's payload — sent before
// this field existed — doesn't need a migration: `undefined` reads the same as "no auto-show".
export type PendingPayload = { kind: 'pending-photos'; channelId: number; photoIds: number[]; sentAt: number; autoShowingId?: number | null }

// ── Transient cue channel ────────────────────────────────────────────────────────────────────
// A second, deliberately separate bus event carrying a cue and NOTHING else. `BusPayload` is the
// durable channel: every emit is preceded by a backend state write that bumps `seq`, which is what
// makes a reloaded browser source able to catch up. That is exactly wrong for a signal driven by
// mouse movement — one row in `overlay_state` per hover — so cues that are purely ephemeral (they
// mean nothing after the moment they describe) go here instead.
//
// It carries no state and no config, so it cannot desync the layout and it stays clear of the
// `seq` guard. `n` is only for ORDERING: obs-browser-event-bus.md §6.5 says delivery order is not
// preserved, and a "highlight off" overtaking its "highlight on" would leave a card stuck zoomed
// on stream. Unlike `seq`, `n` is client-assigned (no backend is involved), so it is seeded from
// the wall clock at first use — a reloaded controls page then resumes ABOVE whatever its previous
// life sent, instead of restarting at 1 and having every cue dropped as stale.
//
// Accepted limitation (confirmed fine, documented rather than fixed): this assumes ONE controls
// page per channel at a time. With two concurrent controls tabs, the older tab's `n` is seeded
// from an earlier wall-clock read than the newer tab's, so its cues sit below the newer tab's
// seed and are dropped by the receiver's single high-water mark.
export const BUS_CUE_EVENT_NAME = 'mob:cue'
export const DEV_CUE_CHANNEL_NAME = 'mob:cue-bus'

export type CuePayload = { n: number; cue: TransientCue }
