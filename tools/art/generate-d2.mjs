import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PixelCanvas, loadPng, savePng } from './pixel-core.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '../../public/assets')
const TILE = 32

export const RAMPS = Object.freeze({
  grass: ['#1d3d30', '#2e6a3a', '#4f8f42', '#7ab04e', '#b8cf6b'],
  foliage: ['#16302a', '#245237', '#3b7740', '#62a148', '#9bc75c'],
  cement: ['#3a3644', '#5c5866', '#8a8580', '#b0aa9c', '#d8cfb4'],
  dirt: ['#3f2d32', '#65463b', '#8b684a', '#b18b5a', '#d5b879'],
  brick: ['#4a2530', '#7a3a38', '#a85544', '#c97a55', '#e8a878'],
  skin: ['#8f5f4a', '#c9926b', '#d9a97c', '#f4d1ae', '#fbe4c0'],
  sky: ['#4a6a9a', '#5d84ad', '#79acd0', '#a8d8e8', '#d0ecf4'],
  water: ['#243f59', '#315f78', '#4f88a3', '#78b6c6', '#b6dce0'],
})

const EXTRA = Object.freeze({
  hairLight: '#5a4a56', hairBase: '#2b2028', ink: '#1f1a17',
  blueLight: '#6b8fc2', blueBase: '#4a6fa5', blueDark: '#33507c',
  creamLight: '#fffdf6', creamBase: '#efe6d5', creamDark: '#d8cdb8',
  redLight: '#d97d70', redBase: '#c4554d', redDark: '#8f3d38',
  pants: '#4a3c46', mouth: '#a6524a', blush: '#e8a598',
  white: '#ffffff', gold: '#f2cc8f', clear: '#00000000',
  groundShadow: '#00000040', canopyShadow: '#16302a55',
})

export const VALID_MASKS = Object.freeze([
  0, 1, 4, 5, 7, 16, 17, 20,
  21, 23, 28, 29, 31, 64, 65, 68,
  69, 71, 80, 81, 84, 85, 87, 92,
  93, 95, 112, 113, 116, 117, 119, 124,
  125, 127, 193, 197, 199, 209, 213, 215,
  221, 223, 241, 245, 247, 253, 255,
])

function paletteManifest() {
  const entries = []
  const seen = new Set()
  for (const [ramp, colors] of Object.entries(RAMPS)) {
    colors.forEach((hex, step) => {
      if (seen.has(hex)) return
      seen.add(hex)
      entries.push({ name: `${ramp}.${step}`, hex, ramp, step, use: `${ramp} material ramp` })
    })
  }
  for (const [name, hex] of Object.entries(EXTRA)) {
    if (hex.length !== 7 || seen.has(hex)) continue
    seen.add(hex)
    entries.push({ name, hex, ramp: 'project', use: 'character, UI or shared accent' })
  }
  if (entries.length > 64) throw new Error(`D2 opaque palette overflow: ${entries.length}/64`)
  return {
    version: 2,
    opaqueLimit: 64,
    opaqueCount: entries.length,
    colors: entries,
    exceptions: [
      { name: 'clear', hex: EXTRA.clear, use: 'transparent canvas' },
      { name: 'groundShadow', hex: EXTRA.groundShadow, use: 'character and ground contact shadow only' },
      { name: 'canopyShadow', hex: EXTRA.canopyShadow, use: 'tree-shadow overlay only' },
    ],
  }
}

function rgba(hex) {
  const raw = hex.slice(1)
  const full = raw.length === 6 ? `${raw}ff` : raw
  return [0, 2, 4, 6].map(i => Number.parseInt(full.slice(i, i + 2), 16))
}

function colorAt(canvas, x, y) {
  const i = (y * canvas.width + x) * 4
  return canvas.pixels.subarray(i, i + 4)
}

function copyPixel(dst, dx, dy, src, sx, sy, alphaMode = 'copy') {
  if (dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) return
  const si = (sy * src.width + sx) * 4
  const a = src.pixels[si + 3]
  if (a === 0) return
  const di = (dy * dst.width + dx) * 4
  if ((alphaMode === 'opaque' || alphaMode === 'canopy') && a < 255) {
    dst.pixels.set(rgba(alphaMode === 'canopy' ? RAMPS.foliage[0] : RAMPS.cement[0]), di)
    return
  }
  dst.pixels.set(src.pixels.subarray(si, si + 4), di)
}

function blitVisible(dst, src, dx, dy, alphaMode = 'copy') {
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) copyPixel(dst, dx + x, dy + y, src, x, y, alphaMode)
}

function crop(src, x0, y0, width, height) {
  const out = new PixelCanvas(width, height)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) copyPixel(out, x, y, src, x0 + x, y0 + y)
  return out
}

