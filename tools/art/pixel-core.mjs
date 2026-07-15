import { deflateSync, inflateSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export const P = Object.freeze({
  clear: '#00000000',
  shadow: '#00000040',

  hairLight: '#5a4a56',
  hairBase: '#2b2028',
  hairDark: '#1f1a17',

  skinLight: '#f4d1ae',
  skinBase: '#d9a97c',
  skinDark: '#c9926b',
  skinEdge: '#8f5f4a',

  blueLight: '#6b8fc2',
  blueBase: '#4a6fa5',
  blueDark: '#33507c',

  creamLight: '#fffdf6',
  creamBase: '#efe6d5',
  creamDark: '#d8cdb8',

  redLight: '#d97d70',
  redBase: '#c4554d',
  redDark: '#8f3d38',

  pantsLight: '#5a4a56',
  pantsBase: '#4a3c46',
  pantsDark: '#1f1a17',

  mouth: '#a6524a',
  blush: '#e8a598',
  eye: '#1f1a17',
  eyeGlint: '#ffffff',
  clip: '#f2cc8f',
})

const rgbaCache = new Map()
function rgba(hex) {
  if (rgbaCache.has(hex)) return rgbaCache.get(hex)
  const raw = hex.slice(1)
  const value = raw.length === 6 ? `${raw}ff` : raw
  const color = [0, 2, 4, 6].map(i => Number.parseInt(value.slice(i, i + 2), 16))
  rgbaCache.set(hex, color)
  return color
}

export class PixelCanvas {
  constructor(width, height, fill = P.clear) {
    this.width = width
    this.height = height
    this.pixels = new Uint8Array(width * height * 4)
    this.fill(fill)
  }

  fill(color) {
    const c = rgba(color)
    for (let i = 0; i < this.pixels.length; i += 4) this.pixels.set(c, i)
  }

  set(x, y, color) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.pixels.set(rgba(color), (y * this.width + x) * 4)
  }

  rect(x, y, width, height, color) {
    for (let yy = y; yy < y + height; yy++)
      for (let xx = x; xx < x + width; xx++) this.set(xx, yy, color)
  }

  rows(y, spans, color, dx = 0) {
    spans.forEach(([x, width], index) => this.rect(x + dx, y + index, width, 1, color))
  }

  line(x0, y0, x1, y1, color, radius = 0) {
    x0 = Math.round(x0); y0 = Math.round(y0)
    x1 = Math.round(x1); y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const sx = x0 < x1 ? 1 : -1
    const dy = -Math.abs(y1 - y0)
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    while (true) {
      this.rect(x0 - radius, y0 - radius, radius * 2 + 1, radius * 2 + 1, color)
      if (x0 === x1 && y0 === y1) break
      const e2 = err * 2
      if (e2 >= dy) { err += dy; x0 += sx }
      if (e2 <= dx) { err += dx; y0 += sy }
    }
  }

  blit(source, dx, dy) {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const si = (y * source.width + x) * 4
        const di = ((dy + y) * this.width + dx + x) * 4
        this.pixels.set(source.pixels.subarray(si, si + 4), di)
      }
    }
  }
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, checksum])
}

export function encodePng(canvas) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(canvas.width, 0)
  header.writeUInt32BE(canvas.height, 4)
  header[8] = 8
  header[9] = 6
  const rows = []
  const stride = canvas.width * 4
  for (let y = 0; y < canvas.height; y++) {
    rows.push(Buffer.from([0]))
    rows.push(Buffer.from(canvas.pixels.subarray(y * stride, (y + 1) * stride)))
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export function savePng(path, canvas) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, encodePng(canvas))
}

/** 读取本工具生成的RGBA PNG（8-bit、filter 0），供组合预览复用已有精灵。 */
export function loadPng(path) {
  const png = readFileSync(path)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (!png.subarray(0, 8).equals(signature)) throw new Error(`not a PNG: ${path}`)
  let offset = 8
  let width = 0
  let height = 0
  const idat = []
  while (offset < png.length) {
    const size = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const data = png.subarray(offset + 8, offset + 8 + size)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[9] !== 6) throw new Error(`expected 8-bit RGBA PNG: ${path}`)
    }
    if (type === 'IDAT') idat.push(data)
    offset += size + 12
    if (type === 'IEND') break
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const out = new PixelCanvas(width, height)
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1)
    if (raw[row] !== 0) throw new Error(`unsupported PNG filter ${raw[row]}: ${path}`)
    out.pixels.set(raw.subarray(row + 1, row + 1 + stride), y * stride)
  }
  return out
}

export function sheet(frames) {
  const out = new PixelCanvas(frames[0].width * frames.length, frames[0].height)
  frames.forEach((frame, index) => out.blit(frame, index * frame.width, 0))
  return out
}
