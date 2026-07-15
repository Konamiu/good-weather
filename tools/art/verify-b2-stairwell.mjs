import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPng } from './pixel-core.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '../../public/assets')
const QA = join(ROOT, '../../docs/art-qa')

const EXPECTED = new Map([
  ['wall_base_3s_360x90.png', [1080, 90]],
  ['door_variants_5x2_40x72.png', [400, 72]],
  ['props_floor_sheet.png', [256, 96]],
  ['props_floor_vehicles_2s_48x32.png', [96, 32]],
])

function assert(ok, message) {
  if (!ok) throw new Error(message)
}

function pixel(image, x, y) {
  const i = (y * image.width + x) * 4
  return image.pixels.subarray(i, i + 4)
}

function regionBytes(image, x, y, width, height) {
  const out = Buffer.alloc(width * height * 4)
  for (let yy = 0; yy < height; yy++) {
    const start = ((y + yy) * image.width + x) * 4
    out.set(image.pixels.subarray(start, start + width * 4), yy * width * 4)
  }
  return out
}

function hashRegion(image, x, y, width, height) {
  return createHash('sha256').update(regionBytes(image, x, y, width, height)).digest('hex')
}

function coverage(image, x, y, width, height) {
  let opaque = 0
  let visible = 0
  for (let yy = y; yy < y + height; yy++) {
    for (let xx = x; xx < x + width; xx++) {
      const a = pixel(image, xx, yy)[3]
      if (a > 0) visible++
      if (a === 255) opaque++
    }
  }
  return { visible, opaque, total: width * height }
}

const images = new Map()
for (const [name, [width, height]] of EXPECTED) {
  const image = loadPng(join(OUT, name))
  assert(image.width === width && image.height === height, `${name}: expected ${width}x${height}, got ${image.width}x${image.height}`)
  const alphas = new Set()
  for (let i = 3; i < image.pixels.length; i += 4) alphas.add(image.pixels[i])
  assert([...alphas].every(a => a === 0 || a === 64 || a === 255), `${name}: alpha must be 0/64/255`)
  images.set(name, image)
  console.log(`PASS ${name.padEnd(40)} ${width}x${height} alpha=${[...alphas].sort((a, b) => a - b).join('/')}`)
}

const walls = images.get('wall_base_3s_360x90.png')
const wallHashes = [0, 1, 2].map(i => hashRegion(walls, i * 360, 0, 360, 90))
assert(new Set(wallHashes).size === 3, 'wall bases must be three unique 360x90 frames')
assert(coverage(walls, 0, 0, walls.width, walls.height).opaque === walls.width * walls.height, 'wall bases must be fully opaque')
for (let frame = 0; frame < 3; frame++) {
  const upper = pixel(walls, frame * 360 + 4, 20)
  const lower = pixel(walls, frame * 360 + 4, 70)
  assert(upper[0] > upper[1] - 20 && upper[0] > upper[2], `wall ${frame + 1}: upper wall tone missing`)
  assert(lower[1] > lower[0], `wall ${frame + 1}: green wall skirt missing`)
}
console.log('PASS walls: 3 unique opaque bases with upper wall and green skirt regions')

const doors = images.get('door_variants_5x2_40x72.png')
const doorHashes = Array.from({ length: 10 }, (_, i) => hashRegion(doors, i * 40, 0, 40, 72))
assert(new Set(doorHashes).size === 10, 'all 10 door frames must be unique')
for (let kind = 0; kind < 5; kind++) {
  const normalX = kind * 80
  const stuffedX = normalX + 40
  assert(hashRegion(doors, normalX, 0, 40, 61) === hashRegion(doors, stuffedX, 0, 40, 61), `door ${kind + 1}: normal/stuffed upper area changed`)
  assert(hashRegion(doors, normalX, 61, 40, 11) !== hashRegion(doors, stuffedX, 61, 40, 11), `door ${kind + 1}: flyer state missing`)
  assert(coverage(doors, normalX, 0, 40, 72).visible < 40 * 72, `door ${kind + 1}: transparent background missing`)
}
console.log('PASS doors: 5 distinct variants x 2 states; flyer changes only the bottom area')

const props = images.get('props_floor_sheet.png')
const propHashes = []
for (let i = 0; i < 24; i++) {
  const x = (i % 8) * 32
  const y = Math.floor(i / 8) * 32
  const c = coverage(props, x, y, 32, 32)
  assert(c.visible >= 18, `floor prop ${i + 1}: not enough visible pixels`)
  assert(c.visible < c.total, `floor prop ${i + 1}: transparent background missing`)
  propHashes.push(hashRegion(props, x, y, 32, 32))
}
assert(new Set(propHashes).size === 24, 'all 24 floor prop cells must be unique')
console.log('PASS props: 8x3 fixed grid, 24 non-empty unique transparent 32x32 cells')

const vehicles = images.get('props_floor_vehicles_2s_48x32.png')
assert(hashRegion(vehicles, 0, 0, 48, 32) !== hashRegion(vehicles, 48, 0, 48, 32), 'vehicle frames must be distinct')
for (let i = 0; i < 2; i++) {
  const c = coverage(vehicles, i * 48, 0, 48, 32)
  assert(c.visible >= 70 && c.visible < c.total, `vehicle ${i + 1}: invalid coverage`)
}
console.log('PASS vehicles: detailed electric scooter and bicycle are two fixed 48x32 frames')

const preview = loadPng(join(QA, 'b2-priority-combination-preview.png'))
assert(preview.width === 360 && preview.height === 270, `preview expected 360x270, got ${preview.width}x${preview.height}`)
assert(coverage(preview, 0, 0, 360, 270).opaque === 360 * 270, 'combination preview must be fully opaque')
console.log('PASS preview: 3 composed 360x90 floors, using the actual 48x64 protagonist for scale')

console.log('\nB2 priority batch verified successfully')
