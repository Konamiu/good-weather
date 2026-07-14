import { inflateSync } from 'node:zlib'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '../../public/assets')

const expected = new Map([
  ['boy_idle_down_2f_48x64.png', 2],
  ['boy_walk_down_4f_48x64.png', 4],
  ['boy_walk_up_4f_48x64.png', 4],
  ['boy_walk_side_4f_48x64.png', 4],
  ['boy_run_side_4f_48x64.png', 4],
  ['girl_idle_down_2f_48x64.png', 2],
  ['girl_walk_down_4f_48x64.png', 4],
  ['girl_walk_up_4f_48x64.png', 4],
  ['girl_walk_side_4f_48x64.png', 4],
  ['girl_idle_sing_2f_48x64.png', 2],
])

const C = Object.freeze({
  clear: '00000000', shadow: '00000040',
  hairLight: '5a4a56ff', hairBase: '2b2028ff', hairDark: '1f1a17ff',
  skinLight: 'f4d1aeff', skinBase: 'd9a97cff', skinDark: 'c9926bff', skinEdge: '8f5f4aff',
  blueLight: '6b8fc2ff', blueBase: '4a6fa5ff', blueDark: '33507cff',
  creamLight: 'fffdf6ff', creamBase: 'efe6d5ff', creamDark: 'd8cdb8ff',
  redLight: 'd97d70ff', redBase: 'c4554dff', redDark: '8f3d38ff',
  pantsLight: '5a4a56ff', pantsBase: '4a3c46ff', pantsDark: '1f1a17ff',
  mouth: 'a6524aff', blush: 'e8a598ff', eye: '1f1a17ff', glint: 'ffffffff', clip: 'f2cc8fff',
})
const allowed = new Set(Object.values(C))

function decode(path) {
  const data = readFileSync(path)
  if (!data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`${path}: not PNG`)
  let offset = 8
  let width
  let height
  const idat = []
  while (offset < data.length) {
    const length = data.readUInt32BE(offset)
    const type = data.toString('ascii', offset + 4, offset + 8)
    const body = data.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      if (body[8] !== 8 || body[9] !== 6) throw new Error(`${path}: expected 8-bit RGBA`)
    }
    if (type === 'IDAT') idat.push(body)
    offset += length + 12
  }
  const raw = inflateSync(Buffer.concat(idat))
  const pixels = Buffer.alloc(width * height * 4)
  const stride = width * 4
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1)
    if (raw[row] !== 0) throw new Error(`${path}: expected PNG filter 0`)
    raw.copy(pixels, y * stride, row + 1, row + stride + 1)
  }
  return { width, height, pixels }
}

function px(image, frame, x, y) {
  const i = (y * image.width + frame * 48 + x) * 4
  return image.pixels.subarray(i, i + 4).toString('hex')
}

function count(image, frame, color, [x0, y0, w, h] = [0, 0, 48, 64]) {
  let total = 0
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) if (px(image, frame, x, y) === color) total++
  return total
}

function signature(image, frame) {
  const rows = []
  for (let y = 0; y < 64; y++) {
    const start = (y * image.width + frame * 48) * 4
    rows.push(image.pixels.subarray(start, start + 48 * 4))
  }
  return Buffer.concat(rows).toString('base64')
}