function ellipse(canvas, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx
      const dy = (y - cy) / ry
      if (dx * dx + dy * dy <= 1) canvas.set(x, y, color)
    }
  }
}

function polygon(canvas, points, color) {
  const minY = Math.floor(Math.min(...points.map(p => p[1])))
  const maxY = Math.ceil(Math.max(...points.map(p => p[1])))
  for (let y = minY; y <= maxY; y++) {
    const xs = []
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[(i + 1) % points.length]
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2)
      canvas.rect(Math.ceil(xs[i]), y, Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1, 1, color)
  }
}

function outlineRect(canvas, x, y, width, height, border, fill) {
  canvas.rect(x, y, width, height, border)
  if (width > 2 && height > 2) canvas.rect(x + 1, y + 1, width - 2, height - 2, fill)
}

function hash(x, y, seed = 0) {
  let n = (x * 374761393 + y * 668265263 + seed * 1442695041) >>> 0
  n = (n ^ (n >>> 13)) * 1274126177
  return (n ^ (n >>> 16)) >>> 0
}

function grassTile(kind = 0) {
  const c = new PixelCanvas(TILE, TILE, RAMPS.grass[2])
  const specks = [[4, 6], [12, 23], [22, 8], [27, 25], [7, 16], [18, 28]]
  for (const [x, y] of specks) {
    c.set(x, y, RAMPS.grass[1])
    c.set(x + 1, y - 1, RAMPS.grass[3])
  }
  if (kind === 1) {
    for (const [x, y] of [[8, 10], [18, 17], [25, 7]]) {
      c.line(x, y + 3, x, y, RAMPS.grass[1])
      c.set(x - 1, y + 1, RAMPS.grass[3]); c.set(x + 1, y + 1, RAMPS.grass[3])
    }
  }
  if (kind === 2) {
    for (const [x, y] of [[9, 8], [22, 19], [14, 26]]) {
      c.set(x, y, EXTRA.creamLight); c.set(x - 1, y, RAMPS.grass[4]); c.set(x + 1, y, RAMPS.grass[4]); c.set(x, y + 1, RAMPS.grass[1])
    }
  }
  if (kind === 3) {
    ellipse(c, 19, 11, 2, 2, EXTRA.creamLight)
    c.set(19, 11, RAMPS.dirt[3]); c.line(19, 13, 18, 18, RAMPS.grass[1]); c.set(17, 16, RAMPS.grass[3]); c.set(19, 16, RAMPS.grass[3])
  }
  return c
}

function dirtTile(kind = 0) {
  const c = new PixelCanvas(TILE, TILE, RAMPS.dirt[2])
  for (const [x, y] of [[5, 7], [14, 5], [25, 11], [8, 25], [20, 27], [27, 22]]) c.set(x, y, (x + y) % 2 ? RAMPS.dirt[1] : RAMPS.dirt[3])
  if (kind === 1) {
    for (let y = 4; y < 29; y += 5) {
      c.rect(9, y, 2, 3, RAMPS.dirt[1]); c.rect(22, y + 2, 2, 3, RAMPS.dirt[3])
    }
  }
  if (kind === 2) {
    c.line(22, 27, 23, 20, RAMPS.grass[1]); c.line(23, 25, 27, 22, RAMPS.grass[3]); c.line(23, 24, 20, 21, RAMPS.grass[3])
  }
  if (kind === 3) {
    for (const [x, y] of [[10, 11], [17, 20]]) {
      c.rect(x, y, 2, 3, RAMPS.dirt[4]); c.set(x + 2, y + 2, RAMPS.dirt[1])
    }
  }
  return c
}

function cementTile(kind = 0) {
  const c = new PixelCanvas(TILE, TILE, RAMPS.cement[2])
  for (const [x, y] of [[5, 8], [14, 25], [25, 6], [27, 23], [9, 17]]) c.set(x, y, (x + y) % 2 ? RAMPS.cement[1] : RAMPS.cement[3])
  if (kind === 1) {
    c.line(7, 7, 14, 13, RAMPS.cement[1]); c.line(14, 13, 12, 20, RAMPS.cement[0]); c.line(14, 13, 22, 17, RAMPS.cement[1])
  }
  if (kind === 2) {
    ellipse(c, 16, 16, 10, 10, RAMPS.cement[0]); ellipse(c, 16, 16, 8, 8, RAMPS.cement[1]); ellipse(c, 16, 16, 6, 6, RAMPS.cement[2])
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * i) / 4
      c.line(16 + Math.round(Math.cos(a) * 3), 16 + Math.round(Math.sin(a) * 3), 16 + Math.round(Math.cos(a) * 7), 16 + Math.round(Math.sin(a) * 7), RAMPS.cement[0])
    }
  }
  if (kind === 3) {
    polygon(c, [[7, 11], [22, 9], [26, 15], [23, 22], [10, 21], [6, 17]], RAMPS.cement[1])
    c.line(8, 11, 21, 10, RAMPS.cement[3])
  }
  if (kind === 4) {
    for (const [x, y] of [[3, 25], [6, 27], [9, 24], [12, 29]]) { c.set(x, y, RAMPS.grass[1]); c.set(x + 1, y - 1, RAMPS.grass[2]) }
  }
  if (kind === 5) {
    ellipse(c, 17, 18, 9, 5, RAMPS.water[0]); ellipse(c, 15, 16, 6, 3, RAMPS.water[1]); c.line(10, 14, 16, 13, RAMPS.water[2])
  }
  return c
}

