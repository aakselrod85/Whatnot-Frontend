// Run with node scripts/check-priced-tier-layout.cjs (uses the project's TypeScript compiler).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/app/obs/sport_style/pricedTierLayout.ts', 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
}).outputText;
const compiled = {exports: {}};
new Function('exports', source)(compiled.exports);
const {pricedTierLayout} = compiled.exports;
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
let cases = 0;
for (const width of [280, 840, 1040]) for (const cols of [2, 3, 7, 12]) {
    for (const aspect of [1, 2, 4]) for (const n of [0, 1, 2, 7, 16, 32, 40, 64]) {
        for (const ballCols of [0, 1, Math.min(3, cols - 1)]) for (const pattern of ['best', 'good', 'regular', 'mixed']) {
            const cellW = Math.floor(width / cols);
            const cellH = Math.floor(cellW / aspect);
            const pad = Math.max(2, Math.round(cellH * .06));
            const w = Math.max(1, cellW - 2 * pad), h = Math.max(1, cellH - 2 * pad);
            const available = cols * cellW - 2 * pad;
            const tiers = Array.from({length: n}, (_, i) => pattern === 'mixed'
                ? i < n / 8 ? 'best' : i < n / 3 ? 'good' : i < n / 2 ? 'mid' : 'regular'
                : pattern);
            const layout = pricedTierLayout(tiers, available, w, h, 2 * pad, ballCols * cellW);
            assert.equal(layout.boxes.length, n);
            const rects = [...layout.boxes, ...(layout.ball ? [layout.ball] : [])];
            for (const [i, r] of rects.entries()) {
                for (const v of Object.values(r)) assert(Number.isInteger(v));
                assert(r.w > 0 && r.h > 0 && r.x >= 0 && r.y >= 0);
                assert(r.x + r.w <= available && r.y + r.h <= layout.height);
                for (const other of rects.slice(i + 1)) assert(!overlaps(r, other), JSON.stringify({n, cols, aspect, ballCols, pattern, r, other}));
            }
            tiers.forEach((tier, i) => {
                if (tier === 'regular' || tier === 'mid') {
                    assert.equal(layout.boxes[i].w, w);
                    assert.equal(layout.boxes[i].h, h);
                }
            });
            if (!n) assert.equal(layout.height, 0);
            cases++;
        }
    }
}
const example = pricedTierLayout(['best', 'good', 'mid', 'regular'], 840, 117, 55, 6, 0);
assert(example.boxes[0].w > example.boxes[1].w && example.boxes[1].w > example.boxes[2].w);
assert(example.boxes[0].h > example.boxes[1].h && example.boxes[1].h > example.boxes[2].h);
console.log(`${cases} tier layouts checked: bounds, integer pixels, no overlap, normal tile sizes preserved.`);
