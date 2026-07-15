// 第1章 · 蝉鸣：2019夏 · 发传单 — 两层结构
// intro旁白 → yard小区(骑车选楼) ↔ building楼道(爬楼塞传单)×3栋 → walkhome黄昏 → night夜聊 → end章末卡
import { Container, Graphics, Sprite, Text } from 'pixi.js'
import type { Game } from '../core/engine'
import { GameScene, W, H } from '../core/engine'
import { CH, CW } from '../core/assets'
import { Anim } from '../core/anim'
import { label, typeSlice } from '../core/ui'
import { MemoScene } from './memo'

const HER_MSGS = [
  '天这么热，多喝点水呀',
  '记得拿湿巾擦擦汗！',
  '爬楼慢一点，别中暑啦',
  '今天塞了多少张啦？',
  '加油呀~ 晚上给你唱歌听',
]

// ---- 小区外景 ----
const YARD_W = 1200
const YARD_GROUND = 520 // 地面线
const BUILDINGS = [
  { x: 200, floors: 3, name: '1栋' },
  { x: 560, floors: 4, name: '2栋' },
  { x: 920, floors: 5, name: '3栋' },
]

// ---- 楼道 ----
const FLOOR_H = 90
const DOOR_XS = [64, 184]
const STAIR_X = 300

const INTRO_LINES = ['2019年夏天，高中毕业。', '我在市里打暑假工，发传单——', '骑着电瓶车，一栋楼一栋楼地跑，', '把传单塞到每一户门口。']
const END_LINES = ['那年夏天，我们聊了很多很多。', '后来我说：']

interface Door {
  floor: number
  x: number
  done: boolean
  bubbleT: number
  style: number
  spr: Sprite
  bubble: Container
  bubbleText: Text
}

type Phase = 'intro' | 'yard' | 'building' | 'walkhome' | 'night' | 'end'

export class Ch1Scene extends GameScene {
  phase: Phase = 'intro'

  // ---- 小区状态 ----
  bldIdx = 0
  ride = { x: 60, v: 0, dir: 1 as 1 | -1, target: null as number | null }
  doneBuildings = new Set<number>()

  // ---- 楼道状态 ----
  floors = 3
  worldH = 0
  boy = {
    x: 30,
    floor: 0,
    dir: 1 as 1 | -1,
    moving: false,
    targetX: null as number | null,
    action: null as { kind: 'door'; door: Door } | { kind: 'stairs' } | { kind: 'exit' } | null,
    climbT: 0,
  }
  doors: Door[] = []
  dust: { spr: Sprite; y: number; x: number; p: number }[] = []
  given = 0
  goalTotal = BUILDINGS.reduce((s, b) => s + b.floors * DOOR_XS.length, 0)
  msgIdx = 0
  toastT = 999
  duskAlpha = 0
  homeX = -40
  chat: { her: boolean; s: string }[] = []
  choice: string[] | null = null
  endT = 0

  // ---- 场景图节点 ----
  private yardC = new Container()
  private yardWorld = new Container()
  private rider = new Container() // 电瓶车+人
  private riderBoy = new Anim()
  private yardBang = label('!', 16, '#f2cc8f', { anchorX: 0.5 })
  private world = new Container()
  private boyAnim = new Anim()
  private bang = label('!', 16, '#f2cc8f', { anchorX: 0.5 })
  private streetC = new Container()
  private homeBoy = new Anim()
  private duskG = new Graphics().rect(0, 0, W, H).fill('#d66e3a')
  private introC = new Container()
  private introTexts: Text[] = []
  private introHint = label('点击继续 ▸', 12, '#8a8580', { x: W - 40, y: 580, anchorX: 1 })
  private hudL = label('', 13, '#faf7f0', { x: 10, y: 8 })
  private hudR = label('', 13, '#8a8580', { x: W - 10, y: 8, anchorX: 1 })
  private hudC = new Container()
  private toastC = new Container()
  private toastMsg = label('', 13, '#1f1a17', { x: 34, y: 66 })
  private nightC = new Container()
  private chatBox = new Container()
  private choiceBox = new Container()
  private endC = new Container()
  private endTexts: Text[] = []
  private endBig = label('「 试 试 吧 」', 26, '#f2cc8f', { x: W / 2, y: 330, anchorX: 0.5 })
  private endSub = label('—— 我们在一起了', 13, '#8a8580', { x: W / 2, y: 390, anchorX: 0.5 })
  private endHint = label('点击返回备忘录', 12, '#8a8580', { x: W / 2, y: 560, anchorX: 0.5 })