function brickTile(gray = false) {
  const ramp = gray ? RAMPS.cement : RAMPS.brick
  const c = new PixelCanvas(TILE, TILE, ramp[2])
  for (let y = 4; y < 32; y += 8) c.rect(1, y, 30, 1, ramp[1])
  for (let y = 0; y < 32; y += 8) {
    const offset = (y / 8) % 2 ? 8 : 4
    for (let x = offset; x < 31; x += 8) c.rect(x, y + 1, 1, 3, ramp[1])
  }
  for (let y = 2; y < 30; y += 8) c.line(3, y, 6, y + 2, ramp[3])
  return c
}

function utilityGround(kind) {
  if (kind === 'blindLine' || kind === 'blindDot') {
    const c = new PixelCanvas(TILE, TILE, RAMPS.dirt[4])
    if (kind === 'blindLine') for (let x = 4; x < 30; x += 6) c.rect(x, 2, 2, 28, RAMPS.dirt[3])
    else for (let y = 4; y < 30; y += 6) for (let x = 4; x < 30; x += 6) ellipse(c, x, y, 1, 1, RAMPS.dirt[3])
    return c
  }
  if (kind === 'sand') {
    const c = new PixelCanvas(TILE, TILE, RAMPS.dirt[4])
    for (const [x, y] of [[6, 6], [13, 19], [25, 9], [23, 26], [8, 27]]) c.set(x, y, RAMPS.dirt[(x + y) % 2 ? 2 : 3])
    return c
  }
  if (kind === 'pebble') {
    const c = new PixelCanvas(TILE, TILE, RAMPS.cement[1])
    for (let y = 4; y < 31; y += 7) for (let x = 4 + ((y / 7) % 2) * 3; x < 31; x += 8) {
      ellipse(c, x, y, 3, 2, RAMPS.cement[2]); c.set(x - 1, y - 1, RAMPS.cement[3]); c.set(x + 1, y + 1, RAMPS.cement[0])
    }
    return c
  }
  if (kind === 'drain' || kind === 'grate') {
    const c = new PixelCanvas(TILE, TILE, RAMPS.cement[1])
    c.rect(1, 1, 30, 30, RAMPS.cement[0]); c.rect(3, 3, 26, 26, RAMPS.cement[2])
    if (kind === 'drain') for (let y = 5; y < 29; y += 4) c.rect(3, y, 26, 2, RAMPS.cement[0])
    else for (let y = 5; y < 29; y += 6) for (let x = 5; x < 29; x += 6) c.rect(x, y, 3, 3, RAMPS.cement[0])
    return c
  }
  const c = new PixelCanvas(TILE, TILE, RAMPS.cement[0])
  for (const [x, y] of [[7, 8], [24, 17], [14, 25]]) c.set(x, y, RAMPS.cement[1])
  if (kind === 'parking') {
    c.rect(3, 15, 10, 2, RAMPS.dirt[4]); c.rect(15, 15, 7, 2, RAMPS.dirt[4]); c.rect(25, 15, 4, 2, RAMPS.dirt[4])
  }
  return c
}

function makeGroundSheet() {
  const tiles = [
    grassTile(0), grassTile(1), grassTile(2), grassTile(3),
    dirtTile(0), dirtTile(1), dirtTile(2), dirtTile(3),
    cementTile(0), cementTile(1), cementTile(2), cementTile(3), cementTile(4), cementTile(5),
    brickTile(false), brickTile(true), utilityGround('blindLine'), utilityGround('blindDot'),
    utilityGround('sand'), utilityGround('pebble'), utilityGround('drain'), utilityGround('grate'),
    utilityGround('asphalt'), utilityGround('parking'),
  ]
  const sheet = new PixelCanvas(256, 96)
  tiles.forEach((tile, i) => sheet.blit(tile, (i % 8) * TILE, Math.floor(i / 8) * TILE))
  return { sheet, tiles }
}

