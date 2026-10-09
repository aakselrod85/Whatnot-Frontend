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

The `board:rips_flat` board (Greek scene) shows each team as an octagonal stone cut from the board's own cream marble, with a gold octagon inlay and the logo. Stones fill their cells, touch their neighbours, and the board's blue shows through their cut corners. There are two sets:

| Set | Files | Look |
|---|---|---|
| `veined` (default) | `public/images/rips_tiles/veined/` | The board's marble across the whole stone, veins included |
| `clean` | `public/images/rips_tiles/clean/` | Veins softened away inside the gold octagon, so nothing runs behind the logo |

Both marble sets also swap the board backdrop to `public/images/rips_board/board_tiles.png`: the same board with the gold frame around the blue inset redrawn in the tiles' gold, with the same cut corners and a three-face moulding. See "Change the board edge" below.

`icons` brings back the previous `new_teams` octagon icons and the original `board.png`.

**Pick a set**

In `/obs/controls/<id>`, open the Rips board element's settings and choose **Tiles**: *Marble, veined*, *Marble, clean centre* or *Classic icons*. It is saved with the layout and the stream updates on its own. A board that never had it set shows `DEFAULT_RIPS_TILE_SET` (in `src/app/obs/layout/elements/board-rips-flat/RipsFlatCell.tsx`).

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

The two banners on the rips scene's podium move gently in the wind: the rod stays still, the cloth sways and ripples, and the tassels swing most. It loops every 6 seconds, and the mirrored banner follows on its own.

**In OBS:** nothing to set up. The rips scene renders inside the layout browser source (`<frontend-host>/obs/layout/<id>`). Once this is deployed, refresh that source and the banners move.

**Change the strength**

1. Open `/obs/setup/rips_scene` (also linked from the rips scene element in `/obs/controls/<id>`, "Open setup page").
2. Under **Podium: flag**, set **Wind**: `0` = still image, `1` = default gentle sway, up to `3`. The preview updates live.
3. Click **Copy** in the recipe box.
4. In `/obs/controls/<id>`, open the rips scene element, expand **Scene recipe**, paste and click **Apply**. The stream picks it up without a refresh.

A recipe saved before this change has no wind value and uses `1`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
