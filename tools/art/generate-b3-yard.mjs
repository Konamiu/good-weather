import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PixelCanvas, savePng, sheet } from './pixel-core.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '../../public/assets')
const QA = join(ROOT, '../../docs/art-qa')

const C = Object.freeze({
  clear: '#00000000', shadow: '#00000040', ink: '#1f1a17',
  skyTop: '#7db8d8', sky: '#a8d8e8', skyLow: '#c8e8f0',
  cloud: '#faf7f0', cloudMid: '#e8edf0', cloudDark: '#c6d8df',
  far1: '#92aeb1', far2: '#78989a', far3: '#667f80', smoke: '#c5d2d1',
  wall: '#d7c598', wallLight: '#eadbb3', wallDark: '#b29d70', stain: '#9c8763',
  brick: '#a85f50', cement: '#8a8580', cementLight: '#aaa49a', cementDark: '#5c5a58',
  glass: '#79abc1', glassLight: '#b8dfe8', glassDark: '#416779',
  green: '#6a994e', greenLight: '#8ab866', greenDark: '#416a39',
  red: '#c4554d', redLight: '#d97d70', redDark: '#8f3d38',
  blue: '#4a6fa5', blueLight: '#6b8fc2', blueDark: '#33507c',
  yellow: '#f2cc8f', orange: '#d98a45', white: '#faf7f0', cream: '#efe6d5',
  hair: '#2b2028', hairLight: '#5a4a56', skin: '#d9a97c', skinLight: '#f4d1ae', skinDark: '#c9926b',
  road: '#aaa7a0', roadLight: '#c4c0b7', roadDark: '#777570', asphalt: '#5f5e5b',
  trunk: '#6f5344', trunkLight: '#967258', metal: '#62676b', metalLight: '#b7bec0',
})

function box(c, x, y, w, h, light, base, dark) {
  c.rect(x, y, w, h, dark)
  if (w > 2 && h > 2) c.rect(x + 1, y + 1, w - 2, h - 2, base)
  if (w > 4) c.rect(x + 2, y + 1, w - 3, 1, light)
  if (h > 4) c.rect(x + 1, y + 2, 1, h - 3, light)
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
      const si = (y * source.width + x) * 4
      const alpha = source.pixels[si + 3]
      if (!alpha) continue
      const di = ((dy + y) * target.width + dx + x) * 4
      if (alpha === 255 || target.pixels[di + 3] === 0) target.pixels.set(source.pixels.subarray(si, si + 4), di)
      else {
        const a = alpha / 255
        for (let ch = 0; ch < 3; ch++) target.pixels[di + ch] = Math.round(source.pixels[si + ch] * a + target.pixels[di + ch] * (1 - a))
        target.pixels[di + 3] = 255
      }
    }
  }
}

function closeHorizontalTile(c) {
  for (let y = 0; y < c.height; y++) {
    const source = y * c.width * 4
    const target = (y * c.width + c.width - 1) * 4
    c.pixels.set(c.pixels.subarray(source, source + 4), target)
  }
  return c
}

function sky() {
  const c = new PixelCanvas(360, 640, C.skyTop)
  c.rect(0, 96, 360, 160, C.sky)
  c.rect(0, 256, 360, 384, C.skyLow)
  // 三阶积云，边缘严格按像素台阶处理。
  c.rows(62, [[44, 35], [35, 61], [29, 82], [24, 95], [20, 104], [20, 108], [25, 102], [34, 88], [47, 67]], C.cloudDark)
  c.rows(52, [[52, 22], [43, 42], [37, 55], [31, 67], [29, 76], [26, 86], [26, 91], [31, 87], [39, 77], [49, 62], [61, 40]], C.cloudMid)
  c.rows(47, [[55, 15], [49, 29], [45, 39], [41, 48], [39, 55], [37, 61], [39, 60], [44, 53], [50, 44]], C.cloud)
  c.rows(154, [[244, 20], [237, 38], [230, 53], [226, 62], [224, 69], [228, 66], [236, 56]], C.cloudDark)
  c.rows(146, [[247, 15], [241, 29], [237, 38], [233, 46], [232, 50], [235, 48], [241, 39]], C.cloudMid)
  c.rows(142, [[250, 10], [246, 19], [243, 27], [242, 31], [245, 27]], C.cloud)
  // 风筝和极细的线。
  c.set(309, 108, C.red); c.set(308, 109, C.redDark); c.set(310, 109, C.redLight); c.set(309, 110, C.redDark)
  c.line(309, 111, 303, 126, C.cloudDark)
  return closeHorizontalTile(c)
}