function quadrant(mask, x, y, style) {
  let u; let v; let vertical; let horizontal; let diagonal
  if (x < 16 && y < 16) { u = x; v = y; vertical = mask & 1; horizontal = mask & 64; diagonal = mask & 128 }
  else if (x >= 16 && y < 16) { u = 31 - x; v = y; vertical = mask & 1; horizontal = mask & 4; diagonal = mask & 2 }
  else if (x < 16) { u = x; v = 31 - y; vertical = mask & 16; horizontal = mask & 64; diagonal = mask & 32 }
  else { u = 31 - x; v = 31 - y; vertical = mask & 16; horizontal = mask & 4; diagonal = mask & 8 }
  const wave = style === 'hard' ? 0 : ((v % 9 === 2) ? 1 : (v % 11 === 5) ? -1 : 0)
  const radius = style === 'soft' ? 9 : 8
  const edge = radius + wave
  if (vertical && horizontal) return diagonal ? true : (u * u + v * v >= radius * radius)
  if (vertical) return u >= edge
  if (horizontal) return v >= edge
  return (u - 15) ** 2 + (v - 15) ** 2 <= (radius + 1) ** 2
}

export function makeBlobTile(mask, foreground, background, style = 'organic') {
  const tile = new PixelCanvas(TILE, TILE, background[2])
  const inside = Array.from({ length: TILE }, () => Array(TILE).fill(false))
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) inside[y][x] = quadrant(mask, x, y, style)
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (!inside[y][x]) {
        if (hash(x, y, mask) % 173 === 0) tile.set(x, y, background[1])
        continue
      }
      const up = y === 0 ? !(mask & 1) : !inside[y - 1][x]
      const left = x === 0 ? !(mask & 64) : !inside[y][x - 1]
      const down = y === TILE - 1 ? !(mask & 16) : !inside[y + 1][x]
      const right = x === TILE - 1 ? !(mask & 4) : !inside[y][x + 1]
      let color = foreground[2]
      if (up || left) color = foreground[3]
      else if (down || right) color = foreground[1]
      else if (hash(x, y, mask + 71) % 181 === 0) color = foreground[3]
      else if (hash(x, y, mask + 19) % 193 === 0) color = foreground[1]
      tile.set(x, y, color)
    }
  }
  return tile
}

function makeBlobSheet(foreground, background, style) {
  const sheet = new PixelCanvas(256, 192)
  const tiles = []
  VALID_MASKS.forEach((mask, i) => {
    const tile = makeBlobTile(mask, foreground, background, style)
    tiles.push(tile)
    sheet.blit(tile, (i % 8) * TILE, Math.floor(i / 8) * TILE)
  })
  return { sheet, tiles }
}

function makeOverlaySheet() {
  const sheet = new PixelCanvas(256, 64)
  const tiles = Array.from({ length: 16 }, () => new PixelCanvas(TILE, TILE))
  const shadowDots = [
    [[8, 9, 5, 3], [22, 18, 6, 4], [14, 26, 4, 2]],
    [[7, 8, 7, 4], [20, 7, 4, 3], [23, 20, 7, 5], [10, 25, 6, 3]],
    [[6, 6, 9, 5], [20, 8, 7, 4], [9, 19, 8, 5], [24, 25, 6, 4]],
    [[3, 4, 8, 4], [10, 10, 9, 5], [19, 17, 10, 6], [25, 27, 6, 3]],
  ]
  shadowDots.forEach((dots, i) => dots.forEach(([x, y, rx, ry]) => ellipse(tiles[i], x, y, rx, ry, EXTRA.canopyShadow)))
  tiles[4].rect(0, 11, 32, 11, RAMPS.dirt[3]); tiles[4].rect(0, 13, 32, 7, RAMPS.dirt[2])
  tiles[5].line(0, 16, 16, 16, RAMPS.dirt[3], 5); tiles[5].line(16, 16, 16, 31, RAMPS.dirt[3], 5); tiles[5].line(1, 16, 16, 16, RAMPS.dirt[2], 3); tiles[5].line(16, 16, 16, 31, RAMPS.dirt[2], 3)
  ellipse(tiles[6], 16, 16, 7, 7, RAMPS.dirt[3]); tiles[6].rect(16, 11, 16, 11, RAMPS.dirt[3]); ellipse(tiles[6], 16, 16, 5, 5, RAMPS.dirt[2]); tiles[6].rect(16, 13, 16, 7, RAMPS.dirt[2])
  tiles[7].rect(0, 11, 32, 11, RAMPS.dirt[3]); tiles[7].rect(11, 0, 11, 32, RAMPS.dirt[3]); tiles[7].rect(0, 13, 32, 7, RAMPS.dirt[2]); tiles[7].rect(13, 0, 7, 32, RAMPS.dirt[2])
  tiles[8].line(5, 24, 13, 18, RAMPS.sky[4]); tiles[8].line(13, 18, 20, 23, RAMPS.sky[4]); tiles[8].line(20, 23, 27, 16, RAMPS.sky[4])
  for (const [x, y, c] of [[9, 12, RAMPS.brick[3]], [14, 19, RAMPS.dirt[4]], [23, 10, RAMPS.brick[4]]]) { tiles[9].set(x, y, c); tiles[9].set(x + 1, y + 1, RAMPS.dirt[1]) }
  ellipse(tiles[10], 16, 16, 3, 3, RAMPS.cement[1]); ellipse(tiles[10], 16, 16, 1, 1, RAMPS.cement[3])
  for (const [x, y] of [[8, 8], [20, 11], [13, 23], [25, 26]]) { tiles[11].set(x, y, RAMPS.dirt[1]); tiles[11].set(x + 1, y, RAMPS.dirt[3]) }
  tiles.forEach((tile, i) => sheet.blit(tile, (i % 8) * TILE, Math.floor(i / 8) * TILE))
  return { sheet, tiles }
}

