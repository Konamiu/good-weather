import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { P, PixelCanvas, savePng, sheet } from './pixel-core.mjs'

const ROOT = dirname(fileURLToPath(import.meta.url))
const OUT = join(ROOT, '../../public/assets')

function selBox(c, x, y, w, h, light, base, dark) {
  c.rect(x, y, w, h, dark)
  if (w > 2 && h > 2) c.rect(x + 1, y + 1, w - 2, h - 2, base)
  if (w > 5) c.rect(x + 2, y, w - 4, 1, base)
  if (h > 5) c.rect(x, y + 2, 1, h - 4, base)
  if (w > 4) c.rect(x + 2, y + 1, w - 4, 1, light)
  if (h > 4) c.rect(x + 1, y + 2, 1, h - 4, light)
  if (w > 4) c.rect(x + 2, y + h - 2, w - 3, 1, dark)
  if (h > 4) c.rect(x + w - 2, y + 2, 1, h - 3, dark)
}

function shadow(c, running = false) {
  c.rect(running ? 8 : 13, 62, running ? 32 : 22, 1, P.shadow)
  c.rect(running ? 12 : 17, 63, running ? 24 : 14, 1, P.shadow)
}

function openEye(c, x, y, height) {
  c.rect(x, y, 2, height, P.eye)
  c.set(x, y, P.eyeGlint)
}

function closedEyes(c, leftX, rightX, y) {
  c.rect(leftX, y, 2, 1, P.eye)
  c.set(leftX - 1, y - 1, P.eye)
  c.rect(rightX, y, 2, 1, P.eye)
  c.set(rightX + 2, y - 1, P.eye)
}

function smile(c, x, y) {
  c.set(x, y, P.mouth)
  c.rect(x + 1, y + 1, 2, 1, P.mouth)
  c.set(x + 3, y, P.mouth)
}

function boyFrontHead(c, dx = 0, dy = 0) {
  // 圆润下颌：肤色轮廓只包裸露皮肤，头发使用自己的深阶。
  c.rows(8 + dy, [[14, 20], [12, 24], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [12, 25], [12, 25], [13, 23], [14, 21], [17, 15]], P.skinEdge, dx)
  c.rect(13 + dx, 10 + dy, 22, 17, P.skinBase)
  c.rect(14 + dx, 11 + dy, 7, 14, P.skinLight)
  c.rect(21 + dx, 11 + dy, 11, 16, P.skinBase)
  c.rect(32 + dx, 12 + dy, 3, 15, P.skinDark)
  c.rect(16 + dx, 27 + dy, 17, 2, P.skinDark)
  c.rect(18 + dx, 29 + dy, 13, 1, P.skinBase)

  // 短发、碎刘海和左上高光。
  c.rows(2 + dy, [[17, 15], [14, 21], [12, 25], [11, 27], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 7], [10, 6], [10, 5], [10, 5], [10, 4], [10, 4], [10, 4]], P.hairDark, dx)
  c.rect(13 + dx, 5 + dy, 22, 7, P.hairBase)
  c.rect(12 + dx, 8 + dy, 6, 8, P.hairBase)
  c.rect(33 + dx, 8 + dy, 4, 7, P.hairBase)
  c.rect(15 + dx, 5 + dy, 13, 2, P.hairLight)
  c.rect(13 + dx, 7 + dy, 9, 1, P.hairLight)
  c.rect(14 + dx, 12 + dy, 5, 3, P.hairBase)
  c.rows(12 + dy, [[21, 4], [22, 3], [23, 2]], P.hairBase, dx)
  c.rows(11 + dy, [[29, 5], [30, 4], [31, 3]], P.hairBase, dx)
  c.rect(34 + dx, 13 + dy, 3, 7, P.hairDark)

  openEye(c, 18 + dx, 16 + dy, 3)
  openEye(c, 26 + dx, 16 + dy, 3)
  c.rect(14 + dx, 21 + dy, 1, 2, P.blush)
  c.rect(32 + dx, 21 + dy, 1, 2, P.blush)
  c.set(23 + dx, 21 + dy, P.skinDark)
  smile(c, 22 + dx, 24 + dy)
  c.rect(21 + dx, 28 + dy, 6, 1, P.skinDark)
}