  private slabY(floor: number) {
    return this.worldH - floor * FLOOR_H
  }
  private boyYOn(floor: number) {
    return this.slabY(floor) - CH - 2
  }

  // ---------- 搭建 ----------
  enter(g: Game) {
    this.buildYard(g)
    this.buildStreet(g)
    this.buildOverlays(g)
    this.addChild(this.world)
    this.applyPhase()
  }

  /** 小区外景（占位组合：等B3外立面/视差/骑行帧到货后替换贴图，结构不变） */
  private buildYard(g: Game) {
    // 天空
    const sky = new Graphics().rect(0, 0, YARD_W, YARD_GROUND).fill({ color: 0xa8d8e8 })
    const sun = new Graphics().circle(300, 90, 22).fill({ color: 0xfff4d6, alpha: 0.9 })
    // 地面
    const ground = new Graphics()
      .rect(0, YARD_GROUND, YARD_W, H - YARD_GROUND).fill('#8a8580')
      .rect(0, YARD_GROUND, YARD_W, 6).fill('#6f6a5e')
    this.yardWorld.addChild(sky, sun, ground)
    // 三栋楼（占位立面：色块+窗格+真门）
    const colors = [0xd8c8a8, 0xc8c8c8, 0xb87860]
    BUILDINGS.forEach((b, i) => {
      const bw = 220
      const bh = 90 + b.floors * 62
      const bx = b.x - bw / 2
      const by = YARD_GROUND - bh
      const gfx = new Graphics().rect(bx, by, bw, bh).fill(colors[i])
      for (let f = 0; f < b.floors; f++)
        for (let c = 0; c < 4; c++)
          gfx.rect(bx + 22 + c * 48, by + 20 + f * 62, 26, 30).fill(Math.random() < 0.3 ? '#f2cc8f' : '#5c6b7a')
      this.yardWorld.addChild(gfx)
      // 单元门（B2门贴图当单元门占位）
      const door = new Sprite(g.assets.doorVariants[2])
      door.position.set(b.x - 20, YARD_GROUND - 72)
      this.yardWorld.addChild(door, label(b.name, 12, '#faf7f0', { x: b.x, y: by + 4, anchorX: 0.5 }))
    })
    // 骑手 = 电瓶车 + 男主（占位骑行：B3骑行帧到货后替换）
    const bike = new Sprite(g.assets.vehicles[0])
    bike.anchor.set(0.5, 1)
    bike.position.set(0, 0)
    this.riderBoy.set(g.assets.boyIdle, 24)
    this.riderBoy.spr.position.set(0, -CH - 14)
    this.rider.addChild(this.riderBoy.spr, bike)
    this.yardWorld.addChild(this.rider)
    this.yardC.addChild(this.yardWorld)
    this.yardWorld.addChild(this.yardBang)
    this.addChild(this.yardC)
  }

