import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPng, PixelCanvas, savePng, sheet } from './pixel-core.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '../../public/assets')
const QA = join(ROOT, '../../docs/art-qa')

const C = Object.freeze({
  clear: '#00000000',
  shadow: '#00000040',
  ink: '#1f1a17',
  white: '#faf7f0',
  paper: '#efe6d5',
  paperDark: '#d8cdb8',
  wall: '#cfc6b0',
  wallLight: '#ddd6c2',
  wallDark: '#b3a88e',
  stain: '#a68f72',
  skirt: '#5f7355',
  skirtLight: '#75866a',
  skirtDark: '#44563f',
  cement: '#8a8580',
  cementLight: '#a7a29a',
  damp: '#4a4a44',
  rust: '#8f5f4a',
  wood: '#8a6a52',
  woodLight: '#a98568',
  woodDark: '#5a4436',
  red: '#c4554d',
  redLight: '#d97d70',
  redDark: '#8f3d38',
  blue: '#4a6fa5',
  blueLight: '#6b8fc2',
  blueDark: '#33507c',
  green: '#6a994e',
  greenLight: '#8ab866',
  greenDark: '#416a39',
  yellow: '#f2cc8f',
  orange: '#d98a45',
  bottle: '#526f58',
  black: '#2b2028',
})

function box(c, x, y, w, h, light, base, dark) {
  c.rect(x, y, w, h, dark)
  if (w > 2 && h > 2) c.rect(x + 1, y + 1, w - 2, h - 2, base)
  if (w > 4) c.rect(x + 2, y + 1, w - 3, 1, light)
  if (h > 4) c.rect(x + 1, y + 2, 1, h - 3, light)
}

function dotCluster(c, x, y, color, points) {
  points.forEach(([dx, dy]) => c.set(x + dx, y + dy, color))
}

function ellipse(c, cx, cy, rx, ry, color) {
  for (let y = -ry; y <= ry; y++) {
    const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry || 1))))
    c.rect(cx - span, cy + y, span * 2 + 1, 1, color)
  }
}

function blitOver(target, source, dx, dy) {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const i = (y * source.width + x) * 4
      const alpha = source.pixels[i + 3]
      if (alpha === 0) continue
      const di = ((dy + y) * target.width + dx + x) * 4
      if (alpha === 255 || target.pixels[di + 3] === 0) target.pixels.set(source.pixels.subarray(i, i + 4), di)
      else {
        const a = alpha / 255
        for (let channel = 0; channel < 3; channel++)
          target.pixels[di + channel] = Math.round(source.pixels[i + channel] * a + target.pixels[di + channel] * (1 - a))
        target.pixels[di + 3] = 255
      }
    }
  }
}

// ---------- 三款墙面基底 ----------
function wallBase(kind) {
  const c = new PixelCanvas(360, 90, C.wall)
  c.rect(0, 0, 360, 3, C.wallLight)
  c.rect(0, 57, 360, 3, C.wallDark)
  c.rect(0, 60, 360, 30, C.skirt)
  c.rect(0, 60, 360, 2, C.skirtLight)
  c.rect(0, 87, 360, 3, C.skirtDark)

  // 每款都保留大块、低对比的像素色斑，避免纯色平涂。
  const pale = kind === 0
    ? [[25, 15, 66, 10], [142, 33, 82, 12], [282, 10, 54, 15]]
    : kind === 1
      ? [[12, 8, 78, 13], [116, 38, 60, 15], [220, 12, 112, 11], [294, 43, 45, 12]]
      : [[18, 7, 92, 16], [125, 28, 88, 18], [252, 8, 74, 19]]
  pale.forEach(([x, y, w, h], i) => c.rect(x, y, w, h, i % 2 ? C.wallDark : C.wallLight))

  if (kind === 0) {
    c.rect(278, 73, 18, 9, C.cement)
    c.rect(282, 70, 10, 4, C.cement)
    c.rect(279, 72, 9, 2, C.cementLight)
  }
  if (kind === 1) {
    c.rect(67, 65, 36, 17, C.cement)
    c.rect(75, 62, 19, 5, C.cement)
    c.rect(205, 77, 29, 10, C.cement)
    c.rect(218, 73, 12, 5, C.cement)
    c.rect(300, 66, 17, 12, C.cement)
    c.rect(169, 0, 8, 58, C.stain)
    c.rect(166, 18, 14, 25, C.stain)
    c.rect(169, 0, 2, 56, C.wallDark)
  }
  if (kind === 2) {
    c.rect(0, 79, 360, 11, C.damp)
    c.rect(18, 70, 92, 16, C.cement)
    c.rect(43, 63, 49, 9, C.cement)
    c.rect(144, 66, 71, 20, C.cement)
    c.rect(162, 60, 39, 8, C.cement)
    c.rect(267, 72, 72, 14, C.cement)
    c.rect(288, 65, 33, 9, C.cement)
    c.rect(9, 84, 117, 6, C.damp)
    c.rect(236, 82, 124, 8, C.damp)
    c.line(108, 4, 132, 23, C.damp)
    c.line(132, 23, 120, 37, C.damp)
    c.line(132, 23, 148, 33, C.damp)
    c.line(120, 37, 126, 55, C.damp)
  }
  return c
}