function makeTree() {
  const c = new PixelCanvas(64, 96)
  c.line(31, 88, 29, 43, RAMPS.dirt[0], 6)
  c.line(31, 88, 31, 43, RAMPS.dirt[2], 4)
  c.line(28, 63, 15, 48, RAMPS.dirt[1], 2)
  c.line(33, 60, 47, 43, RAMPS.dirt[1], 2)
  c.rect(25, 72, 3, 14, RAMPS.dirt[3]); c.rect(35, 65, 2, 18, RAMPS.dirt[0])
  for (const [x, y, rx, ry] of [[18, 30, 17, 20], [35, 22, 20, 18], [49, 36, 14, 19], [30, 43, 22, 17], [12, 45, 11, 13]]) ellipse(c, x, y, rx, ry, RAMPS.foliage[0])
  for (const [x, y, rx, ry] of [[17, 27, 14, 16], [35, 19, 17, 15], [47, 34, 11, 15], [29, 40, 18, 13], [12, 43, 8, 10]]) ellipse(c, x, y, rx, ry, RAMPS.foliage[2])
  for (const [x, y, rx, ry] of [[12, 20, 8, 7], [29, 12, 10, 7], [43, 18, 8, 7], [21, 35, 8, 6]]) ellipse(c, x, y, rx, ry, RAMPS.foliage[3])
  for (const [x, y] of [[10, 17], [26, 9], [38, 14], [17, 31], [45, 27]]) { c.rect(x, y, 5, 2, RAMPS.foliage[4]); c.set(x + 1, y + 2, RAMPS.foliage[3]) }
  for (const [x, y] of [[18, 38], [34, 31], [48, 41], [27, 50], [9, 47]]) c.rect(x, y, 4, 3, RAMPS.foliage[1])
  c.rect(27, 89, 10, 3, RAMPS.dirt[0]); c.rect(30, 88, 4, 4, RAMPS.dirt[2]); c.set(32, 91, RAMPS.dirt[2])
  return c
}

function makeHome() {
  const c = new PixelCanvas(96, 128)
  c.rect(13, 48, 70, 67, EXTRA.creamDark)
  c.rect(14, 49, 57, 65, EXTRA.creamBase)
  c.rect(15, 50, 55, 2, EXTRA.creamLight)
  c.rect(71, 49, 12, 66, RAMPS.dirt[1])
  polygon(c, [[5, 48], [17, 17], [73, 12], [92, 45], [82, 55], [14, 55]], RAMPS.brick[0])
  polygon(c, [[8, 45], [19, 20], [72, 15], [88, 43], [78, 49], [15, 50]], RAMPS.brick[2])
  c.line(19, 21, 72, 16, RAMPS.brick[4]); c.line(14, 49, 78, 48, RAMPS.brick[1])
  for (let x = 20; x < 75; x += 9) c.line(x, 24, x - 6, 45, RAMPS.brick[3])
  outlineRect(c, 22, 73, 22, 42, RAMPS.foliage[0], RAMPS.foliage[2])
  c.rect(26, 82, 14, 2, RAMPS.foliage[1]); c.set(39, 94, RAMPS.dirt[4])
  outlineRect(c, 52, 66, 22, 23, RAMPS.cement[0], RAMPS.sky[2]); c.rect(54, 68, 8, 19, RAMPS.sky[3]); c.rect(64, 68, 8, 19, RAMPS.sky[1]); c.rect(52, 78, 22, 2, RAMPS.cement[0])
  c.rect(53, 91, 20, 3, RAMPS.dirt[1]); c.line(61, 92, 58, 101, RAMPS.foliage[1]); c.set(56, 99, RAMPS.foliage[3]); c.set(60, 98, RAMPS.foliage[3]); c.set(63, 100, RAMPS.foliage[2])
  c.line(17, 61, 46, 61, RAMPS.dirt[0]); c.rect(28, 62, 10, 13, EXTRA.blueBase); c.rect(30, 62, 6, 2, EXTRA.blueLight); c.rect(28, 73, 3, 4, EXTRA.blueDark); c.rect(35, 73, 3, 4, EXTRA.blueDark)
  c.rect(18, 115, 33, 4, RAMPS.cement[1]); c.rect(21, 119, 30, 4, RAMPS.cement[2]); c.rect(24, 123, 27, 3, RAMPS.cement[3])
  return c
}