  /** 进入某栋楼：按层数重建楼道 */
  private enterBuilding(g: Game, idx: number) {
    this.bldIdx = idx
    this.floors = BUILDINGS[idx].floors
    this.worldH = Math.max(H, this.floors * FLOOR_H + 160) + 60
    this.world.removeChildren().forEach(c => c.destroy({ children: true }))
    this.doors = []
    this.dust = []
    this.boy.x = 30
    this.boy.floor = 0
    this.boy.targetX = null
    this.boy.action = null
    this.boy.climbT = 0

    // 墙面基底平铺
    for (let y = this.worldH - 82; y > -100; y -= 90) {
      const tile = new Sprite(g.assets.wallBase[(Math.random() * 3) | 0])
      tile.position.set(0, y)
      this.world.addChild(tile)
    }
    const walls = new Graphics()
    for (let f = 0; f < this.floors; f++) {
      const sy = this.slabY(f)
      walls.rect(0, sy, W, 8).fill('#8a8580')
      walls.rect(14, sy - 64, 26, 34).fill('#a8d8e8')
      walls.poly([14, sy - 64, 40, sy - 64, 108, sy, 66, sy]).fill({ color: 0xfff4d6, alpha: 0.1 })
      if (f < this.floors - 1)
        for (let s = 0; s < 6; s++) walls.rect(STAIR_X + s * 9, sy - 10 - s * 13, 10 + (5 - s) * 9, 6).fill('#b3a88e')
    }
    this.world.addChild(walls)
    for (let f = 0; f < this.floors; f++) {
      this.world.addChild(label(`${f + 1}F`, 10, '#8a8580', { x: 46, y: this.slabY(f) - 60 }))
      if (f < this.floors - 1)
        this.world.addChild(label('▲', 12, '#6f6a5e', { x: STAIR_X + 28, y: this.slabY(f) - 88, anchorX: 0.5 }))
    }
    // 门
    for (let f = 0; f < this.floors; f++) {
      let last = -1
      for (const x of DOOR_XS) {
        let style = (Math.random() * 5) | 0
        if (style === last) style = (style + 1) % 5
        last = style
        const spr = new Sprite(g.assets.doorVariants[style * 2])
        spr.position.set(x, this.slabY(f) - 72)
        const bubbleText = label('', 10, '#1f1a17', { x: x + 22, y: this.slabY(f) - 96, anchorX: 0.5 })
        const bubble = new Container()
        bubble.addChild(
          new Graphics().rect(x - 8, this.slabY(f) - 100, 60, 20).fill({ color: 0xfaf7f0, alpha: 0.95 }),
          bubbleText,
        )
        bubble.visible = false
        this.world.addChild(spr, bubble)
        this.doors.push({ floor: f, x, done: false, bubbleT: 999, style, spr, bubble, bubbleText })
      }
    }
    // 杂物
    const slots = [118, 240]
    for (let f = 0; f < this.floors; f++) {
      const n = f === this.floors - 1 ? 1 : 1 + ((Math.random() * 2) | 0)
      for (let i = 0; i < n; i++) {
        const p = new Sprite(g.assets.propsFloor[(Math.random() * g.assets.propsFloor.length) | 0])
        p.position.set(slots[i % slots.length] + ((Math.random() * 12) | 0), this.slabY(f) - 32)
        this.world.addChild(p)
      }
    }
    // 浮尘
    for (let i = 0; i < 40; i++) {
      const dot = new Graphics().rect(0, 0, 1.5, 1.5).fill(0xfff4d6)
      this.dust.push({ spr: dot as unknown as Sprite, x: Math.random() * W, y: Math.random() * this.worldH, p: Math.random() * Math.PI * 2 })
      this.world.addChild(dot)
    }
    this.boyAnim.set(g.assets.boyIdle, 24)
    this.world.addChild(this.boyAnim.spr, this.bang)

    this.phase = 'building'
    this.applyPhase()
  }

  private exitBuilding() {
    if (this.doors.length && this.doors.every(d => d.done)) this.doneBuildings.add(this.bldIdx)
    this.ride.x = BUILDINGS[this.bldIdx].x
    this.ride.target = null
    this.ride.v = 0
    this.phase = 'yard'
    this.applyPhase()
  }

  private buildStreet(g: Game) {
    const bg = new Sprite(g.assets.bg)
    this.homeBoy.set(g.assets.boyWalkSide, 8)
    this.duskG.alpha = 0
    this.streetC.addChild(bg, this.homeBoy.spr, this.duskG)
    this.addChild(this.streetC)
  }

