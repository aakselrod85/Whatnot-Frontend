// Focused regression checks using the project's existing TypeScript + React dependencies.
// Run from the repository root: node scripts/rips-tiles/check-doric.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '../..')
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (name, ...args) {
    return originalResolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args)
}
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
}).outputText, file)
require.extensions['.css'] = () => {}
const base = path.join(root, 'src/app/obs/layout/elements/board-rips-flat')
const {updateGoldState, visibleGoldCells, GOLD_RETURN_MS} = require(path.join(base, 'doricGoldState.ts'))
const {DORIC_BOUNDS, DORIC_FRAME, DORIC_PRELOAD, doricFrameStyle} = require(path.join(base, 'doricMaterials.ts'))
const {ripsTierOf, placeRipsCells} = require(path.join(base, 'ripsOrder.ts'))
const {sportsLogoFilter} = require(path.join(root, 'src/app/obs/sport_style/logoFilter.ts'))
const {Teams, TeamIconSrc} = require(path.join(root, 'src/app/common/teams.ts'))
const {RipsFlatCell, DEFAULT_RIPS_TILE_SET} = require(path.join(base, 'RipsFlatCell.tsx'))
const {renderToStaticMarkup} = require('react-dom/server')
const React = require('react')

let state = updateGoldState(new Map(), [{id: 1, row: 0, col: 5, sold: false}, {id: 2, row: 1, col: 4, sold: true}], 0)
assert.deepEqual(visibleGoldCells(state, 0).map((v) => v.id), [1], 'already-sold cells never get a front overlay')
state = updateGoldState(state, [{id: 1, row: 0, col: 5, sold: true}, {id: 2, row: 1, col: 4, sold: false}], 100)
assert.equal(visibleGoldCells(state, 100).length, 0, 'sale removes gold immediately; refund waits for the 3D return')
assert.equal(visibleGoldCells(state, 100 + GOLD_RETURN_MS - 1).length, 0)
assert.deepEqual(visibleGoldCells(state, 100 + GOLD_RETURN_MS).map((v) => v.id), [2])
state = updateGoldState(state, [{id: 2, row: 2, col: 8, sold: false}], 1000)
assert.deepEqual(visibleGoldCells(state, 1000).map(({id, row, col}) => ({id, row, col})), [{id: 2, row: 2, col: 8}], 're-deals use current slots and removed ids disappear')
assert.equal(updateGoldState(state, [], 1001).size, 0)

for (const tier of [1, 2, 3]) {
    const [l, t, r, b] = DORIC_BOUNDS[tier], style = doricFrameStyle(tier)
    const x = parseFloat(style.left), y = parseFloat(style.top), w = parseFloat(style.width), h = parseFloat(style.height)
    for (const [actual, expected] of [[x + l / 1254 * w, 1.5], [x + r / 1254 * w, 98.5], [y + t / 1254 * h, 1.5], [y + b / 1254 * h, 98.5]]) assert.ok(Math.abs(actual - expected) < 1e-9, `tier ${tier} bounds are aligned`)
}
for (const src of DORIC_PRELOAD) assert.ok(fs.existsSync(path.join(root, 'public', src)), src)
for (const h of [3, 33, 66, 99, 150]) {
    const px = Math.max(1, Math.round(h * .035))
    const original = [`${px}px 0`, `-${px}px 0`, `0 ${px}px`, `0 -${px}px`].map((o) => `drop-shadow(${o} 0 rgba(0,0,0,0.9))`).join(' ') + ` drop-shadow(0 ${Math.round(h * .03)}px ${Math.round(h * .03)}px rgba(0,0,0,0.5))`
    assert.equal(sportsLogoFilter(h), original, 'sports outline is unchanged')
}
const event = (team, i, customer = '') => ({id: i + 1, index: i, break_id: 1, team, customer, price: 0, is_giveaway: false, note: '', quantity: 1, giveaway_type: 0})
for (const [i, team] of [...Teams, 'Miscellaneous'].entries()) {
    assert.ok(fs.existsSync(path.join(root, 'public', TeamIconSrc(team))), team)
    const html = renderToStaticMarkup(React.createElement(RipsFlatCell, {event: event(team, i), tileSet: 'marble_auto', cellPx: 66}))
    assert.ok(html.includes(DORIC_FRAME[ripsTierOf(team)]), `${team} keeps its assigned tier`)
    assert.ok(html.includes(TeamIconSrc(team)), `${team} uses sports art`)
}
assert.equal(DEFAULT_RIPS_TILE_SET, 'veined', 'existing unset board configs retain the default')
for (const set of ['veined', 'clean', 'icons']) {
    const html = renderToStaticMarkup(React.createElement(RipsFlatCell, {event: event('Chicago Bears', 0), tileSet: set}))
    assert.ok(!html.includes('rfb-doric'))
}
for (const backStyle of ['tiles', 'flip_art']) {
    const html = renderToStaticMarkup(React.createElement(RipsFlatCell, {event: event('Chicago Bears', 0, 'buyer'), tileSet: 'marble_auto', backStyle, alreadySettled: true}))
    assert.ok(html.includes('rfb-cell-final'))
    assert.ok(!html.includes('rfb-cell-flipped'))
    assert.ok(!html.includes('<video'), 'reload never replays sale burst')
    assert.ok(html.includes(backStyle === 'tiles' ? 'rfb-back-fallback' : 'rfb-art-back'))
}
for (const count of [0, 1, 17, 32, 33]) for (const order of ['tier', 'alphabet']) for (const placement of ['sides', 'stay']) {
    const cells = [...Teams, 'Miscellaneous'].slice(0, count).map((team, i) => ({team, eventId: i, sold: i % 3 === 0}))
    const placed = placeRipsCells(cells, order, placement).flat()
    assert.equal(new Set(placed.map((v) => v.eventId)).size, count)
    assert.equal(new Set(placed.map((v) => `${v.row},${v.col}`)).size, count)
}
console.log('PASS: gold lifecycle, frame alignment, sports outline, all 33 logos/tiers, legacy sets, sold backs, partial-row ordering')
