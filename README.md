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
