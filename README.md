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