function far() {
  const c = new PixelCanvas(720, 200)
  c.rect(0, 132, 720, 68, C.far1)
  const blocks = [[8, 75, 72, 57], [92, 93, 54, 39], [160, 60, 82, 72], [260, 84, 65, 48], [345, 68, 91, 64], [454, 100, 58, 32], [530, 72, 76, 60], [625, 88, 83, 44]]
  blocks.forEach(([x, y, w, h], i) => {
    c.rect(x, y, w, h, i % 2 ? C.far1 : C.far2)
    for (let yy = y + 10; yy < y + h - 5; yy += 14)
      for (let xx = x + 8; xx < x + w - 5; xx += 13) c.rect(xx, yy, 5, 7, C.skyLow)
  })
  c.rect(283, 25, 14, 107, C.far3); c.rect(280, 21, 20, 7, C.far2)
  c.rect(287, 4, 5, 17, C.smoke); c.rect(291, 0, 9, 12, C.smoke); c.rect(300, 0, 15, 7, C.smoke)
  for (let x = 0; x < 720; x += 38) {
    ellipse(c, x + 12, 137, 22, 18, x % 76 ? C.far2 : C.far3)
    c.rect(x + 9, 141, 5, 25, C.far3)
  }
  return closeHorizontalTile(c)
}

function ground() {
  const c = new PixelCanvas(360, 120, C.road)
  c.rect(0, 0, 360, 25, C.greenDark)
  for (let x = 0; x < 360; x += 12) {
    ellipse(c, x + 5, 12 + (x % 24 ? 2 : 0), 8, 9, x % 36 ? C.green : C.greenLight)
    if (x % 48 === 0) { c.set(x + 8, 7, C.red); c.set(x + 9, 7, C.yellow) }
  }
  c.rect(0, 24, 360, 5, C.cementLight)
  c.rect(0, 29, 360, 8, C.cement)
  c.rect(0, 37, 360, 83, C.road)
  c.rect(0, 39, 360, 2, C.roadLight)
  c.rect(43, 61, 66, 16, C.asphalt); c.rect(49, 58, 51, 4, C.asphalt)
  c.rect(242, 88, 74, 19, C.roadDark); c.rect(253, 84, 51, 5, C.roadDark)
  ellipse(c, 180, 69, 16, 8, C.cementDark); ellipse(c, 180, 68, 13, 6, C.metal)
  for (let x = 171; x < 190; x += 4) c.line(x, 64, x + 6, 72, C.cementDark)
  c.rect(14, 104, 72, 3, C.white); c.rect(286, 104, 60, 3, C.white)
  return closeHorizontalTile(c)
}

function windowUnit(c, x, y, variant) {
  box(c, x, y, 26, 31, C.cementLight, C.glassDark, C.cementDark)
  c.rect(x + 3, y + 3, 9, 24, C.glass)
  c.rect(x + 14, y + 3, 9, 24, variant === 1 ? C.ink : C.glass)
  c.rect(x + 4, y + 4, 8, 3, C.glassLight)
  c.rect(x + 13, y + 2, 2, 27, C.cementDark)
  if (variant === 2) { c.rect(x + 7, y + 24, 13, 4, C.trunk); c.rect(x + 10, y + 19, 3, 6, C.green); c.rect(x + 16, y + 18, 3, 7, C.greenLight) }
  if (variant === 3) { c.rect(x + 6, y + 8, 3, 14, C.cream); c.rect(x + 15, y + 6, 5, 16, C.redLight) }
}