  private buildOverlays(g: Game) {
    this.hudC.addChild(new Graphics().rect(0, 0, W, 30).fill({ color: 0x1f1a17, alpha: 0.75 }), this.hudL, this.hudR)
    this.toastC.addChild(
      new Graphics().rect(20, 44, 320, 44).fill({ color: 0xfaf7f0, alpha: 0.95 }),
      new Graphics().rect(20, 44, 4, 44).fill('#4a6fa5'),
      label('楠', 11, '#4a6fa5', { x: 34, y: 50 }),
      this.toastMsg,
    )
    this.toastC.visible = false
    this.introTexts = INTRO_LINES.map((_, i) => label('', 15, '#faf7f0', { x: 40, y: 235 + i * 31 }))
    this.introC.addChild(new Graphics().rect(0, 0, W, H).fill('#151318'), ...this.introTexts, this.introHint)
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: 0x15131a, alpha: 0.88 })
    const phone = new Sprite(g.assets.phone)
    phone.position.set(30, 60)
    const screen = new Graphics().rect(46, 110, 268, 420).fill('#faf7f0')
    this.nightC.addChild(dim, phone, screen, label('楠 · QQ', 13, '#1f1a17', { x: W / 2, y: 120, anchorX: 0.5 }), this.chatBox, this.choiceBox)
    this.endTexts = END_LINES.map((_, i) => label('', 14, '#faf7f0', { x: 40, y: 240 + i * 30 }))
    this.endC.addChild(new Graphics().rect(0, 0, W, H).fill('#151318'), ...this.endTexts, this.endBig, this.endSub, this.endHint)
    this.addChild(this.hudC, this.toastC, this.introC, this.nightC, this.endC)
  }

  private applyPhase() {
    this.introC.visible = this.phase === 'intro'
    this.yardC.visible = this.phase === 'yard'
    this.world.visible = this.phase === 'building'
    this.streetC.visible = this.phase === 'walkhome' || this.phase === 'night'
    this.nightC.visible = this.phase === 'night'
    this.endC.visible = this.phase === 'end'
    this.hudC.visible = this.phase === 'building' || this.phase === 'yard' || this.phase === 'walkhome'
  }

  // ---------- 更新 ----------
  update(g: Game) {
    if (this.phase === 'intro') {
      const slices = typeSlice(INTRO_LINES, this.t)
      this.introTexts.forEach((tx, i) => (tx.text = slices[i]))
      this.introHint.visible = this.t > 240 && this.t % 60 < 40
      return
    }
    if (this.phase === 'end') {
      this.endT++
      const slices = typeSlice(END_LINES, this.endT)
      this.endTexts.forEach((tx, i) => (tx.text = slices[i]))
      this.endBig.visible = this.endT > 160
      this.endSub.visible = this.endT > 220
      this.endHint.visible = this.endT > 220 && this.t % 60 < 40
      return
    }
    this.toastT++
    this.toastC.visible = this.toastT < 260 && this.phase !== 'night'
    if (this.phase === 'yard') this.updateYard(g)
    if (this.phase === 'building') this.updateBuilding(g)
    if (this.phase === 'walkhome') {
      this.homeX += 0.9
      if (this.duskAlpha < 0.16) this.duskAlpha += 0.002
      this.duskG.alpha = this.duskAlpha
      this.homeBoy.tick(this.t)
      this.homeBoy.spr.position.set(this.homeX + CW / 2, 518 - CH)
      if (this.homeX > W + 40) this.startNight(g)
    }
    this.hudL.text = `传单 ${this.given}/${this.goalTotal}`
    this.hudR.text =
      this.phase === 'building'
        ? `${BUILDINGS[this.bldIdx].name} ${this.boy.floor + 1}F`
        : this.phase === 'yard'
          ? `已跑 ${this.doneBuildings.size}/${BUILDINGS.length} 栋`
          : ''
  }

  private updateYard(g: Game) {
    const r = this.ride
    // 键盘/点击目标
    if (g.keys.ArrowLeft) { r.v = Math.max(r.v - 0.2, -3); r.target = null }
    else if (g.keys.ArrowRight) { r.v = Math.min(r.v + 0.2, 3); r.target = null }
    else if (r.target != null) {
      const d = r.target - r.x
      if (Math.abs(d) > 6) r.v = Math.max(-3, Math.min(3, r.v + Math.sign(d) * 0.2))
      else { r.target = null }
    }
    if (r.target == null && !g.keys.ArrowLeft && !g.keys.ArrowRight) r.v *= 0.92 // 惯性滑行
    r.x = Math.max(30, Math.min(YARD_W - 30, r.x + r.v))
    if (Math.abs(r.v) > 0.1) r.dir = r.v > 0 ? 1 : -1

    this.rider.position.set(r.x, YARD_GROUND)
    this.rider.scale.x = r.dir
    this.riderBoy.tick(this.t)
    // 相机
    this.yardWorld.x = -Math.max(0, Math.min(r.x - W / 2, YARD_W - W))
    // 靠近未跑完的楼 → 提示
    const near = BUILDINGS.findIndex((b, i) => !this.doneBuildings.has(i) && Math.abs(b.x - r.x) < 44)
    this.yardBang.visible = near >= 0
    if (near >= 0) this.yardBang.position.set(BUILDINGS[near].x, YARD_GROUND - 100)
    // 空格进楼
    if (near >= 0 && g.pressed.has(' ') && Math.abs(r.v) < 0.5) this.enterBuilding(g, near)
  }

  private updateBuilding(g: Game) {
    const b = this.boy
    this.doors.forEach(d => {
      d.bubbleT++
      d.bubble.visible = d.bubbleT < 60
    })
    if (b.climbT > 0) {
      b.climbT--
      if (b.climbT === 0) {
        b.floor++
        b.x = STAIR_X - 10
        b.targetX = null
      }
    } else {
      if (g.keys.ArrowLeft) { b.x -= 1.6; b.dir = -1; b.moving = true; b.targetX = null; b.action = null }
      else if (g.keys.ArrowRight) { b.x += 1.6; b.dir = 1; b.moving = true; b.targetX = null; b.action = null }
      else if (g.pressed.has('ArrowUp')) this.tryClimb()
      else if (b.targetX != null && Math.abs(b.targetX - b.x) > 3) {
        b.dir = Math.sign(b.targetX - b.x) as 1 | -1
        b.x += 1.6 * b.dir
        b.moving = true
      } else {
        b.moving = false
        if (b.targetX != null) {
          b.targetX = null
          const a = b.action
          b.action = null
          if (a?.kind === 'door') this.stuffDoor(g, a.door)
          if (a?.kind === 'stairs') this.tryClimb()
          if (a?.kind === 'exit') this.exitBuilding()
        }
      }
      if (g.pressed.has(' ')) {
        const d = this.nearestDoor()
        if (d) this.stuffDoor(g, d)
      }
      b.x = Math.max(6, Math.min(W - CW - 6, b.x))
    }
    this.dust.forEach(m => {
      m.y -= 0.07
      m.x += Math.sin(this.t / 40 + m.p) * 0.12
      if (m.y < 0) m.y = this.worldH
      m.spr.position.set(m.x, m.y)
      m.spr.alpha = 0.18 + 0.18 * Math.sin(this.t / 18 + m.p)
    })
    const boyY = b.climbT > 0 ? this.boyYOn(b.floor) - ((40 - b.climbT) / 40) * FLOOR_H : this.boyYOn(b.floor)
    const cam = Math.max(0, Math.min(boyY - 350, this.worldH - H))
    this.world.y = -cam
    const A = g.assets
    if (b.climbT > 0) this.boyAnim.set(A.boyWalkUp, 8)
    else if (b.moving) this.boyAnim.set(A.boyWalkSide, 8)
    else this.boyAnim.set(A.boyIdle, 24)
    this.boyAnim.flip = b.moving && b.dir < 0
    this.boyAnim.tick(this.t)
    this.boyAnim.spr.position.set(b.x + CW / 2, boyY)
    const nd = this.nearestDoor()
    this.bang.visible = !!nd
    this.bang.position.set(b.x + CW / 2, boyY - 18)
  }

  private nearestDoor(): Door | null {
    const b = this.boy
    if (this.phase !== 'building' || b.climbT > 0) return null
    return this.doors.find(d => d.floor === b.floor && !d.done && Math.abs(d.x + 20 - (b.x + CW / 2)) < 32) || null
  }

  private tryClimb() {
    const b = this.boy
    if (b.floor >= this.floors - 1) return
    if (b.x + CW / 2 > STAIR_X - 20) b.climbT = 40
    else {
      b.targetX = STAIR_X + 4
      b.action = { kind: 'stairs' }
    }
  }

  private stuffDoor(g: Game, d: Door) {
    if (d.done || d.floor !== this.boy.floor) return
    d.done = true
    this.given++
    g.audio.sndOk()
    d.spr.texture = g.assets.doorVariants[d.style * 2 + 1]
    const r = Math.random()
    if (r < 0.18) { d.bubbleText.text = '汪汪汪！'; d.bubbleT = 0; g.audio.sndNo() }
    else if (r < 0.28) { d.bubbleText.text = '谁呀？！'; d.bubbleT = 0 }
    if (this.given % 5 === 3 && this.msgIdx < HER_MSGS.length) this.toast(g, HER_MSGS[this.msgIdx++])
    // 本栋塞完
    if (this.doors.every(dd => dd.done)) {
      window.setTimeout(() => {
        if (this.doneBuildings.size + 1 >= BUILDINGS.length) {
          // 全部跑完 → 黄昏回家
          this.phase = 'walkhome'
          g.audio.bgm('dusk')
          g.setMood('dusk')
          this.toast(g, '今天也辛苦啦')
          this.applyPhase()
        } else {
          this.toast(g, '这栋跑完啦，下一栋！')
          this.exitBuilding()
        }
      }, 1400)
    }
  }

  private toast(g: Game, msg: string) {
    g.audio.sndMsg()
    this.toastMsg.text = msg
    this.toastT = 0
  }

  // ---------- 夜聊 ----------
  private startNight(g: Game) {
    this.phase = 'night'
    g.audio.cicada(false)
    g.setMood('night')
    this.chat = [{ her: true, s: '下班啦？今天累不累呀' }]
    this.choice = ['腿快跑断了…但还好', '看到你消息，就不累了']
    this.syncChat()
    this.applyPhase()
  }

  private syncChat() {
    this.chatBox.removeChildren().forEach(c => c.destroy({ children: true }))
    let cy = 150
    this.chat.forEach(c => {
      const w = Math.min(210, c.s.length * 13 + 20)
      const cx = c.her ? 56 : 304 - w
      this.chatBox.addChild(
        new Graphics().roundRect(cx, cy, w, 34, 4).fill(c.her ? '#e8e3d8' : '#4a6fa5'),
        label(c.s, 12, c.her ? '#1f1a17' : '#faf7f0', { x: cx + 10, y: cy + 10 }),
      )
      cy += 44
    })
    this.choiceBox.removeChildren().forEach(c => c.destroy({ children: true }))
    this.choice?.forEach((c, i) => {
      this.choiceBox.addChild(
        new Graphics().roundRect(56, 430 + i * 60, 248, 46, 4).fill('#f2cc8f'),
        label(c, 13, '#1f1a17', { x: W / 2, y: 445 + i * 60, anchorX: 0.5 }),
      )
    })
  }

  private pickChoice(g: Game, i: number) {
    if (!this.choice) return
    this.chat.push({ her: false, s: this.choice[i] })
    this.choice = null
    this.syncChat()
    g.audio.sndMsg()
    window.setTimeout(() => {
      this.chat.push({ her: true, s: i === 0 ? '心疼…明天少爬两栋嘛' : '油嘴滑舌…但我爱听' })
      this.syncChat()
      window.setTimeout(() => {
        this.chat.push({ her: true, s: '明天也给你发消息呀' })
        this.syncChat()
        window.setTimeout(() => {
          this.phase = 'end'
          g.audio.bgm('off')
          g.audio.sndOk()
          g.setMood('none')
          g.save.unlock(1)
          this.applyPhase()
        }, 1800)
      }, 1500)
    }, 900)
  }

  // ---------- 输入 ----------
  onTap(g: Game, x: number, y: number) {
    if (this.phase === 'intro') {
      if (this.t > 140) {
        this.phase = 'yard'
        g.audio.cicada(true)
        g.audio.bgm('day')
        g.setMood('noon')
        this.applyPhase()
      }
      return
    }
    if (this.phase === 'yard') {
      const wx = x - this.yardWorld.x
      // 点到未跑完的楼门口 → 骑过去并进楼
      const near = BUILDINGS.findIndex((b, i) => !this.doneBuildings.has(i) && Math.abs(b.x - wx) < 50)
      if (near >= 0 && Math.abs(BUILDINGS[near].x - this.ride.x) < 44) {
        this.enterBuilding(g, near)
        return
      }
      this.ride.target = wx
      return
    }
    if (this.phase === 'building') {
      const b = this.boy
      if (b.climbT > 0) return
      const cam = -this.world.y
      const wy = y + cam
      const sy = this.slabY(b.floor)
      const d = this.doors.find(
        d => d.floor === b.floor && !d.done && Math.abs(d.x + 20 - x) < 26 && wy > sy - 80 && wy < sy + 10,
      )
      if (d) {
        b.targetX = d.x + 20 - CW / 2
        b.action = { kind: 'door', door: d }
        return
      }
      if (x > STAIR_X - 24) {
        this.tryClimb()
        return
      }
      b.targetX = x - CW / 2
      b.action = null
      return
    }
    if (this.phase === 'night' && this.choice) {
      this.choice.forEach((_, i) => {
        if (y > 430 + i * 60 && y < 476 + i * 60) this.pickChoice(g, i)
      })
      return
    }
    if (this.phase === 'end' && this.endT > 220) g.setScene(new MemoScene())
  }
}
