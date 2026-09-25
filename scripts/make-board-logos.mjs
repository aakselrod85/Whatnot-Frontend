// Pre-renders every team logo at each size in src/app/obs/sport_style/boardLogoSizes.json into
// public/images/teams-board/<size>/<file>.webp, for PatchCell's `logoSizedFiles`. A small logo
// resized once here (lanczos3 + light sharpen, lossless) is crisper than the browser shrinking the
// 500px original on the fly every frame. Re-run after adding or replacing a logo:
//   node scripts/make-board-logos.mjs

import {readFileSync, readdirSync, mkdirSync} from 'node:fs'
import {join, basename} from 'node:path'
import sharp from 'sharp'

const root = new URL('..', import.meta.url).pathname
const sizes = JSON.parse(readFileSync(join(root, 'src/app/obs/sport_style/boardLogoSizes.json'), 'utf8'))
const teamsDir = join(root, 'public/images/teams')
const sources = [
    ...readdirSync(teamsDir).filter(f => f.endsWith('.webp')).map(f => join(teamsDir, f)),
    join(root, 'public/images/Miscellaneous.webp'),
]
const outDir = join(root, 'public/images/teams-board')

for (const size of sizes) {
    mkdirSync(join(outDir, String(size)), {recursive: true})
    for (const src of sources) {
        await sharp(src)
            .resize(size, size, {fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}, kernel: 'lanczos3'})
            .sharpen({sigma: 0.5})
            .webp({lossless: true})
            .toFile(join(outDir, String(size), basename(src)))
    }
}
console.log(`${sources.length} logos x ${sizes.length} sizes -> ${outDir}`)