function buildingA() {
  const c = new PixelCanvas(320, 420)
  // 屋顶、主体与墙面色斑。
  c.rect(17, 40, 286, 380, C.wallDark)
  c.rect(20, 43, 280, 377, C.wall)
  c.rect(20, 43, 6, 377, C.wallLight)
  c.rect(294, 44, 6, 376, C.wallDark)
  c.rect(11, 37, 298, 7, C.cementDark); c.rect(16, 34, 288, 4, C.cementLight)
  ;[[32, 73, 75, 14], [201, 119, 82, 19], [53, 217, 66, 17], [184, 288, 95, 13]].forEach(([x, y, w, h], i) => c.rect(x, y, w, h, i % 2 ? C.wallDark : C.wallLight))
  c.rect(276, 58, 5, 292, C.stain); c.rect(273, 90, 11, 198, C.wallDark)

  // 顶楼太阳能热水器。
  c.line(196, 33, 205, 11, C.metal, 1); c.line(243, 33, 234, 11, C.metal, 1)
  box(c, 202, 7, 36, 10, C.metalLight, C.glass, C.glassDark)
  c.rect(208, 2, 28, 7, C.metalLight); c.rect(211, 3, 22, 3, C.white)

  const floors = [59, 113, 167, 221, 275, 329]
  const xs = [38, 98, 196, 256]
  floors.forEach((y, floor) => xs.forEach((x, col) => windowUnit(c, x, y, (floor + col) % 4)))

  // 窗外晾衣绳和衣物，让A楼的性格一眼可见。
  ;[[54, 103], [112, 157], [211, 211], [65, 319]].forEach(([x, y], i) => {
    c.line(x - 13, y, x + 28, y, C.ink)
    c.rect(x - 4, y + 1, 8, 13, i % 2 ? C.red : C.white)
    c.rect(x + 8, y + 1, 11, 9, i % 2 ? C.blueLight : C.redLight)
  })

  // 外挂机位与滴水痕。
  ;[[72, 91], [229, 145], [71, 254], [228, 308]].forEach(([x, y], i) => {
    box(c, x, y, 22, 13, C.white, C.cementLight, C.cementDark)
    c.rect(x + 4, y + 4, 11, 5, C.glassDark); c.rect(x + 17, y + 3, 2, 7, C.blue)
    c.line(x + 19, y + 12, x + 20 + i, y + 25, C.stain)
  })

  // 单元门、雨棚、台阶、坡道、信报箱和旧自行车。
  c.rect(126, 345, 68, 7, C.cementDark); c.rect(120, 350, 80, 5, C.cementLight)
  box(c, 137, 354, 46, 63, C.greenLight, C.greenDark, C.ink)
  c.rect(142, 360, 30, 24, C.glassDark); c.rect(144, 362, 26, 20, C.glass); c.rect(158, 361, 2, 23, C.ink)
  c.rect(172, 390, 4, 9, C.yellow)
  c.rect(139, 339, 42, 10, C.blueDark); c.rect(145, 341, 30, 6, C.blueLight) // 楼栋号留白区
  c.rect(124, 414, 73, 6, C.cementDark); c.rect(129, 409, 63, 5, C.cement); c.rect(134, 404, 53, 5, C.cementLight)
  c.line(198, 419, 228, 400, C.cementLight, 2); c.line(201, 419, 231, 400, C.cementDark)
  box(c, 93, 371, 31, 37, C.greenLight, C.green, C.greenDark)
  for (let y = 375; y < 405; y += 9) for (let x = 97; x < 121; x += 10) c.rect(x, y, 7, 6, C.cream)
  // 一辆靠门停放的旧自行车缩影。
  ellipse(c, 220, 407, 10, 10, C.ink); ellipse(c, 220, 407, 8, 8, C.wall)
  ellipse(c, 253, 407, 10, 10, C.ink); ellipse(c, 253, 407, 8, 8, C.wall)
  c.line(220, 407, 234, 389, C.ink, 1); c.line(234, 389, 253, 407, C.ink, 1); c.line(220, 407, 242, 406, C.ink, 1); c.line(242, 406, 234, 389, C.ink, 1)
  // 楼缝爬山虎。
  c.line(24, 416, 31, 265, C.greenDark, 1)
  for (let y = 278; y < 413; y += 14) { ellipse(c, 28 + (y % 3), y, 5, 3, C.green); ellipse(c, 36, y - 5, 5, 3, C.greenLight) }
  return c
}