function makeUnitA() {
  const c = new PixelCanvas(128, 128)
  c.rect(12, 29, 104, 88, EXTRA.creamDark)
  c.rect(13, 30, 88, 86, EXTRA.creamBase)
  c.rect(101, 30, 15, 87, RAMPS.dirt[1])
  polygon(c, [[4, 31], [16, 8], [96, 8], [123, 28], [114, 37], [12, 37]], RAMPS.brick[0])
  polygon(c, [[8, 29], [18, 11], [94, 11], [118, 28], [110, 33], [13, 34]], RAMPS.brick[2])
  c.line(19, 12, 94, 12, RAMPS.brick[4]); c.line(13, 34, 110, 33, RAMPS.brick[1])
  for (let x = 22; x < 103; x += 12) c.line(x, 15, x - 5, 30, RAMPS.brick[3])
  for (let floor = 0; floor < 3; floor++) {
    const y = 42 + floor * 23
    c.rect(14, y + 19, 86, 2, EXTRA.creamDark)
    for (const x of [20, 48, 76]) {
      const lit = (floor + x) % 3 === 0
      outlineRect(c, x, y, 15, 13, RAMPS.cement[0], lit ? RAMPS.sky[3] : RAMPS.sky[1])
      c.rect(x + 7, y + 1, 1, 11, RAMPS.cement[0]); c.rect(x + 1, y + 6, 13, 1, RAMPS.cement[0])
    }
    c.rect(18, y + 14, 70, 3, RAMPS.cement[1]); c.rect(20, y + 17, 66, 2, RAMPS.cement[0])
    if (floor === 0) { c.rect(39, y + 14, 12, 5, EXTRA.blueBase); c.rect(40, y + 14, 10, 1, EXTRA.blueLight) }
    if (floor === 1) { c.rect(67, y + 14, 14, 5, EXTRA.redBase); c.rect(68, y + 14, 12, 1, EXTRA.redLight) }
    if (floor === 2) { c.rect(23, y + 14, 9, 4, EXTRA.creamLight); c.rect(52, y + 15, 4, 3, RAMPS.foliage[2]) }
  }
  outlineRect(c, 47, 91, 24, 26, RAMPS.foliage[0], RAMPS.foliage[2]); c.rect(51, 95, 16, 2, RAMPS.foliage[3]); c.set(67, 104, RAMPS.dirt[4])
  c.rect(42, 117, 35, 4, RAMPS.cement[1]); c.rect(46, 121, 31, 4, RAMPS.cement[2])
  c.rect(108, 47, 7, 10, RAMPS.cement[0]); c.rect(109, 48, 5, 7, RAMPS.cement[3]); c.line(111, 57, 111, 63, RAMPS.cement[0])
  for (let y = 69; y < 115; y += 8) { c.set(102, y, RAMPS.foliage[1]); c.set(103, y - 1, RAMPS.foliage[3]); c.set(104, y + 1, RAMPS.foliage[2]) }
  return c
}

function makeDialogFrame() {
  const c = new PixelCanvas(48, 48)
  c.rect(3, 3, 42, 39, EXTRA.ink); c.rect(4, 4, 40, 37, RAMPS.dirt[3]); c.rect(6, 6, 36, 33, EXTRA.creamLight)
  c.rect(7, 7, 34, 1, EXTRA.creamBase); c.rect(7, 38, 34, 1, EXTRA.creamDark)
  polygon(c, [[8, 41], [17, 41], [9, 47]], EXTRA.ink); polygon(c, [[9, 41], [15, 41], [10, 45]], EXTRA.creamLight)
  for (const [x, y] of [[3, 3], [44, 3], [3, 41], [44, 41]]) c.set(x, y, EXTRA.clear)
  return c
}

function heartMask(x, y) {
  const left = ((x - 9) / 5) ** 2 + ((y - 10) / 4) ** 2 <= 1
  const right = ((x - 17) / 5) ** 2 + ((y - 10) / 4) ** 2 <= 1
  const lower = y >= 9 && y <= 22 && Math.abs(x - 13) <= 12 - Math.floor(y / 2)
  return left || right || lower
}

function drawHeart(c) {
  for (let y = 4; y < 24; y++) for (let x = 3; x < 25; x++) if (heartMask(x, y)) {
    const color = x < 13 && y < 12 ? RAMPS.brick[4] : x > 17 || y > 17 ? RAMPS.brick[1] : RAMPS.brick[2]
    c.set(x, y, color)
  }
  c.rect(8, 7, 4, 2, RAMPS.brick[4])
}

