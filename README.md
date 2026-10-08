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

`icons` brings back the previous `new_teams` octagon icons.

**Pick a set**

- Per OBS source: add `?ripsTiles=clean` (or `veined`, `icons`) to the layout browser source URL, e.g. `<frontend-host>/obs/layout/<id>?ripsTiles=clean`. Refresh the source after changing it.
- Default for every source: change `DEFAULT_RIPS_TILE_SET` in `src/app/obs/layout/elements/board-rips-flat/RipsFlatCell.tsx`.

**Change or regenerate the tiles**

The tiles are drawn by `scripts/rips-tiles/tiles.html` and exported to PNG (264x264, 4x the 66 px cell) by:

```
python3 scripts/rips-tiles/export.py
```

Run it from `Whatnot-Frontend/`; it needs Google Chrome installed. To preview the design on the board, serve the repo (`python3 -m http.server` from `Whatnot-Frontend/`) and open `http://localhost:8000/scripts/rips-tiles/tiles.html`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