function girlFrontHead(c, dx = 0, dy = 0, eyes = 'open', sing = false, tip = 0) {
  // 楠：齐耳内扣短发，轮廓在下颌处收回，不延伸到肩。
  c.rows(12 + dy, [[14, 21], [12, 25], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [11, 27], [12, 25], [12, 25], [13, 23], [14, 21], [16, 17], [19, 11]], P.skinEdge, dx)
  c.rect(13 + dx, 14 + dy, 22, 17, P.skinBase)
  c.rect(14 + dx, 15 + dy, 7, 14, P.skinLight)
  c.rect(21 + dx, 15 + dy, 11, 16, P.skinBase)
  c.rect(32 + dx, 16 + dy, 3, 15, P.skinDark)
  c.rect(16 + dx, 31 + dy, 17, 2, P.skinDark)

  c.rows(6 + dy, [[17, 15], [13, 23], [11, 27], [10, 29], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 7], [9, 8], [10, 8], [11, 8], [12, 7], [13, 6], [14, 5]], P.hairDark, dx)
  c.rect(12 + dx, 9 + dy, 24, 8, P.hairBase)
  c.rect(11 + dx, 13 + dy, 6, 18, P.hairBase)
  c.rect(33 + dx, 13 + dy, 5, 17, P.hairBase)
  c.rect(15 + dx, 9 + dy, 14, 2, P.hairLight)
  c.rect(13 + dx, 11 + dy, 10, 1, P.hairLight)
  c.rows(16 + dy, [[15, 5], [16, 4], [17, 3]], P.hairBase, dx)
  c.rows(15 + dy, [[23, 4], [24, 3], [25, 2]], P.hairBase, dx)
  c.rows(15 + dy, [[30, 5], [31, 4], [32, 3]], P.hairBase, dx)
  c.rect(12 + dx + (tip < 0 ? -1 : 0), 29 + dy, 6, 5, P.hairBase)
  c.rect(33 + dx + (tip > 0 ? 1 : 0), 28 + dy, 5, 5, P.hairBase)
  c.rect(13 + dx, 31 + dy, 4, 3, P.hairDark)
  c.rect(34 + dx, 30 + dy, 4, 3, P.hairDark)
  // 暖黄发卡：深色承托，避免直接黏在肤色上。
  c.rect(31 + dx, 11 + dy, 7, 4, P.hairDark)
  c.rect(32 + dx, 12 + dy, 5, 2, P.clip)
  c.set(33 + dx, 12 + dy, P.creamLight)

  if (eyes === 'closed') closedEyes(c, 18 + dx, 26 + dx, 22 + dy)
  else {
    openEye(c, 18 + dx, 20 + dy, 4)
    openEye(c, 26 + dx, 20 + dy, 4)
  }
  c.rect(14 + dx, 26 + dy, 1, 2, P.blush)
  c.rect(32 + dx, 26 + dy, 1, 2, P.blush)
  c.set(23 + dx, 25 + dy, P.skinDark)
  if (sing) {
    c.rect(22 + dx, 28 + dy, 3, 3, P.mouth)
    c.set(23 + dx, 29 + dy, P.hairDark)
  } else smile(c, 22 + dx, 29 + dy)
  c.rect(21 + dx, 32 + dy, 6, 1, P.skinDark)
}

function boyBackHead(c, dx = 0, dy = 0) {
  c.rows(2 + dy, [[17, 15], [14, 21], [12, 25], [11, 27], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [11, 27], [12, 25], [13, 23], [14, 21], [16, 17], [19, 11]], P.hairDark, dx)
  c.rect(12 + dx, 5 + dy, 24, 17, P.hairBase)
  c.rect(13 + dx, 6 + dy, 9, 13, P.hairLight)
  c.rect(22 + dx, 7 + dy, 12, 15, P.hairBase)
  c.rect(32 + dx, 10 + dy, 4, 13, P.hairDark)
  c.rect(15 + dx, 21 + dy, 18, 3, P.hairDark)
  c.rect(21 + dx, 23 + dy, 7, 3, P.skinDark)
}

