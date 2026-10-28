This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Rips board marble tiles

The `board:rips_flat` board (Greek scene) shows each team as an octagonal stone cut from the board's own cream marble, with a gold octagon inlay and the logo. Stones fill their cells, touch their neighbours, and the board's blue shows through their cut corners. There are three marble sets:

| Set | Files | Look |
|---|---|---|
| `veined` (default) | `public/images/rips_tiles/veined/` | The board's marble across the whole stone, veins included |
| `clean` | `public/images/rips_tiles/clean/` | Veins softened away inside the gold octagon, so nothing runs behind the logo |
| `marble_auto` | `public/images/rips_tiles/CellFrame.png` (gold frame), `public/images/rips_tiles/webp-rips/` (logos), `public/images/static/rips/BackFlat.png` (marble) | Not a pre-drawn stone: composed live from the frame element's marble, the gold frame and the logo. The marble is the whole 1080x1920 canvas sheet, so each cell shows the piece that lies under it — veins run on across neighbouring cells and shift when the board is moved. No generator step; replace the three assets to restyle it (re-measure the clip octagon in `RipsFlatCell.css` if the frame changes). |

The board backdrop is the same for every set: `public/images/rips_board/BoardSeparate.png` (the blue board in its gold frame, no marble surround), stretched to the element's box. The team cells sit 15 px in from every edge of the 1473x354 art (`RIPS_BOARD_INSET` in `src/app/obs/layout/elements/board-rips-flat/boardArt.ts`), scaled with the box so they follow the frame at any size; re-check it if the art is replaced.

`board.png` and `board_tiles.png` (the old marble-surround backdrops) are no longer shown on the board; the tile generator below still reads `board.png` for the marble texture, and "Change the board edge" only affects `board_tiles.png`.

`icons` brings back the previous `new_teams` octagon icons.

**Pick a set**

In `/obs/controls/<id>`, open the Rips board element's settings and choose **Tiles**: *Marble, veined*, *Marble, clean centre*, *Classic icons* or *Marble auto*. It is saved with the layout and the stream updates on its own. A board that never had it set shows `DEFAULT_RIPS_TILE_SET` (in `src/app/obs/layout/elements/board-rips-flat/RipsFlatCell.tsx`).

*Marble auto* shows each team's tier (1 = best, 2, 3; the lists are `TIER_OF` in `src/app/obs/layout/elements/board-rips-flat/ripsOrder.ts`, every team not listed is tier 3) by its frame: `public/images/rips_tiles/CellFrameTier1.png` / `CellFrameTier2.png` for tiers 1 and 2, `CellFrame.png` for tier 3. The marble background is the same for every tier. Replace those files to restyle a tier.

**Pick the back**

The same panel has a second select, **Back**, for what a sold cell shows once it has flipped. It is independent of Tiles — any front goes with either back. *Grey tiles* (default) is the grey sub-tile skin with its decorations, as before. *Flip art* turns the sold cells into one painting: one image picked at random from `public/images/rips_board/FlippedArt/` (png/jpg/webp — drop a new file in and it joins the pool) when the page loads, kept for as long as the page stays open (only a reload picks again), is laid over the whole cell grid (cover fit, centred, empty slots of a short row included so it never shifts on a re-deal) and every flipped cell reveals the piece under it. A cell on its own — including the one still playing its flip — shows its piece in grey; once its effect ends it joins every sold cell it shares a side with (cells touching only at a corner stay separate) and the whole shape turns to colour. There is no frame: the painting is cut to the outline of the shape, a thin gap in from the cell edge (an L, a T, a ring around an unsold cell all work), with the corners cut off into an octagon, and a small chamfer fills the corner of an unsold neighbour, parallel to that stone's cut corner and as far from it as the straight edges are from theirs. Each shape is drawn in one piece over its cells, so no seams show inside it. The cut is in `board-rips-flat/flipArtShapes.ts` (`MASK_INSET`, `MASK_CORNER_CUT`, `FRONT_TILE_CUT`) and, for a cell on its own, `RipsFlatCell.css` (`.rfb-art`).

Two more selects decide where the teams sit. **Grouping type**: *Tier sorting* (default) puts tier 1 in the centre of the board, then tier 2, with tier 3 toward the edges, alphabetical inside a tier; *Alphabet order* lays the teams out alphabetically like text, left to right, row by row: the 32 NFL teams first, then the custom spots (Miscellaneous included), also alphabetical. **Replacing after selling**: *After selling cells replace on sides* (default) moves a sold cell to the outermost slots once its flip and burst end, and the rest re-deal around it; *After selling cells stay on its place* never moves anything, a sold cell flips where it is. Prices play no part in the order, so OBS, the controls preview and a reload always show the same board.

**Change or regenerate the tiles**

The tiles and the backdrop are drawn by `scripts/rips-tiles/tiles.html` and exported to PNG (tiles 264x264, 4x the 66 px cell; backdrop 2160x500) by:

```
python3 scripts/rips-tiles/export.py
```