function makeIceHeart(stage) {
  const c = new PixelCanvas(28, 28)
  drawHeart(c)
  if (stage <= 2) {
    polygon(c, [[13, 1], [24, 7], [25, 18], [17, 26], [7, 24], [2, 15], [5, 5]], RAMPS.sky[1])
    polygon(c, [[12, 3], [21, 7], [22, 15], [15, 22], [8, 21], [5, 14], [7, 7]], RAMPS.sky[3])
    c.line(7, 7, 13, 3, RAMPS.sky[4]); c.line(5, 14, 8, 21, RAMPS.sky[2])
    if (stage >= 1) c.line(14, 4, 12, 12, RAMPS.sky[0])
    if (stage >= 2) { c.line(12, 12, 7, 17, RAMPS.sky[0]); c.line(12, 12, 17, 19, RAMPS.sky[0]); c.rect(12, 11, 3, 4, RAMPS.brick[2]) }
  } else if (stage === 3) {
    polygon(c, [[3, 7], [11, 3], [12, 13], [7, 21], [3, 16]], RAMPS.sky[2]); c.line(5, 7, 10, 4, RAMPS.sky[4])
    polygon(c, [[17, 3], [24, 8], [23, 15], [18, 13]], RAMPS.sky[1]); c.set(20, 6, RAMPS.sky[4])
    polygon(c, [[8, 21], [15, 18], [19, 24], [13, 26]], RAMPS.sky[1])
  } else if (stage === 4) {
    polygon(c, [[4, 8], [9, 5], [10, 12], [6, 15]], RAMPS.sky[3]); c.set(6, 7, RAMPS.sky[4])
    polygon(c, [[19, 16], [24, 18], [21, 23], [17, 21]], RAMPS.sky[1]); c.set(21, 18, RAMPS.sky[3])
    c.rect(8, 22, 4, 3, RAMPS.sky[2])
  } else {
    for (const [x, y] of [[7, 7], [21, 8], [4, 14], [23, 16], [12, 25]]) c.set(x, y, EXTRA.gold)
  }
  return c
}

function makeIceSheet() {
  const c = new PixelCanvas(168, 28)
  for (let i = 0; i < 6; i++) c.blit(makeIceHeart(i), i * 28, 0)
  return c
}

function maskFromGrid(grid, x, y) {
  if (!grid[y]?.[x]) return null
  const same = (dx, dy) => Boolean(grid[y + dy]?.[x + dx])
  let mask = 0
  const n = same(0, -1); const e = same(1, 0); const s = same(0, 1); const w = same(-1, 0)
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

function drawTerrainMap(canvas, grid, blobTiles, backgroundTile, dx = 0, dy = 0) {
  for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
    const tile = grid[y][x] ? blobTiles[VALID_MASKS.indexOf(maskFromGrid(grid, x, y))] : backgroundTile
    blitVisible(canvas, tile, dx + x * TILE, dy + y * TILE)
  }
}

function makeCraftSample(assets) {
  const c = new PixelCanvas(320, 180, EXTRA.creamBase)
  c.rect(0, 0, 320, 4, RAMPS.sky[2]); c.rect(0, 176, 320, 4, RAMPS.dirt[1])
  const grid = [[false, true, true], [false, true, false], [false, false, false]]
  drawTerrainMap(c, grid, assets.grassCement.tiles, assets.groundTiles[8], 8, 8)
  blitVisible(c, assets.tree, 106, 1)
  c.rect(176, 8, 62, 40, EXTRA.creamDark); c.rect(177, 9, 60, 38, EXTRA.creamBase); c.rect(177, 9, 60, 2, EXTRA.creamLight)
  c.rect(183, 16, 46, 25, RAMPS.dirt[0]); c.rect(185, 18, 42, 21, RAMPS.dirt[3]); c.rect(188, 21, 36, 15, EXTRA.creamLight)
  c.rect(180, 46, 55, 3, RAMPS.cement[1])
  ellipse(c, 126, 127, 17, 13, RAMPS.cement[0]); ellipse(c, 126, 127, 13, 9, RAMPS.cement[2]); ellipse(c, 126, 127, 8, 5, RAMPS.cement[4])
  c.line(111, 113, 141, 143, RAMPS.brick[2], 1); c.line(141, 113, 111, 143, RAMPS.brick[2], 1)
  ellipse(c, 166, 127, 17, 13, RAMPS.cement[0]); ellipse(c, 164, 124, 14, 10, RAMPS.cement[2]); c.rect(151, 116, 15, 4, RAMPS.cement[4]); c.rect(176, 130, 5, 6, RAMPS.cement[1])
  c.line(151, 145, 159, 151, RAMPS.grass[3], 1); c.line(159, 151, 181, 137, RAMPS.grass[3], 1)
  const boy = crop(loadPng(join(OUT, 'boy_idle_down_2f_48x64.png')), 0, 0, 48, 64)
  const girl = crop(loadPng(join(OUT, 'girl_idle_down_2f_48x64.png')), 0, 0, 48, 64)
  blitVisible(c, boy, 205, 102, 'opaque'); blitVisible(c, girl, 254, 106, 'opaque')
  return c
}