function girlBackHead(c, dx = 0, dy = 0, sway = 0) {
  c.rows(6 + dy, [[17, 15], [13, 23], [11, 27], [10, 29], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [10, 29], [11, 27], [12, 25], [14, 21], [17, 15]], P.hairDark, dx)
  c.rect(11 + dx, 9 + dy, 27, 20, P.hairBase)
  c.rect(13 + dx, 10 + dy, 10, 15, P.hairLight)
  c.rect(23 + dx, 11 + dy, 13, 18, P.hairBase)
  c.rect(34 + dx, 14 + dy, 4, 16, P.hairDark)
  c.rect(12 + dx + sway, 28 + dy, 24, 5, P.hairBase)
  c.rect(14 + dx + sway, 31 + dy, 20, 3, P.hairDark)
  c.rect(31 + dx, 11 + dy, 7, 4, P.hairDark)
  c.rect(32 + dx, 12 + dy, 5, 2, P.clip)
  c.set(33 + dx, 12 + dy, P.creamLight)
}

function boySideHead(c, dx = 0, dy = 0) {
  c.rows(8 + dy, [[15, 20], [13, 24], [12, 26], [12, 26], [12, 27], [12, 28], [12, 28], [12, 28], [12, 28], [12, 28], [12, 28], [12, 28], [12, 28], [12, 28], [12, 28], [12, 28], [12, 28], [13, 27], [14, 25], [15, 23], [17, 19], [20, 13]], P.skinEdge, dx)
  c.rect(14 + dx, 11 + dy, 23, 16, P.skinBase)
  c.rect(15 + dx, 12 + dy, 7, 13, P.skinLight)
  c.rect(22 + dx, 12 + dy, 13, 15, P.skinBase)
  c.rect(35 + dx, 14 + dy, 4, 13, P.skinDark)
  c.rect(39 + dx, 17 + dy, 3, 6, P.skinEdge)
  c.rect(39 + dx, 18 + dy, 2, 3, P.skinBase)

  c.rows(2 + dy, [[17, 15], [14, 21], [12, 25], [11, 27], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 29], [10, 8], [10, 8], [10, 8], [10, 8], [10, 8], [10, 8], [10, 8], [10, 8]], P.hairDark, dx)
  c.rect(13 + dx, 5 + dy, 23, 7, P.hairBase)
  c.rect(12 + dx, 9 + dy, 8, 12, P.hairBase)
  c.rect(15 + dx, 5 + dy, 13, 2, P.hairLight)
  c.rows(12 + dy, [[18, 5], [19, 4], [20, 3]], P.hairBase, dx)
  openEye(c, 31 + dx, 16 + dy, 3)
  c.rect(36 + dx, 22 + dy, 1, 2, P.blush)
  c.set(38 + dx, 22 + dy, P.mouth)
  c.rect(21 + dx, 28 + dy, 8, 1, P.skinDark)
}

function girlSideHead(c, dx = 0, dy = 0, sway = 0) {
  c.rows(12 + dy, [[14, 21], [12, 25], [11, 27], [11, 27], [11, 28], [11, 29], [11, 29], [11, 29], [11, 29], [11, 29], [11, 29], [11, 29], [11, 29], [11, 29], [11, 29], [11, 29], [11, 29], [12, 28], [13, 26], [14, 24], [16, 20], [19, 14]], P.skinEdge, dx)
  c.rect(14 + dx, 15 + dy, 23, 16, P.skinBase)
  c.rect(15 + dx, 16 + dy, 7, 13, P.skinLight)
  c.rect(22 + dx, 16 + dy, 13, 15, P.skinBase)
  c.rect(35 + dx, 18 + dy, 4, 13, P.skinDark)
  c.rect(39 + dx, 21 + dy, 3, 6, P.skinEdge)
  c.rect(39 + dx, 22 + dy, 2, 3, P.skinBase)

  c.rows(6 + dy, [[17, 15], [13, 23], [11, 27], [10, 29], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 31], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [9, 9], [10, 9], [11, 8], [12, 7]], P.hairDark, dx)
  c.rect(12 + dx, 9 + dy, 24, 8, P.hairBase)
  c.rect(11 + dx, 13 + dy, 9, 18, P.hairBase)
  c.rect(12 + dx + sway, 28 + dy, 7, 6, P.hairBase)
  c.rect(13 + dx + sway, 31 + dy, 5, 3, P.hairDark)
  c.rect(15 + dx, 9 + dy, 13, 2, P.hairLight)
  c.rows(16 + dy, [[19, 5], [20, 4], [21, 3]], P.hairBase, dx)
  c.rect(16 + dx, 11 + dy, 6, 4, P.hairDark)
  c.rect(17 + dx, 12 + dy, 4, 2, P.clip)
  c.set(18 + dx, 12 + dy, P.creamLight)
  openEye(c, 31 + dx, 20 + dy, 4)
  c.rect(36 + dx, 27 + dy, 1, 2, P.blush)
  c.set(38 + dx, 27 + dy, P.mouth)
  c.rect(21 + dx, 32 + dy, 8, 1, P.skinDark)
}