function wheel(c, cx, cy, phase = 0) {
  ellipse(c, cx, cy, 8, 8, C.ink); ellipse(c, cx, cy, 6, 6, C.cementDark); ellipse(c, cx, cy, 5, 5, C.clear)
  c.set(cx, cy, C.metalLight)
  if (phase % 2 === 0) { c.line(cx - 4, cy, cx + 4, cy, C.metalLight); c.line(cx, cy - 4, cx, cy + 4, C.metalLight) }
  else { c.line(cx - 3, cy - 3, cx + 3, cy + 3, C.metalLight); c.line(cx - 3, cy + 3, cx + 3, cy - 3, C.metalLight) }
}

function bike(c, dx = 0, dy = 0, phase = 0, stand = false) {
  wheel(c, 18 + dx, 51 + dy, phase); wheel(c, 51 + dx, 51 + dy, phase + 1)
  c.line(18 + dx, 49 + dy, 29 + dx, 35 + dy, C.redDark, 2)
  c.line(29 + dx, 35 + dy, 49 + dx, 48 + dy, C.red, 2)
  c.rect(25 + dx, 33 + dy, 23, 11, C.red); c.rect(27 + dx, 34 + dy, 18, 3, C.redLight)
  c.rect(25 + dx, 29 + dy, 19, 5, C.ink); c.rect(28 + dx, 28 + dy, 15, 2, C.hairLight)
  c.line(49 + dx, 49 + dy, 48 + dx, 24 + dy, C.ink, 1)
  c.line(43 + dx, 23 + dy, 55 + dx, 23 + dy, C.ink, 1)
  c.line(51 + dx, 22 + dy, 54 + dx, 13 + dy, C.ink)
  c.set(55 + dx, 11 + dy, C.glassLight)
  // 前筐和传单。
  c.rect(49 + dx, 27 + dy, 13, 11, C.ink); c.rect(51 + dx, 29 + dy, 9, 7, C.cement)
  c.rect(52 + dx, 24 + dy, 8, 6, C.white); c.rect(53 + dx, 25 + dy, 6, 1, C.blue)
  if (stand) c.line(34 + dx, 43 + dy, 37 + dx, 61 + dy, C.ink, 1)
}

function riderHead(c, dx, dy, wind = 0) {
  // 与1.2男主同一套色板的侧脸缩写。
  c.rows(2 + dy, [[12, 13], [9, 19], [7, 24], [6, 27], [6, 28], [6, 28], [6, 28], [6, 28], [6, 28], [6, 28]], C.hair, dx)
  c.rect(9 + dx, 5 + dy, 20, 7, C.hairLight); c.rect(7 + dx, 9 + dy, 8, 12, C.hair)
  if (wind) { c.rect(4 + dx - wind, 8 + dy, 5 + wind, 2, C.hair); c.rect(5 + dx - wind, 12 + dy, 4 + wind, 2, C.hair) }
  c.rows(10 + dy, [[14, 16], [13, 18], [13, 19], [13, 20], [13, 20], [13, 21], [13, 21], [13, 21], [14, 20], [15, 17], [17, 13]], C.skinDark, dx)
  c.rect(15 + dx, 11 + dy, 16, 15, C.skin); c.rect(16 + dx, 12 + dy, 5, 12, C.skinLight)
  c.rect(32 + dx, 15 + dy, 3, 6, C.skin); c.rect(27 + dx, 15 + dy, 2, 3, C.ink); c.set(27 + dx, 15 + dy, C.white); c.set(33 + dx, 22 + dy, C.redDark)
}

function rideFrame(mode, frame) {
  const c = new PixelCanvas(64, 64)
  const bump = mode === 'ride' && frame >= 2 ? -1 : 0
  const lean = mode === 'brake' && frame === 0 ? 2 : 0
  c.rect(8, 61, 50, 1, C.shadow); c.rect(14, 62, 39, 1, C.shadow)
  bike(c, 0, bump, frame)
  riderHead(c, 9 + lean, -1 + bump, mode === 'ride' ? 1 : 0)
  // 上身、握把双臂、弯曲双腿。
  box(c, 22 + lean, 28 + bump, 18, 18, C.blueLight, C.blue, C.blueDark)
  c.line(37 + lean, 32 + bump, 44, 29 + bump, C.blueDark, 2)
  c.line(43, 29 + bump, 50, 24 + bump, C.skinDark, 1); c.line(43, 28 + bump, 49, 24 + bump, C.skinLight)
  c.line(30 + lean, 44 + bump, 40, 51 + bump, C.ink, 2); c.line(40, 51 + bump, 48, 50 + bump, C.ink, 2)
  c.line(27 + lean, 44 + bump, 24, 52 + bump, C.blueDark, 2); c.rect(20, 51 + bump, 8, 3, C.white)
  if (mode === 'brake' && frame === 1) { c.line(25, 43, 17, 57, C.blueDark, 2); c.rect(13, 57, 9, 3, C.white) }
  return c
}

