import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPng } from './pixel-core.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '../../public/assets')
const QA = join(ROOT, '../../docs/art-qa')

const EXPECTED = new Map([
  ['parallax_sky_360x640.png', [360, 640]],
  ['parallax_far_720x200.png', [720, 200]],
  ['ground_road_360x120.png', [360, 120]],
  ['building_a_320x420.png', [320, 420]],
  ['bike_side_64x48.png', [64, 48]],
  ['boy_ride_4f_64x64.png', [256, 64]],
  ['boy_ride_brake_2f_64x64.png', [128, 64]],
  ['boy_pushbike_4f_64x64.png', [256, 64]],
  ['fx_ride_dust_3f_24x12.png', [72, 12]],
])

function assert(ok, message) {
  if (!ok) throw new Error(message)
}

function region(image, x, y, width, height) {
  const out = Buffer.alloc(width * height * 4)
  for (let yy = 0; yy < height; yy++) {
    const start = ((y + yy) * image.width + x) * 4
    out.set(image.pixels.subarray(start, start + width * 4), yy * width * 4)
  }
  return out
}

function hash(image, x, y, width, height) {
  return createHash('sha256').update(region(image, x, y, width, height)).digest('hex')
}

function stats(image, x = 0, y = 0, width = image.width, height = image.height) {
  let visible = 0
  let opaque = 0
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  const colors = new Set()
  for (let yy = 0; yy < height; yy++) {
    for (let xx = 0; xx < width; xx++) {
      const i = ((y + yy) * image.width + x + xx) * 4
      const a = image.pixels[i + 3]
      if (!a) continue
      visible++
      if (a === 255) opaque++
      minX = Math.min(minX, xx); minY = Math.min(minY, yy)
      maxX = Math.max(maxX, xx); maxY = Math.max(maxY, yy)
      colors.add(`${image.pixels[i]},${image.pixels[i + 1]},${image.pixels[i + 2]},${a}`)
    }
  }
  return { visible, opaque, minX, minY, maxX, maxY, colors: colors.size }
}

function columnsEqual(image, left, right) {
  for (let y = 0; y < image.height; y++) {
    const a = (y * image.width + left) * 4
    const b = (y * image.width + right) * 4
    for (let ch = 0; ch < 4; ch++) if (image.pixels[a + ch] !== image.pixels[b + ch]) return false
  }
  return true
}

const images = new Map()
for (const [name, [width, height]] of EXPECTED) {
  const image = loadPng(join(OUT, name))
  assert(image.width === width && image.height === height, `${name}: expected ${width}x${height}, got ${image.width}x${image.height}`)
  const alphas = new Set()
  for (let i = 3; i < image.pixels.length; i += 4) alphas.add(image.pixels[i])
  assert([...alphas].every(a => a === 0 || a === 64 || a === 255), `${name}: alpha must be 0/64/255`)
  images.set(name, image)
  console.log(`PASS ${name.padEnd(38)} ${width}x${height} colors=${stats(image).colors}`)
}

for (const name of ['parallax_sky_360x640.png', 'parallax_far_720x200.png', 'ground_road_360x120.png'])
  assert(columnsEqual(images.get(name), 0, images.get(name).width - 1), `${name}: horizontal tile edges differ`)
assert(stats(images.get('parallax_sky_360x640.png')).opaque === 360 * 640, 'sky must be fully opaque')
assert(stats(images.get('ground_road_360x120.png')).opaque === 360 * 120, 'ground must be fully opaque')
assert(stats(images.get('parallax_far_720x200.png')).visible < 720 * 200, 'far layer must preserve transparent sky area')
console.log('PASS parallax: exact tile edges; opaque sky/road and transparent far silhouette layer')

const building = images.get('building_a_320x420.png')
const bs = stats(building)
assert(bs.visible > 85000 && bs.visible < 320 * 420, 'building coverage is implausible')
assert(stats(building, 0, 0, 10, 420).visible === 0 && stats(building, 310, 0, 10, 420).visible === 0, 'building side margins must be transparent and uncut')
assert(bs.colors >= 20, 'building needs enough material/color detail')
console.log('PASS building A: transparent side margins, dense facade detail, no clipped edge elements')

function uniqueFrames(name, frameWidth, count) {
  const image = images.get(name)
  const hashes = Array.from({ length: count }, (_, i) => hash(image, i * frameWidth, 0, frameWidth, image.height))
  assert(new Set(hashes).size === count, `${name}: animation frames must all be unique`)
  return Array.from({ length: count }, (_, i) => stats(image, i * frameWidth, 0, frameWidth, image.height))
}

const ride = uniqueFrames('boy_ride_4f_64x64.png', 64, 4)
assert(ride.every(s => s.visible > 600 && s.maxY >= 62), 'ride frames need full rider+bike silhouette and ground shadow')
assert(ride[2].minY < ride[0].minY && ride[3].minY < ride[1].minY, 'ride frames 3/4 must include 1px road bump')
const brake = uniqueFrames('boy_ride_brake_2f_64x64.png', 64, 2)
assert(brake[1].visible > brake[0].visible, 'brake frame 2 must add the supporting foot')
const push = uniqueFrames('boy_pushbike_4f_64x64.png', 64, 4)
assert(push.every(s => s.visible > 650), 'push-bike frames need both person and bike')
uniqueFrames('fx_ride_dust_3f_24x12.png', 24, 3)
console.log('PASS motion: ride wheel/bump, brake support foot, push walk and dust frames are unique')

const parked = stats(images.get('bike_side_64x48.png'))
assert(parked.visible > 300 && parked.visible < 64 * 48, 'parked bike coverage invalid')
console.log('PASS bike: transparent 64x48 parked state with visible vehicle and flyer basket')

const preview = loadPng(join(QA, 'b3-yard-minimum-loop-preview.png'))
assert(preview.width === 720 && preview.height === 640, `preview expected 720x640, got ${preview.width}x${preview.height}`)
assert(stats(preview).opaque === 720 * 640, 'preview must be fully opaque')
console.log('PASS preview: 2-screen 720x640 composite is fully opaque at native pixel scale')

console.log('\nB3 minimum loop batch verified successfully')