function shoe(c, x, y, flipShade = false) {
  selBox(c, x, y, 8, 4, P.creamLight, P.creamBase, P.creamDark)
  if (flipShade) c.rect(x + 1, y + 1, 2, 2, P.creamDark)
}

function frontLegs(c, gender, dx, dy, step) {
  const leftLift = step === 'right' ? 2 : step === 'together' ? 1 : 0
  const rightLift = step === 'left' ? 2 : step === 'together' ? 1 : 0
  const leftShoeY = 56 + dy - leftLift
  const rightShoeY = 56 + dy - rightLift
  if (gender === 'boy') {
    selBox(c, 18 + dx, 45 + dy, 7, Math.max(5, leftShoeY - 45 - dy + 1), P.pantsLight, P.pantsBase, P.pantsDark)
    selBox(c, 26 + dx, 45 + dy, 7, Math.max(5, rightShoeY - 45 - dy + 1), P.pantsLight, P.pantsBase, P.pantsDark)
  } else {
    selBox(c, 18 + dx, 51 + dy, 6, Math.max(3, leftShoeY - 51 - dy + 1), P.skinLight, P.skinBase, P.skinDark)
    selBox(c, 27 + dx, 51 + dy, 6, Math.max(3, rightShoeY - 51 - dy + 1), P.skinLight, P.skinBase, P.skinDark)
  }
  shoe(c, 16 + dx, leftShoeY, false)
  shoe(c, 26 + dx, rightShoeY, true)
}

function boyFrontBody(c, { dx = 0, dy = 0, step = 'idle', arm = 0 } = {}) {
  frontLegs(c, 'boy', dx, dy, step)
  selBox(c, 12 + dx, 33 + dy, 6, 14 + (arm > 0 ? 1 : 0), P.skinLight, P.skinBase, P.skinDark)
  selBox(c, 33 + dx, 33 + dy, 6, 14 + (arm < 0 ? 1 : 0), P.skinLight, P.skinBase, P.skinDark)
  c.rect(13 + dx, 33 + dy, 4, 5, P.blueBase)
  c.rect(34 + dx, 33 + dy, 4, 5, P.blueDark)
  selBox(c, 17 + dx, 30 + dy, 16, 18, P.blueLight, P.blueBase, P.blueDark)
  c.rect(19 + dx, 32 + dy, 3, 8, P.blueLight)
  c.rect(29 + dx, 33 + dy, 3, 13, P.blueDark)
  c.rect(23 + dx, 31 + dy, 4, 2, P.creamLight)
}

function girlFrontBody(c, { dx = 0, dy = 0, step = 'idle', arm = 0, skirt = 0, singing = false } = {}) {
  frontLegs(c, 'girl', dx, dy, step)
  if (singing) {
    c.line(17 + dx, 38 + dy, 11 + dx, 42 + dy, P.skinEdge, 1)
    c.line(17 + dx, 38 + dy, 11 + dx, 42 + dy, P.skinLight)
    c.line(33 + dx, 38 + dy, 39 + dx, 41 + dy, P.skinEdge, 1)
    c.line(33 + dx, 38 + dy, 39 + dx, 41 + dy, P.skinBase)
  } else {
    selBox(c, 12 + dx, 38 + dy, 6, 12 + (arm > 0 ? 1 : 0), P.skinLight, P.skinBase, P.skinDark)
    selBox(c, 33 + dx, 38 + dy, 6, 12 + (arm < 0 ? 1 : 0), P.skinLight, P.skinBase, P.skinDark)
  }
  selBox(c, 17 + dx, 35 + dy, 16, 13, P.creamLight, P.creamBase, P.creamDark)
  c.rect(19 + dx, 37 + dy, 3, 8, P.creamLight)
  c.rect(29 + dx, 38 + dy, 3, 8, P.creamDark)
  selBox(c, 14 + dx + skirt, 46 + dy, 22, 9, P.redLight, P.redBase, P.redDark)
  c.rect(16 + dx + skirt, 48 + dy, 4, 5, P.redLight)
  c.rect(32 + dx + skirt, 48 + dy, 3, 6, P.redDark)
}