function makeWorldSample(assets) {
  const c = new PixelCanvas(360, 640, RAMPS.grass[2])
  const cols = 12; const rows = 20
  const grid = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
    const verticalRoad = x === 5 || x === 6
    const courtyard = y >= 3 && y <= 6 && x >= 3 && x <= 8
    const crossRoad = y >= 9 && y <= 10
    return !(verticalRoad || courtyard || crossRoad)
  }))
  drawTerrainMap(c, grid, assets.grassCement.tiles, assets.groundTiles[8])
  blitVisible(c, assets.overlayTiles[4], 64, 224); blitVisible(c, assets.overlayTiles[4], 96, 224); blitVisible(c, assets.overlayTiles[5], 128, 224)
  blitVisible(c, assets.overlayTiles[2], 264, 263, 'canopy'); blitVisible(c, assets.overlayTiles[1], 296, 263, 'canopy')
  blitVisible(c, assets.unit, 116, 26)
  blitVisible(c, assets.home, 18, 207)
  blitVisible(c, assets.tree, 262, 184)
  const boy = crop(loadPng(join(OUT, 'boy_idle_down_2f_48x64.png')), 0, 0, 48, 64)
  const girl = crop(loadPng(join(OUT, 'girl_idle_down_2f_48x64.png')), 0, 0, 48, 64)
  blitVisible(c, boy, 142, 101, 'opaque'); blitVisible(c, girl, 187, 105, 'opaque')
  c.rect(18, 370, 48, 18, RAMPS.dirt[1]); c.rect(20, 368, 44, 18, RAMPS.dirt[3]); c.rect(22, 370, 40, 14, RAMPS.dirt[4])
  for (const [x, y] of [[24, 414], [88, 532], [301, 455], [338, 585]]) {
    c.line(x, y + 4, x, y, RAMPS.grass[1]); c.set(x - 1, y + 1, RAMPS.grass[3]); c.set(x + 1, y + 2, RAMPS.grass[3])
  }
  return c
}

function savePalette() {
  const manifest = paletteManifest()
  const strip = new PixelCanvas(64, 1)
  manifest.colors.forEach((entry, i) => strip.set(i, 0, entry.hex))
  savePng(join(OUT, 'palette_v2_64x1.png'), strip)
  writeFileSync(join(OUT, 'palette_v2.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

function main() {
  const manifest = savePalette()
  const ground = makeGroundSheet()
  const grassCement = makeBlobSheet(RAMPS.grass, RAMPS.cement, 'organic')
  const grassDirt = makeBlobSheet(RAMPS.grass, RAMPS.dirt, 'soft')
  const dirtCement = makeBlobSheet(RAMPS.dirt, RAMPS.cement, 'hard')
  const overlay = makeOverlaySheet()
  const tree = makeTree()
  const home = makeHome()
  const unit = makeUnitA()
  const dialog = makeDialogFrame()
  const ice = makeIceSheet()
  const assets = { manifest, groundTiles: ground.tiles, grassCement, grassDirt, dirtCement, overlayTiles: overlay.tiles, tree, home, unit, dialog, ice }

  const outputs = [
    ['tileset_ground_base_v2_256x96.png', ground.sheet],
    ['autotile_grass_on_cement_47t_256x192.png', grassCement.sheet],
    ['autotile_grass_on_dirt_47t_256x192.png', grassDirt.sheet],
    ['autotile_dirt_on_cement_47t_256x192.png', dirtCement.sheet],
    ['tileset_ground_overlay_v2_256x64.png', overlay.sheet],
    ['prop_wutong_tree_64x96.png', tree],
    ['bld_home_96x128.png', home],
    ['bld_unit_a_128x128.png', unit],
    ['ui_dialog_frame_48x48.png', dialog],
    ['ui_ice_heart_6s_28x28.png', ice],
    ['d2_craft_sample_320x180.png', makeCraftSample(assets)],
    ['d2_p0_world_sample_360x640.png', makeWorldSample(assets)],
  ]
  outputs.forEach(([name, canvas]) => savePng(join(OUT, name), canvas))
  console.log(`D2 P0 generated: ${outputs.length + 2} files, ${manifest.opaqueCount}/64 opaque colors`)
}

main()
