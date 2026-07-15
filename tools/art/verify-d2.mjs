import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPng } from './pixel-core.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '../../public/assets')
const TILE = 32

const expected = new Map([
  ['palette_v2_64x1.png', [64, 1]],
  ['tileset_ground_base_v2_256x96.png', [256, 96]],
  ['autotile_grass_on_cement_47t_256x192.png', [256, 192]],
  ['autotile_grass_on_dirt_47t_256x192.png', [256, 192]],
  ['autotile_dirt_on_cement_47t_256x192.png', [256, 192]],
  ['tileset_ground_overlay_v2_256x64.png', [256, 64]],
  ['prop_wutong_tree_64x96.png', [64, 96]],
  ['bld_home_96x128.png', [96, 128]],
  ['bld_unit_a_128x128.png', [128, 128]],
  ['ui_dialog_frame_48x48.png', [48, 48]],
  ['ui_ice_heart_6s_28x28.png', [168, 28]],
  ['d2_craft_sample_320x180.png', [320, 180]],
  ['d2_p0_world_sample_360x640.png', [360, 640]],
])

const validMasks = [
  0, 1, 4, 5, 7, 16, 17, 20,
  21, 23, 28, 29, 31, 64, 65, 68,
  69, 71, 80, 81, 84, 85, 87, 92,
  93, 95, 112, 113, 116, 117, 119, 124,
  125, 127, 193, 197, 199, 209, 213, 215,
  221, 223, 241, 245, 247, 253, 255,
]

const grass = new Set(['1d3d30', '2e6a3a', '4f8f42', '7ab04e', 'b8cf6b'])
const dirt = new Set(['3f2d32', '65463b', '8b684a', 'b18b5a', 'd5b879'])

function pixelHex(image, x, y, includeAlpha = true) {
  const i = (y * image.width + x) * 4
  const end = includeAlpha ? i + 4 : i + 3
  return Buffer.from(image.pixels.subarray(i, end)).toString('hex')
}

function tilePixel(image, index, x, y) {
  return pixelHex(image, (index % 8) * TILE + x, Math.floor(index / 8) * TILE + y)
}

function signature(image, x0, y0, width, height) {
  const rows = []
  for (let y = 0; y < height; y++) {
    const start = ((y0 + y) * image.width + x0) * 4
    rows.push(Buffer.from(image.pixels.subarray(start, start + width * 4)))
  }
  return Buffer.concat(rows).toString('base64')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const manifest = JSON.parse(readFileSync(join(OUT, 'palette_v2.json'), 'utf8'))
assert(manifest.opaqueLimit === 64, `palette limit must be 64, got ${manifest.opaqueLimit}`)
assert(manifest.opaqueCount === manifest.colors.length, 'palette opaqueCount does not match colors')
assert(manifest.opaqueCount <= manifest.opaqueLimit, `palette overflow ${manifest.opaqueCount}/64`)
assert(new Set(manifest.colors.map(c => c.hex.toLowerCase())).size === manifest.colors.length, 'palette contains duplicate opaque colors')

const allowed = new Set(manifest.colors.map(c => `${c.hex.slice(1).toLowerCase()}ff`))
for (const item of manifest.exceptions) allowed.add(item.hex.slice(1).toLowerCase())
const images = new Map()

for (const [name, [width, height]] of expected) {
  const image = loadPng(join(OUT, name))
  images.set(name, image)
  assert(image.width === width && image.height === height, `${name}: expected ${width}x${height}, got ${image.width}x${image.height}`)
  const colors = new Set()
  const alphas = new Set()
  for (let i = 0; i < image.pixels.length; i += 4) {
    const hex = Buffer.from(image.pixels.subarray(i, i + 4)).toString('hex')
    colors.add(hex); alphas.add(image.pixels[i + 3])
    assert(allowed.has(hex), `${name}: color #${hex} is outside palette_v2.json`)
    assert([0, 64, 85, 255].includes(image.pixels[i + 3]), `${name}: illegal alpha ${image.pixels[i + 3]}`)
  }
  if (name !== 'tileset_ground_overlay_v2_256x64.png') assert(!alphas.has(85), `${name}: canopy alpha 0x55 outside overlay sheet`)
  if (!name.includes('sample')) assert(!alphas.has(64), `${name}: ground-shadow alpha 0x40 is not expected in P0 source assets`)
  console.log(`PASS ${name.padEnd(50)} ${width}x${height} ${colors.size} colors`)
}

const paletteStrip = images.get('palette_v2_64x1.png')
for (let x = 0; x < 64; x++) {
  const actual = pixelHex(paletteStrip, x, 0)
  const wanted = x < manifest.colors.length ? `${manifest.colors[x].hex.slice(1).toLowerCase()}ff` : '00000000'
  assert(actual === wanted, `palette strip slot ${x}: expected ${wanted}, got ${actual}`)
}

const base = images.get('tileset_ground_base_v2_256x96.png')
for (let tile = 0; tile < 14; tile++) {
  for (let p = 0; p < TILE; p++) {
    assert(tilePixel(base, tile, 0, p) === tilePixel(base, tile, TILE - 1, p), `ground tile ${tile + 1}: left/right seam mismatch at ${p}`)
    assert(tilePixel(base, tile, p, 0) === tilePixel(base, tile, p, TILE - 1), `ground tile ${tile + 1}: top/bottom seam mismatch at ${p}`)
  }
}

function maskFromGrid(grid, x, y) {
  const same = (dx, dy) => Boolean(grid[y + dy]?.[x + dx])
  const n = same(0, -1); const e = same(1, 0); const s = same(0, 1); const w = same(-1, 0)
  let mask = 0
  if (n) mask |= 1
  if (same(1, -1) && n && e) mask |= 2
  if (e) mask |= 4
  if (same(1, 1) && s && e) mask |= 8
  if (s) mask |= 16
  if (same(-1, 1) && s && w) mask |= 32
  if (w) mask |= 64
  if (same(-1, -1) && n && w) mask |= 128
  return mask
}

function isForeground(sheet, index, x, y, foreground) {
  return foreground.has(tilePixel(sheet, index, x, y).slice(0, 6))
}

function verifyBlob(name, foreground) {
  const sheet = images.get(name)
  for (let i = 0; i < 47; i++) for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++)
    assert(tilePixel(sheet, i, x, y).slice(6) === 'ff', `${name}: transparent hole in mask ${validMasks[i]} at ${x},${y}`)
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++)
    assert(tilePixel(sheet, 47, x, y) === '00000000', `${name}: final slot must be transparent`)

  let state = 0x7f4a7c15
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000 }
  for (let trial = 0; trial < 100; trial++) {
    const grid = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => random() > 0.45))
    if (!grid.flat().some(Boolean)) grid[1][1] = true
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      if (!grid[y][x]) continue
      const a = validMasks.indexOf(maskFromGrid(grid, x, y))
      assert(a >= 0, `${name}: generated invalid blob mask`)
      if (grid[y][x + 1]) {
        const b = validMasks.indexOf(maskFromGrid(grid, x + 1, y))
        for (let p = 0; p < TILE; p++) assert(
          isForeground(sheet, a, TILE - 1, p, foreground) === isForeground(sheet, b, 0, p, foreground),
          `${name}: horizontal seam mismatch trial ${trial}, cells ${x}/${x + 1}, y=${y}, pixel=${p}`,
        )
      }
      if (grid[y + 1]?.[x]) {
        const b = validMasks.indexOf(maskFromGrid(grid, x, y + 1))
        for (let p = 0; p < TILE; p++) assert(
          isForeground(sheet, a, p, TILE - 1, foreground) === isForeground(sheet, b, p, 0, foreground),
          `${name}: vertical seam mismatch trial ${trial}, x=${x}, cells ${y}/${y + 1}, pixel=${p}`,
        )
      }
    }
  }
}