Run it from `Whatnot-Frontend/`; it needs Google Chrome installed. To preview the design on the board, serve the repo (`python3 -m http.server` from `Whatnot-Frontend/`) and open `http://localhost:8000/scripts/rips-tiles/tiles.html`.

**Change the board edge**

The gold edge around the blue inset is part of `board_tiles.png`. It is drawn in code, so nothing is hand-edited: change the code, then re-export. The code is `drawBoardBackdrop` in `scripts/rips-tiles/tiles.html`. All sizes are in board pixels (the board is 1080x250).

| What | Where | Now |
|---|---|---|
| Thickness | `bw` on the `const F = …` line | `10` |
| Corner cut size | `cut` on the same line | `21` |
| Outer position | `F` (`x0`, `y0`, `x1`, `y1`) on the same line | `132, 18, 959, 237` |
| Shadow on the outer slope | first `quad(O…, S1…)` line, `rgba(40,18,0,…)` | `.45` |
| Highlight face | second `quad(S1…, M…)` line, `rgba(255,246,215,…)` | `.32` |
| Shade on the inner face | third `quad(M…, I…)` line, `rgba(45,22,0,…)` | `.32` |
| Gold colours | `DEEP_GOLD` (shared with the tile edges, so it changes both) | |

The edge has three faces of equal width: a shadowed outer slope, a highlighted face and a shaded inner face. In each `rgba(…)` the first number is the strength; the `± 0.1 * d` after it is how much the top-left light brightens the top and left sides and darkens the bottom and right.

Keep `F` covering the original frame (x 133-957, y 20-234), otherwise the old frame shows around the new one. A thinner `bw` is fine: whatever is left of the old frame inside the new edge is filled with the blue inset automatically.

To apply a change:

1. Edit the values.
2. Check the result in the preview page (see above).
3. Run `python3 scripts/rips-tiles/export.py`. It rewrites `board_tiles.png` and both tile sets.
4. Commit the changed PNGs.

## Rips scene banners (wind)

The two banners on the rips scene's podium are a looping video (`public/videos/rips_scene/FlagIdle.webm`), and the wind is added on top of it: the rod stays still, the cloth sways and ripples, and the tassels swing most. The wind loops every 6 seconds, and the mirrored banner follows on its own.

**In OBS:** nothing to set up. The rips scene renders inside the layout browser source (`<frontend-host>/obs/layout/<id>`). Once this is deployed, refresh that source and the banners move.

**Change the strength**

1. Open `/obs/setup/rips_scene` (also linked from the rips scene element in `/obs/controls/<id>`, "Open setup page").
2. Under **Podium: flag**, set **Wind**: `0` = the video as recorded, no extra wind, `1` = default gentle sway, up to `3`. **Mirror copy offset, s** shifts the mirrored banner's loop (video and wind) by that many seconds, so the two banners move out of step; `0` = in sync. The preview updates live.
3. Click **Copy** in the recipe box.
4. In `/obs/controls/<id>`, open the rips scene element, expand **Scene recipe**, paste and click **Apply**. The stream picks it up without a refresh.

A recipe saved before this change has no wind value and uses `1`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## OBS overlays

### Screen crack (`public/overlays/screen-crack.html`)

A procedural cracked-glass overlay for the 1080x1920 stream canvas. Every load generates a new crack, plays one pass and then goes fully transparent:

1. **Crack** (0.6 s): flash, the crack spreads from the hit point, the glass shakes.
2. **Hold** (1.2 s by default).
3. **Shatter** (about 1.9 s): a second jolt sweeps the crack across the screen and the glass bursts: shards blow outward from the hit (the nearest fly past the camera), then fall away.

It is a single self-contained HTML file with no dependencies and no Next.js involvement.

**Add it to OBS**

1. Add a **Browser Source**. Either tick **Local file** and pick `public/overlays/screen-crack.html`, or use the URL `<frontend-host>/overlays/screen-crack.html`.
2. Set **Width 1080** and **Height 1920**. Leave the default Custom CSS, which keeps the background transparent.
3. Tick **Shutdown source when not visible** and **Refresh browser when scene becomes active**.
4. Keep the source hidden. Clicking the eye icon (or showing it from a hotkey or scene switch) loads the page and plays one pass with a fresh crack. Hide it again before the next use.

**Options** (URL query parameters)

| Parameter | Effect |
|---|---|
| `hold=800` | Milliseconds to hold the crack before shattering (default 1200) |
| `x=643&y=851` | Hit point in canvas pixels (default is where the kick-smash ball strikes) |
| `jitter=70` | Random spread around the hit point in pixels |
| `seed=123` | Replay one specific crack instead of a random one |
| `preview=1` | Testing view: background, help bar, keys (N new crack, C crack, S shatter, R reset), click to crack |
| `demo=1` | Loop new cracks continuously |

For a layout page that embeds it instead, `window.ScreenCrack` exposes `crack({x, y, seed})`, `shatter()`, `play({hold})` and `reset()`, and the page fires a `screencrack` event with `detail.phase` set to `crack`, `hold`, `shatter` or `done`.