function drawFront(gender, options = {}) {
  const c = new PixelCanvas(48, 64)
  shadow(c)
  if (gender === 'boy') {
    boyFrontBody(c, options)
    boyFrontHead(c, options.headX ?? 0, options.headY ?? 0)
  } else {
    girlFrontBody(c, options)
    girlFrontHead(c, options.headX ?? options.dx ?? 0, options.headY ?? 0, options.eyes, options.singing, options.tip)
  }
  return c
}

function drawBack(gender, options = {}) {
  const c = new PixelCanvas(48, 64)
  shadow(c)
  if (gender === 'boy') {
    boyFrontBody(c, options)
    c.rect(22 + (options.dx ?? 0), 31 + (options.dy ?? 0), 7, 3, P.blueDark)
    boyBackHead(c, options.headX ?? 0, options.headY ?? 0)
  } else {
    girlFrontBody(c, options)
    girlBackHead(c, options.headX ?? 0, options.headY ?? 0, options.hairSway ?? 0)
  }
  return c
}

function sideLegs(c, gender, pose, lean, dy) {
  const back = gender === 'boy' ? [P.pantsLight, P.pantsBase, P.pantsDark] : [P.skinLight, P.skinBase, P.skinDark]
  const front = gender === 'boy' ? [P.pantsLight, P.pantsBase, P.pantsDark] : [P.skinLight, P.skinBase, P.skinDark]
  const hipY = gender === 'boy' ? 46 : 52
  c.line(22 + lean, hipY + dy, pose.backFoot[0], pose.backFoot[1] + dy, back[2], 2)
  c.line(22 + lean, hipY + dy, pose.backFoot[0], pose.backFoot[1] + dy, back[1], 1)
  c.line(29 + lean, hipY + dy, pose.frontFoot[0], pose.frontFoot[1] + dy, front[2], 2)
  c.line(29 + lean, hipY + dy, pose.frontFoot[0], pose.frontFoot[1] + dy, front[1], 1)
  shoe(c, pose.backFoot[0] - 2, pose.backFoot[1] + dy, false)
  shoe(c, pose.frontFoot[0] - 2, pose.frontFoot[1] + dy, true)
}

function sideArm(c, sx, sy, hx, hy, clothBase, clothDark, skinBase) {
  const ex = Math.round(sx * 0.58 + hx * 0.42)
  const ey = Math.round(sy * 0.58 + hy * 0.42)
  c.line(ex, ey, hx, hy, P.skinEdge, 2)
  c.line(ex, ey, hx, hy, skinBase, 1)
  c.line(sx, sy, ex, ey, clothDark, 2)
  c.line(sx, sy, ex, ey, clothBase, 1)
}

function sideBody(c, gender, pose, { lean = 0, dy = 0 } = {}) {
  sideLegs(c, gender, pose, lean, dy)
  const shoulderY = gender === 'boy' ? 34 : 39
  const clothBase = gender === 'boy' ? P.blueBase : P.creamBase
  const clothDark = gender === 'boy' ? P.blueDark : P.creamDark
  sideArm(c, 18 + lean, shoulderY + dy, pose.backHand[0] + lean, pose.backHand[1] + dy, clothBase, clothDark, P.skinBase)
  if (gender === 'boy') {
    selBox(c, 18 + lean, 30 + dy, 16, 18, P.blueLight, P.blueBase, P.blueDark)
    c.rect(30 + lean, 33 + dy, 3, 13, P.blueDark)
  } else {
    selBox(c, 18 + lean, 35 + dy, 16, 13, P.creamLight, P.creamBase, P.creamDark)
    selBox(c, 16 + lean, 46 + dy, 21, 9, P.redLight, P.redBase, P.redDark)
    c.rect(33 + lean, 48 + dy, 3, 6, P.redDark)
  }
  const frontShoulderY = gender === 'boy' ? 35 : 40
  sideArm(c, 32 + lean, frontShoulderY + dy, pose.frontHand[0] + lean, pose.frontHand[1] + dy, clothBase, clothDark, P.skinLight)
}