verifyBlob('autotile_grass_on_cement_47t_256x192.png', grass)
verifyBlob('autotile_grass_on_dirt_47t_256x192.png', grass)
verifyBlob('autotile_dirt_on_cement_47t_256x192.png', dirt)

const overlay = images.get('tileset_ground_overlay_v2_256x64.png')
for (let tile = 12; tile < 16; tile++) for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++)
  assert(tilePixel(overlay, tile, x, y) === '00000000', `overlay reserve tile ${tile + 1} must stay transparent`)

const ice = images.get('ui_ice_heart_6s_28x28.png')
const iceSignatures = new Set(Array.from({ length: 6 }, (_, frame) => signature(ice, frame * 28, 0, 28, 28)))
assert(iceSignatures.size === 6, `ice heart needs six visually distinct states, got ${iceSignatures.size}`)

const tree = images.get('prop_wutong_tree_64x96.png')
assert(pixelHex(tree, 32, 91) !== '00000000', 'tree contact anchor (32,91) is empty')
let topLight = 0; let bottomLight = 0
for (let y = 0; y < 58; y++) for (let x = 0; x < 64; x++) {
  const color = pixelHex(tree, x, y).slice(0, 6)
  if (color === '62a148' || color === '9bc75c') (y < 29 ? topLight++ : bottomLight++)
}
assert(topLight > bottomLight, 'tree highlight must favor the upper-left/top canopy')

for (const name of ['d2_craft_sample_320x180.png', 'd2_p0_world_sample_360x640.png']) {
  const image = images.get(name)
  for (let i = 3; i < image.pixels.length; i += 4) assert(image.pixels[i] === 255, `${name}: sample must be fully opaque`)
}

console.log('\nPASS D2 P0 inventory and dimensions')
console.log(`PASS palette: ${manifest.opaqueCount}/64 opaque colors; alpha restricted to 00/55/ff in P0 assets`)
console.log('PASS base tiles: first 14 terrain variants repeat on all four edges')
console.log('PASS blob-47: canonical masks, transparent final slot, 100 seeded 3x3 seam tests per terrain pair')
console.log('PASS craft: six distinct ice states, fixed tree anchor, top-weighted sunlight, opaque samples')