function parkedBike() {
  const c = new PixelCanvas(64, 48)
  bike(c, 0, -12, 0, true)
  return c
}

function pushFrame(frame) {
  const c = new PixelCanvas(64, 64)
  const step = frame === 0 ? -2 : frame === 2 ? 2 : 0
  const bob = frame === 1 ? -1 : 0
  c.rect(3, 61, 58, 1, C.shadow); c.rect(9, 62, 46, 1, C.shadow)
  bike(c, 0, 0, frame, false)
  riderHead(c, -3, 2 + bob, 0)
  box(c, 9, 31, 15, 18, C.blueLight, C.blue, C.blueDark)
  c.line(21, 34, 31, 30, C.blueDark, 2)
  c.line(30, 30, 43, 24, C.skinDark, 1); c.line(30, 29, 42, 24, C.skinLight)
  c.line(13, 47, 10 + step, 58, C.ink, 2); c.rect(6 + step, 57, 9, 3, C.white)
  c.line(19, 47, 22 - step, 58, C.ink, 2); c.rect(18 - step, 57, 9, 3, C.white)
  return c
}

function dustFrame(frame) {
  const c = new PixelCanvas(24, 12)
  const points = frame === 0 ? [[18, 8, 2], [13, 9, 1], [21, 5, 1]] : frame === 1 ? [[13, 7, 2], [7, 9, 2], [19, 3, 1], [3, 10, 1]] : [[7, 5, 1], [2, 8, 1], [13, 2, 1]]
  points.forEach(([x, y, r]) => ellipse(c, x, y, r, r, frame === 2 ? C.wallDark : C.stain))
  return c
}

const SKY = sky()
const FAR = far()
const GROUND = ground()
const BUILDING = buildingA()
const RIDE = Array.from({ length: 4 }, (_, i) => rideFrame('ride', i))
const BRAKE = Array.from({ length: 2 }, (_, i) => rideFrame('brake', i))
const PUSH = Array.from({ length: 4 }, (_, i) => pushFrame(i))
const DUST = Array.from({ length: 3 }, (_, i) => dustFrame(i))

savePng(join(OUT, 'parallax_sky_360x640.png'), SKY)
savePng(join(OUT, 'parallax_far_720x200.png'), FAR)
savePng(join(OUT, 'ground_road_360x120.png'), GROUND)
savePng(join(OUT, 'building_a_320x420.png'), BUILDING)
savePng(join(OUT, 'bike_side_64x48.png'), parkedBike())
savePng(join(OUT, 'boy_ride_4f_64x64.png'), sheet(RIDE))
savePng(join(OUT, 'boy_ride_brake_2f_64x64.png'), sheet(BRAKE))
savePng(join(OUT, 'boy_pushbike_4f_64x64.png'), sheet(PUSH))
savePng(join(OUT, 'fx_ride_dust_3f_24x12.png'), sheet(DUST))

// 2屏宽组合预览：真实层级与1x尺寸，检查楼、路、车和人物的关系。
const preview = new PixelCanvas(720, 640, C.sky)
preview.blit(SKY, 0, 0); preview.blit(SKY, 360, 0)
blitOver(preview, FAR, 0, 270)
blitOver(preview, BUILDING, 58, 100)
preview.blit(GROUND, 0, 520); preview.blit(GROUND, 360, 520)
blitOver(preview, RIDE[0], 462, 485)
blitOver(preview, DUST[1], 441, 536)
savePng(join(QA, 'b3-yard-minimum-loop-preview.png'), preview)

console.log('Generated B3 minimum loop assets: parallax, building A, road, ride/brake/push/dust')