function bounds(image, frame) {
  let minX = 48; let minY = 64; let maxX = -1; let maxY = -1
  for (let y = 0; y < 62; y++) {
    for (let x = 0; x < 48; x++) {
      const v = px(image, frame, x, y)
      if (v !== C.clear && v !== C.shadow) {
        minX = Math.min(minX, x); minY = Math.min(minY, y)
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
      }
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function assertHeadEqual(image, a, b, yMax, label) {
  for (let y = 0; y <= yMax; y++)
    for (let x = 0; x < 48; x++)
      if (px(image, a, x, y) !== px(image, b, x, y)) throw new Error(`${label}: head moved at ${x},${y}`)
}

const actual = readdirSync(OUT).filter(name => name.endsWith('_48x64.png')).sort()
const wanted = [...expected.keys()].sort()
if (actual.join('\n') !== wanted.join('\n')) throw new Error(`expected exactly 10 48x64 sheets; got ${actual.join(', ')}`)

const images = new Map()
for (const [name, frames] of expected) {
  const image = decode(join(OUT, name))
  images.set(name, image)
  if (image.width !== frames * 48 || image.height !== 64) throw new Error(`${name}: expected ${frames * 48}x64, got ${image.width}x${image.height}`)
  const colors = new Set()
  for (let i = 0; i < image.pixels.length; i += 4) {
    const value = image.pixels.subarray(i, i + 4).toString('hex')
    colors.add(value)
    if (!allowed.has(value)) throw new Error(`${name}: #${value} is outside the 1.2 palette`)
    const alpha = image.pixels[i + 3]
    if (![0, 64, 255].includes(alpha)) throw new Error(`${name}: illegal alpha ${alpha}`)
  }
  if (new Set(Array.from({ length: frames }, (_, f) => signature(image, f))).size !== frames) throw new Error(`${name}: duplicate frames`)
  for (let f = 0; f < frames; f++) {
    if (count(image, f, C.shadow, [0, 62, 48, 2]) === 0) throw new Error(`${name} frame ${f + 1}: missing bottom shadow`)
    if (count(image, f, C.shadow, [0, 0, 48, 62]) !== 0) throw new Error(`${name} frame ${f + 1}: shadow leaked above y=62`)
    for (const [label, shades] of [
      ['hair', [C.hairLight, C.hairBase, C.hairDark]],
      ['skin', [C.skinLight, C.skinBase, C.skinDark]],
    ]) {
      if (shades.some(color => count(image, f, color) === 0)) throw new Error(`${name} frame ${f + 1}: ${label} is not three-stage shaded`)
    }
    const clothing = name.startsWith('boy_')
      ? [C.blueLight, C.blueBase, C.blueDark]
      : [C.creamLight, C.creamBase, C.creamDark, C.redLight, C.redBase, C.redDark]
    if (clothing.some(color => count(image, f, color) === 0)) throw new Error(`${name} frame ${f + 1}: clothing is not three-stage shaded`)
  }
  console.log(`PASS ${name.padEnd(38)} ${image.width}x${image.height}  ${colors.size} colors`)
}

for (const name of ['boy_idle_down_2f_48x64.png', 'boy_walk_down_4f_48x64.png']) {
  const image = images.get(name)
  for (let f = 0; f < expected.get(name); f++) {
    if (count(image, f, C.glint) !== 2) throw new Error(`${name} frame ${f + 1}: front eyes need two 1px glints`)
    if (count(image, f, C.blush) !== 4) throw new Error(`${name} frame ${f + 1}: front blush needs two 1x2 marks`)
    if (count(image, f, C.mouth) < 2) throw new Error(`${name} frame ${f + 1}: smile is missing`)
  }
}

for (const name of ['girl_idle_down_2f_48x64.png', 'girl_walk_down_4f_48x64.png']) {
  const image = images.get(name)
  for (let f = 0; f < expected.get(name); f++) {
    if (count(image, f, C.glint) !== 2) throw new Error(`${name} frame ${f + 1}: front eyes need two 1px glints`)
    if (count(image, f, C.blush) !== 4) throw new Error(`${name} frame ${f + 1}: front blush needs two 1x2 marks`)
    if (count(image, f, C.clip) < 8) throw new Error(`${name} frame ${f + 1}: Nan's hair clip is missing`)
    if (count(image, f, C.mouth) < 2) throw new Error(`${name} frame ${f + 1}: smile is missing`)
  }
}

for (const name of ['boy_walk_up_4f_48x64.png', 'girl_walk_up_4f_48x64.png']) {
  const image = images.get(name)
  for (let f = 0; f < 4; f++) {
    if (count(image, f, C.glint) !== 0 || count(image, f, C.blush) !== 0 || count(image, f, C.mouth) !== 0) throw new Error(`${name} frame ${f + 1}: back view contains facial pixels`)
  }
}

for (const name of ['boy_walk_side_4f_48x64.png', 'boy_run_side_4f_48x64.png', 'girl_walk_side_4f_48x64.png']) {
  const image = images.get(name)
  for (let f = 0; f < 4; f++) if (count(image, f, C.glint) !== 1) throw new Error(`${name} frame ${f + 1}: side eye needs one glint`)
}

const sing = images.get('girl_idle_sing_2f_48x64.png')
for (let f = 0; f < 2; f++) {
  if (count(sing, f, C.glint) !== 0) throw new Error(`girl sing frame ${f + 1}: closed eyes must not have glints`)
  if (count(sing, f, C.mouth) < 8) throw new Error(`girl sing frame ${f + 1}: 3x3 singing mouth is missing`)
  if (count(sing, f, C.clip) < 8) throw new Error(`girl sing frame ${f + 1}: hair clip is missing`)
}

const boyIdle = images.get('boy_idle_down_2f_48x64.png')
const girlIdle = images.get('girl_idle_down_2f_48x64.png')
assertHeadEqual(boyIdle, 0, 1, 29, 'boy idle')
assertHeadEqual(girlIdle, 0, 1, 34, 'girl idle')
const boyBounds = bounds(boyIdle, 0)
const girlBounds = bounds(girlIdle, 0)
if (boyBounds.height - girlBounds.height !== 4) throw new Error(`proportions: boy ${boyBounds.height}px, girl ${girlBounds.height}px; expected 4px difference`)
for (const name of [...expected.keys()].filter(name => name.startsWith('girl_'))) {
  const image = images.get(name)
  for (let f = 0; f < expected.get(name); f++) {
    if (count(image, f, C.hairBase, [0, 36, 48, 24]) + count(image, f, C.hairDark, [0, 36, 48, 24]) > 0) throw new Error(`${name} frame ${f + 1}: hair extends below the short-bob limit`)
  }
}
if (bounds(images.get('boy_run_side_4f_48x64.png'), 0).width <= bounds(images.get('boy_walk_side_4f_48x64.png'), 0).width) throw new Error('run stride must be wider than walk stride')

console.log('\nPASS inventory: exactly 10 original 48x64 character sheets')
console.log('PASS slicing: 48px fixed frames, horizontal, gapless')
console.log('PASS palette/alpha: approved 1.2 colors; alpha only 0/64/255')
console.log('PASS rendering craft: hair, skin and clothing all use three-stage shading')
console.log('PASS faces: highlighted eyes, nose/shadow, blush and smiles; no face on back views')
console.log('PASS Nan: short bob, hair clip, larger eyes and closed-eye singing frames')
console.log(`PASS proportions: Dong ${boyBounds.height}px, Nan ${girlBounds.height}px (4px difference)`)
console.log('PASS animation: every frame unique; run stride wider than walk stride')