// ---------- 五款门，每款普通/塞传单 ----------
function flyer(c) {
  c.rect(11, 62, 16, 8, C.ink)
  c.rect(10, 61, 15, 8, C.white)
  c.rect(11, 62, 12, 1, C.blue)
  c.line(24, 61, 27, 65, C.paperDark)
}

function doorFrame(kind, stuffed) {
  const c = new PixelCanvas(40, 72)
  c.rect(1, 0, 38, 72, C.cement)
  c.rect(2, 1, 36, 70, C.cementLight)
  const palettes = [
    [C.redLight, C.rust, C.redDark],
    [C.skirtLight, C.skirt, C.skirtDark],
    [C.cementLight, C.cement, C.damp],
    [C.blueLight, C.blueDark, C.ink],
    [C.red, C.redDark, C.ink],
  ]
  const [light, base, dark] = palettes[kind]
  box(c, 3, 2, 34, 69, light, base, dark)
  c.rect(5, 4, 2, 64, light)
  c.set(20, 17, C.ink)
  c.set(20, 16, C.yellow)

  if (kind === 0) {
    c.rect(16, 5, 8, 8, C.redDark)
    c.rect(18, 7, 4, 4, C.redLight) // 福字色块
    c.rect(30, 34, 4, 9, C.ink)
    c.rect(29, 35, 4, 2, C.yellow)
  }
  if (kind === 1) {
    c.rect(0, 1, 3, 70, C.redDark)
    c.rect(37, 1, 3, 70, C.redDark)
    c.rect(1, 3, 2, 8, C.redLight)
    c.rect(37, 3, 2, 8, C.redLight)
    c.rect(26, 31, 7, 2, C.ink)
    c.rect(30, 32, 3, 6, C.yellow)
  }
  if (kind === 2) {
    for (let x = 8; x < 36; x += 6) c.rect(x, 4, 2, 64, x < 16 ? light : dark)
    c.rect(28, 30, 3, 13, C.yellow)
    c.rect(27, 31, 5, 3, C.ink)
  }
  if (kind === 3) {
    c.rect(5, 56, 28, 5, dark)
    c.rect(8, 57, 21, 2, base)
    c.rect(10, 45, 5, 4, C.redLight)
    c.rect(14, 48, 6, 3, C.yellow)
    c.rect(29, 33, 4, 9, C.cementLight)
  }
  if (kind === 4) {
    c.rect(9, 20, 21, 17, C.ink)
    c.rect(11, 22, 17, 13, C.redLight)
    for (let x = 13; x < 28; x += 5) c.rect(x, 21, 2, 15, C.redDark)
    c.rect(15, 0, 10, 3, C.ink)
    c.rect(18, 0, 4, 4, C.yellow) // 八卦镜小圆镜
    c.rect(30, 39, 4, 8, C.ink)
  }
  if (stuffed) flyer(c)
  return c
}