function drawSide(gender, pose, options = {}) {
  const c = new PixelCanvas(48, 64)
  shadow(c, options.running)
  sideBody(c, gender, pose, options)
  if (gender === 'boy') boySideHead(c, options.lean ?? 0, options.headY ?? 0)
  else girlSideHead(c, options.lean ?? 0, options.headY ?? 0, options.hairSway ?? 0)
  return c
}

const WALK = [
  { step: 'left', dy: 0, arm: -1, skirt: -1, hairSway: -1 },
  { step: 'together', dy: -1, headY: -1, arm: 1, skirt: 0, hairSway: 0 },
  { step: 'right', dy: 0, arm: 1, skirt: 1, hairSway: 1 },
  { step: 'together', dy: -1, headY: -1, arm: -1, skirt: 0, hairSway: 0 },
]

const SIDE_WALK = [
  { backFoot: [13, 56], frontFoot: [32, 56], backHand: [36, 43], frontHand: [20, 46] },
  { backFoot: [18, 56], frontFoot: [29, 56], backHand: [30, 45], frontHand: [27, 46] },
  { backFoot: [32, 56], frontFoot: [13, 56], backHand: [19, 46], frontHand: [37, 43] },
  { backFoot: [29, 56], frontFoot: [18, 56], backHand: [27, 46], frontHand: [31, 45] },
]

const SIDE_RUN = [
  { backFoot: [7, 56], frontFoot: [38, 53], backHand: [39, 38], frontHand: [19, 48] },
  { backFoot: [16, 57], frontFoot: [34, 56], backHand: [33, 48], frontHand: [18, 39] },
  { backFoot: [38, 56], frontFoot: [7, 53], backHand: [18, 39], frontHand: [39, 48] },
  { backFoot: [34, 57], frontFoot: [16, 56], backHand: [19, 48], frontHand: [34, 39] },
]

const assets = new Map([
  ['boy_idle_down_2f_48x64.png', sheet([
    drawFront('boy'),
    drawFront('boy', { dy: 1 }),
  ])],
  ['boy_walk_down_4f_48x64.png', sheet(WALK.map(p => drawFront('boy', p)))],
  ['boy_walk_up_4f_48x64.png', sheet(WALK.map(p => drawBack('boy', p)))],
  ['boy_walk_side_4f_48x64.png', sheet(SIDE_WALK.map((p, i) => drawSide('boy', p, { dy: i % 2 ? -1 : 0, headY: i % 2 ? -1 : 0 })))],
  ['boy_run_side_4f_48x64.png', sheet(SIDE_RUN.map((p, i) => drawSide('boy', p, { lean: 3, running: true, dy: i % 2 ? -1 : 0, headY: i % 2 ? -1 : 0 })))],
  ['girl_idle_down_2f_48x64.png', sheet([
    drawFront('girl'),
    drawFront('girl', { dy: 1 }),
  ])],
  ['girl_walk_down_4f_48x64.png', sheet(WALK.map(p => drawFront('girl', p)))],
  ['girl_walk_up_4f_48x64.png', sheet(WALK.map(p => drawBack('girl', p)))],
  ['girl_walk_side_4f_48x64.png', sheet(SIDE_WALK.map((p, i) => drawSide('girl', p, { dy: i % 2 ? -1 : 0, headY: i % 2 ? -1 : 0, hairSway: i === 0 ? -1 : i === 2 ? 1 : 0 })))],
  ['girl_idle_sing_2f_48x64.png', sheet([
    drawFront('girl', { dx: -1, headX: -1, eyes: 'closed', singing: true, tip: -1 }),
    drawFront('girl', { dx: 1, headX: 1, eyes: 'closed', singing: true, tip: 1 }),
  ])],
])

for (const [name, canvas] of assets) savePng(join(OUT, name), canvas)
console.log(`Generated ${assets.size} original 48x64 character sheets in ${OUT}`)