// ---------- 24个地面道具 ----------
function prop(index, wide = false) {
  const w = wide ? 48 : 32
  const c = new PixelCanvas(w, 32)
  const ground = () => c.rect(3, 29, w - 6, 2, C.shadow)
  const wheel = (x, y, r = 3) => {
    ellipse(c, x, y, r, r, C.ink)
    ellipse(c, x, y, Math.max(1, r - 1), Math.max(1, r - 1), C.cement)
    c.set(x, y, C.ink)
  }

  if (index === 1) {
    ground(); box(c, 3, 8, 26, 19, C.woodLight, C.wood, C.woodDark)
    c.rect(5, 13, 22, 2, C.woodDark); c.rect(5, 20, 22, 2, C.woodDark)
    ;[[6, 10, C.red], [14, 10, C.blue], [7, 17, C.paper], [19, 17, C.green], [12, 24, C.black]].forEach(([x, y, k]) => { c.rect(x, y, 6, 3, k); c.rect(x + 4, y + 2, 4, 2, C.ink) })
  }
  if (index === 2 || index === 3) {
    ground(); const base = index === 2 ? C.red : C.blue
    box(c, 3, 19, 26, 9, index === 2 ? C.redLight : C.blueLight, base, index === 2 ? C.redDark : C.blueDark)
    if (index === 2) { c.rect(8, 22, 16, 1, C.yellow); c.rect(10, 25, 12, 1, C.redDark) }
    else for (let x = 6; x < 28; x += 5) c.rect(x, 20, 2, 7, C.paperDark)
  }
  if (index === 4) {
    ground(); box(c, 3, 14, 16, 14, C.paper, C.woodLight, C.woodDark); box(c, 17, 17, 12, 11, C.paper, C.wood, C.woodDark); box(c, 10, 6, 13, 10, C.paper, C.woodLight, C.woodDark)
    c.rect(11, 10, 10, 2, C.red); c.rect(6, 20, 10, 1, C.ink)
  }
  if (index === 5) {
    ground(); [[8, 24], [16, 24], [24, 24], [12, 17], [20, 17], [16, 10]].forEach(([x, y]) => { ellipse(c, x, y, 5, 4, C.ink); c.set(x - 2, y, C.cement); c.set(x + 2, y, C.cement); c.set(x, y - 2, C.cement) })
  }
  if (index === 6) {
    ground(); [[9, 23], [17, 22], [24, 24]].forEach(([x, y]) => { ellipse(c, x, y, 6, 6, C.greenDark); c.rect(x - 3, y - 4, 3, 7, C.greenLight); c.line(x, y - 5, x + 3, y + 4, C.white) })
  }
  if (index === 7) {
    ground(); box(c, 3, 12, 11, 16, C.yellow, C.orange, C.rust); c.rect(6, 8, 5, 5, C.ink)
    ;[18, 23, 28].forEach((x, i) => { c.rect(x, 15 + i, 4, 12 - i, C.ink); c.rect(x + 1, 17 + i, 2, 8 - i, C.bottle); c.rect(x + 1, 12 + i, 2, 4, C.paper) })
  }
  if (index === 8) {
    ground(); box(c, 15, 17, 14, 11, C.redLight, C.red, C.redDark); c.line(5, 2, 12, 27, C.woodDark, 1); c.rect(2, 3, 8, 4, C.paperDark); c.line(20, 15, 27, 12, C.ink)
  }
  if (index === 9) {
    ground(); c.line(8, 2, 16, 27, C.wood, 1); c.line(20, 5, 20, 27, C.cement, 1); c.rect(13, 23, 9, 6, C.yellow); for (let x = 13; x < 23; x += 2) c.line(9, 17, x, 29, C.woodLight)
  }
  if (index === 10 || index === 11 || index === 12) {
    ground(); box(c, 10, 20, 13, 9, C.redLight, C.rust, C.redDark); c.rect(8, 19, 17, 3, C.woodDark)
    if (index === 10) { c.line(16, 20, 16, 7, C.greenDark); [[12, 8], [20, 9], [10, 13], [22, 14], [13, 18], [24, 20]].forEach(([x, y]) => ellipse(c, x, y, 3, 2, C.green)) }
    if (index === 11) { c.line(16, 20, 16, 6, C.greenDark); c.line(16, 10, 9, 14, C.greenDark); c.line(16, 12, 23, 16, C.greenDark); [[9, 15], [22, 17], [14, 9]].forEach(([x, y]) => c.rect(x, y, 3, 5, C.red)) }
    if (index === 12) { c.rect(11, 21, 11, 3, C.damp); c.line(25, 8, 19, 25, C.cement, 1); c.rect(22, 6, 6, 5, C.cementLight) }
  }
  if (index === 13) {
    ground(); wheel(7, 25, 4); wheel(25, 25, 4); c.line(7, 25, 15, 15, C.red, 1); c.line(15, 15, 25, 25, C.red, 1); c.line(10, 20, 23, 20, C.yellow, 1); c.rect(12, 9, 8, 6, C.red); c.line(19, 10, 25, 8, C.ink)
  }
  if (index === 14) {
    ground(); wheel(9, 27, 3); wheel(25, 27, 3); c.line(7, 6, 12, 24, C.ink, 1); box(c, 9, 10, 17, 13, C.blueLight, C.blue, C.blueDark); c.line(25, 11, 29, 5, C.ink, 1)
  }
  if (index === 15) {
    ground(); c.rows(6, [[10, 12], [8, 16], [7, 18], [6, 20], [6, 20], [5, 22], [5, 22], [5, 22], [5, 22], [5, 22], [5, 22], [5, 22], [5, 22], [6, 20], [7, 18], [9, 14], [11, 10], [13, 6], [14, 4], [15, 2], [15, 2], [14, 4]], C.paperDark); c.rect(9, 10, 15, 14, C.paper); c.rect(11, 14, 11, 2, C.red); c.rect(12, 19, 9, 1, C.wood)
  }
  if (index === 16) {
    ground(); box(c, 3, 16, 26, 12, C.greenLight, C.green, C.greenDark); for (let x = 6; x < 28; x += 5) { c.rect(x, 8 + (x % 2), 3, 15, C.ink); c.rect(x + 1, 10, 1, 11, C.bottle); c.rect(x, 7 + (x % 2), 3, 2, C.paper) }
  }
  if (index === 17) {
    ground(); c.line(8, 5, 12, 28, C.ink, 1); c.line(19, 3, 21, 28, C.ink, 1); c.rows(4, [[5, 8], [3, 12], [2, 14], [4, 10]], C.red); c.rows(2, [[17, 7], [15, 11], [14, 13], [16, 9]], C.blue); ellipse(c, 17, 29, 11, 2, C.blueLight)
  }
  if (index === 18) {
    ground(); box(c, 3, 20, 26, 9, C.white, C.paper, C.paperDark); for (let x = 7; x < 28; x += 5) { c.line(x, 21, x - 1, 8 - (x % 3), C.greenDark); c.rect(x - 2, 7 - (x % 3), 3, 8, C.greenLight) }
  }
  if (index === 19) {
    ground(); box(c, 7, 13, 19, 15, C.white, C.cementLight, C.cement); c.rect(9, 9, 15, 6, C.paper); c.rect(11, 10, 11, 2, C.white); c.rect(12, 18, 9, 4, C.damp); c.set(23, 19, C.red)
  }
  if (index === 20) {
    ground(); ellipse(c, 16, 23, 14, 8, C.woodDark); ellipse(c, 16, 22, 11, 6, C.woodLight); ellipse(c, 16, 22, 8, 4, C.redDark); c.rect(10, 20, 12, 3, C.paperDark)
  }
  if (index === 21) {
    ground(); ellipse(c, 9, 25, 7, 4, C.blueDark); ellipse(c, 9, 24, 5, 2, C.white); c.line(18, 22, 28, 27, C.paperDark); c.line(18, 27, 28, 22, C.paperDark); c.set(23, 24, C.white)
  }
  if (index === 22) {
    ground(); const sx = wide ? 2 : 1; const ex = wide ? 45 : 30
    wheel(sx + 6, 27, 4); wheel(ex - 5, 27, 4); c.line(sx + 6, 26, sx + 15, 15, C.red, 1); c.line(sx + 15, 15, ex - 5, 24, C.red, 1); c.rect(sx + 11, 13, wide ? 20 : 11, 9, C.red); c.rect(sx + 13, 14, wide ? 17 : 8, 3, C.redLight); c.line(ex - 6, 23, ex - 8, 5, C.ink, 1); c.line(ex - 10, 5, ex - 4, 5, C.ink); c.set(ex - 3, 3, C.blueLight)
  }
  if (index === 23) {
    ground(); const left = wide ? 7 : 5; const right = wide ? 40 : 27
    wheel(left, 26, 6); wheel(right, 26, 6); const mid = Math.floor((left + right) / 2); c.line(left, 26, mid - 4, 15, C.ink, 1); c.line(mid - 4, 15, right, 26, C.ink, 1); c.line(left, 26, mid + 4, 25, C.ink, 1); c.line(mid + 4, 25, mid - 4, 15, C.ink, 1); c.line(mid - 5, 14, mid + 4, 14, C.ink, 1); c.line(right, 26, right - 3, 6, C.ink, 1); c.line(right - 7, 6, right + 1, 6, C.ink); c.rect(mid - 7, 11, 9, 3, C.wood)
  }
  if (index === 24) {
    ground(); c.rows(7, [[5, 10], [4, 12], [3, 14], [3, 14], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [2, 16], [3, 14], [4, 12], [5, 10], [7, 6], [8, 4], [8, 4], [7, 6], [6, 8]], C.paperDark); c.rows(10, [[18, 8], [17, 10], [16, 12], [16, 12], [15, 14], [15, 14], [15, 14], [15, 14], [15, 14], [15, 14], [15, 14], [15, 14], [15, 14], [16, 12], [17, 10], [18, 8], [20, 4], [20, 4]], C.redDark); c.line(7, 9, 13, 28, C.red); c.line(18, 13, 27, 27, C.yellow)
  }
  return c
}

const walls = [0, 1, 2].map(wallBase)
const doors = []
for (let kind = 0; kind < 5; kind++) doors.push(doorFrame(kind, false), doorFrame(kind, true))
const props = Array.from({ length: 24 }, (_, i) => prop(i + 1))
const vehicles = [prop(22, true), prop(23, true)]
const boySheet = loadPng(join(OUT, 'boy_idle_down_2f_48x64.png'))
const boy = new PixelCanvas(48, 64)
for (let y = 0; y < 64; y++) {
  const start = (y * boySheet.width) * 4
  boy.pixels.set(boySheet.pixels.subarray(start, start + 48 * 4), y * 48 * 4)
}

savePng(join(OUT, 'wall_base_3s_360x90.png'), sheet(walls))
savePng(join(OUT, 'door_variants_5x2_40x72.png'), sheet(doors))
// sheet()只会横排；重组为8×3网格。
const propGrid = new PixelCanvas(256, 96)
props.forEach((p, i) => blitOver(propGrid, p, (i % 8) * 32, Math.floor(i / 8) * 32))
savePng(join(OUT, 'props_floor_sheet.png'), propGrid)
savePng(join(OUT, 'props_floor_vehicles_2s_48x32.png'), sheet(vehicles))

// 首轮组合预览：三款墙面、门与道具混搭，验证同世界感和角色比例。
const preview = new PixelCanvas(360, 270, C.wall)
const sampleProps = [[0, 9, 17], [3, 6, 12], [4, 14, 23]]
const propX = [[4, 236, 270], [6, 238, 274], [8, 232, 276]]
for (let row = 0; row < 3; row++) {
  preview.blit(walls[row], 0, row * 90)
  blitOver(preview, doors[row * 2], 62, row * 90 + 18)
  blitOver(preview, doors[((row + 2) % 5) * 2], 182, row * 90 + 18)
  sampleProps[row].forEach((pi, i) => blitOver(preview, props[pi], propX[row][i], row * 90 + 58))
  blitOver(preview, boy, 130, row * 90 + 26)
}
savePng(join(QA, 'b2-priority-combination-preview.png'), preview)

console.log('Generated B2 priority assets: wall bases, 5x2 doors, 24 floor props, and detailed vehicles')
