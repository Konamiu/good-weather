// 第1章 · 蝉鸣：2019夏 · 发传单（爬楼塞门缝）— PixiJS 原生场景图
// 结构：intro旁白 → building爬楼塞传单 → walkhome黄昏 → night夜聊 → end章末卡
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
const MSG_AT = [3, 6, 9, 11] // 塞到第N张时来消息

const FLOORS = 6
const FLOOR_H = 90
const WORLD_H = 700
const DOOR_XS = [64, 184]
const STAIR_X = 300 // 楼梯区左缘
const GOAL = FLOORS * DOOR_XS.length
const STREET_FOOT_Y = 518

const INTRO_LINES = ['2019年夏天，高中毕业。', '我在市里打暑假工，发传单——', '整栋楼、整个小区地跑，', '把传单塞到每一户门口。']
const END_LINES = ['那年夏天，我们聊了很多很多。', '后来我说：']

interface Door {
  floor: number
  x: number
  done: boolean
  bubbleT: number
  gfx: Graphics
  bubble: Container
  bubbleText: Text
}

type Phase = 'intro' | 'building' | 'walkhome' | 'night' | 'end'

const slabY = (floor: number) => WORLD_H - floor * FLOOR_H // 该层地面像素y
const boyYOn = (floor: number) => slabY(floor) - CH - 2

export class Ch1Scene extends GameScene {
  phase: Phase = 'intro'
  boy = {
    x: 30,
    floor: 0,
    dir: 1 as 1 | -1,
    moving: false,
    targetX: null as number | null,
    action: null as { kind: 'door'; door: Door } | { kind: 'stairs' } | null,
    climbT: 0, // >0 表示爬楼动画中
  }
  doors: Door[] = []
  dust: { spr: Sprite; y: number; x: number; p: number }[] = []
  given = 0
  msgIdx = 0
  toastT = 999
  duskAlpha = 0
  homeX = -40
  chat: { her: boolean; s: string }[] = []
  choice: string[] | null = null
  endT = 0

  // ---- 场景图节点 ----
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

  // ---------- 搭建 ----------
  enter(g: Game) {
    this.buildWorld(g)
    this.buildStreet(g)
    this.buildOverlays(g)
    this.applyPhase()
  }

  private buildWorld(g: Game) {
    const walls = new Graphics()
    walls.rect(0, -60, W, WORLD_H + 120).fill('#cfc6b0')
    for (let f = 0; f < FLOORS; f++) {
      const sy = slabY(f)
      walls.rect(0, sy, W, 8).fill('#8a8580') // 楼板
      walls.rect(14, sy - 64, 26, 34).fill('#a8d8e8') // 窗
      // 阳光斜切（质感层）
      walls.poly([14, sy - 64, 40, sy - 64, 108, sy, 66, sy]).fill({ color: 0xfff4d6, alpha: 0.1 })
      if (f < FLOORS - 1) {
        for (let s = 0; s < 6; s++) walls.rect(STAIR_X + s * 9, sy - 10 - s * 13, 10 + (5 - s) * 9, 6).fill('#b3a88e')
      }
    }
    this.world.addChild(walls)
    for (let f = 0; f < FLOORS; f++) {
      this.world.addChild(label(`${f + 1}F`, 10, '#8a8580', { x: 46, y: slabY(f) - 60 }))
      if (f < FLOORS - 1) this.world.addChild(label('▲', 12, '#6f6a5e', { x: STAIR_X + 28, y: slabY(f) - 88, anchorX: 0.5 }))
    }
    // 门
    for (let f = 0; f < FLOORS; f++)
      for (const x of DOOR_XS) {
        const gfx = new Graphics()
        this.paintDoor(gfx, f, x, false)
        const bubbleText = label('', 10, '#1f1a17', { x: x + 22, y: slabY(f) - 92, anchorX: 0.5 })
        const bubble = new Container()
        bubble.addChild(new Graphics().rect(x - 8, slabY(f) - 96, 60, 20).fill({ color: 0xfaf7f0, alpha: 0.95 }), bubbleText)
        bubble.visible = false
        this.world.addChild(gfx, bubble)
        this.doors.push({ floor: f, x, done: false, bubbleT: 999, gfx, bubble, bubbleText })
      }
    // 浮尘
    for (let i = 0; i < 48; i++) {
      const spr = new Sprite(g.assets.rain[0]) // 任意纹理，立即换成白点
      const dot = new Graphics().rect(0, 0, 1.5, 1.5).fill(0xfff4d6)
      spr.visible = false
      this.dust.push({ spr, x: Math.random() * W, y: Math.random() * WORLD_H, p: Math.random() * Math.PI * 2 })
      this.world.addChild(dot)
      // 用Graphics点代替Sprite（保持引用一致）
      this.dust[this.dust.length - 1].spr = dot as unknown as Sprite
    }
    // 男主 + 提示
    this.boyAnim.set(g.assets.boyIdle, 24)
    this.world.addChild(this.boyAnim.spr, this.bang)
    this.addChild(this.world)
  }

  private paintDoor(gfx: Graphics, floor: number, x: number, done: boolean) {
    const sy = slabY(floor)
    gfx.clear()
    gfx.rect(x, sy - 70, 36, 70).fill(done ? '#6f5344' : '#8a6a52')
    gfx.rect(x + 28, sy - 40, 4, 8).fill('#5a4436') // 门把手
    if (done) gfx.rect(x + 6, sy - 12, 14, 8).fill('#faf7f0') // 塞好的传单
  }

  private buildStreet(g: Game) {
    const bg = new Sprite(g.assets.bg)
    this.homeBoy.set(g.assets.boyWalkSide, 8)
    this.duskG.alpha = 0
    this.streetC.addChild(bg, this.homeBoy.spr, this.duskG)
    this.addChild(this.streetC)
  }

  private buildOverlays(g: Game) {
    // HUD
    this.hudC.addChild(new Graphics().rect(0, 0, W, 30).fill({ color: 0x1f1a17, alpha: 0.75 }), this.hudL, this.hudR)
    // toast
    this.toastC.addChild(
      new Graphics().rect(20, 44, 320, 44).fill({ color: 0xfaf7f0, alpha: 0.95 }),
      new Graphics().rect(20, 44, 4, 44).fill('#4a6fa5'),
      label('楠', 11, '#4a6fa5', { x: 34, y: 50 }),
      this.toastMsg,
    )
    this.toastC.visible = false
    // intro
    this.introTexts = INTRO_LINES.map((_, i) => label('', 15, '#faf7f0', { x: 40, y: 250 + i * 31 }))
    this.introC.addChild(new Graphics().rect(0, 0, W, H).fill('#151318'), ...this.introTexts, this.introHint)
    // night
    const dim = new Graphics().rect(0, 0, W, H).fill({ color: 0x15131a, alpha: 0.88 })
    const phone = new Sprite(g.assets.phone)
    phone.position.set(30, 60)
    const screen = new Graphics().rect(46, 110, 268, 420).fill('#faf7f0')
    this.nightC.addChild(dim, phone, screen, label('楠 · QQ', 13, '#1f1a17', { x: W / 2, y: 120, anchorX: 0.5 }), this.chatBox, this.choiceBox)
    // end
    this.endTexts = END_LINES.map((_, i) => label('', 14, '#faf7f0', { x: 40, y: 240 + i * 30 }))
    this.endC.addChild(new Graphics().rect(0, 0, W, H).fill('#151318'), ...this.endTexts, this.endBig, this.endSub, this.endHint)
    this.addChild(this.hudC, this.toastC, this.introC, this.nightC, this.endC)
  }

  private applyPhase() {
    this.introC.visible = this.phase === 'intro'
    this.world.visible = this.phase === 'building'
    this.streetC.visible = this.phase === 'walkhome' || this.phase === 'night'
    this.nightC.visible = this.phase === 'night'
    this.endC.visible = this.phase === 'end'
    this.hudC.visible = this.phase === 'building' || this.phase === 'walkhome'
  }

  // ---------- 更新 ----------
  update(g: Game) {
    if (this.phase === 'intro') {
      const slices = typeSlice(INTRO_LINES, this.t)
      this.introTexts.forEach((tx, i) => (tx.text = slices[i]))
      this.introHint.visible = this.t > 200 && this.t % 60 < 40
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
    if (this.phase === 'building') this.updateBuilding(g)
    if (this.phase === 'walkhome') {
      this.homeX += 0.9
      if (this.duskAlpha < 0.16) this.duskAlpha += 0.002
      this.duskG.alpha = this.duskAlpha
      this.homeBoy.tick(this.t)
      this.homeBoy.spr.position.set(this.homeX + CW / 2, STREET_FOOT_Y - CH)
      if (this.homeX > W + 40) this.startNight(g)
    }
    this.hudL.text = `传单 ${this.given}/${GOAL}`
    this.hudR.text = this.phase === 'building' ? `${this.boy.floor + 1}F` : ''
  }

  private updateBuilding(g: Game) {
    const b = this.boy
    this.doors.forEach(d => {
      d.bubbleT++
      d.bubble.visible = d.bubbleT < 60
    })
    // 爬楼动画
    if (b.climbT > 0) {
      b.climbT--
      if (b.climbT === 0) {
        b.floor++
        b.x = STAIR_X - 10
        b.targetX = null
      }
    } else {
      // 键盘 / 寻路
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
        }
      }
      if (g.pressed.has(' ')) {
        const d = this.nearestDoor()
        if (d) this.stuffDoor(g, d)
      }
      b.x = Math.max(6, Math.min(W - CW - 6, b.x))
    }

    // 浮尘
    this.dust.forEach(m => {
      m.y -= 0.07
      m.x += Math.sin(this.t / 40 + m.p) * 0.12
      if (m.y < 0) m.y = WORLD_H
      m.spr.position.set(m.x, m.y)
      m.spr.alpha = 0.18 + 0.18 * Math.sin(this.t / 18 + m.p)
    })

    // 视觉同步
    const boyY = b.climbT > 0 ? boyYOn(b.floor) - ((40 - b.climbT) / 40) * FLOOR_H : boyYOn(b.floor)
    const cam = Math.max(0, Math.min(boyY - 350, WORLD_H - H))
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
    return this.doors.find(d => d.floor === b.floor && !d.done && Math.abs(d.x + 18 - (b.x + CW / 2)) < 30) || null
  }

  private tryClimb() {
    const b = this.boy
    if (b.floor >= FLOORS - 1) return
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
    this.paintDoor(d.gfx, d.floor, d.x, true)
    const r = Math.random()
    if (r < 0.18) { d.bubbleText.text = '汪汪汪！'; d.bubbleT = 0; g.audio.sndNo() }
    else if (r < 0.28) { d.bubbleText.text = '谁呀？！'; d.bubbleT = 0 }
    if (MSG_AT.includes(this.given) && this.msgIdx < HER_MSGS.length) this.toast(g, HER_MSGS[this.msgIdx++])
    if (this.given >= GOAL) {
      window.setTimeout(() => {
        this.phase = 'walkhome'
        g.audio.bgm('dusk')
        g.setMood('dusk')
        this.toast(g, '今天也辛苦啦')
        this.applyPhase()
      }, 1600)
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
      if (this.t > 120) {
        this.phase = 'building'
        g.audio.cicada(true)
        g.audio.bgm('day')
        g.setMood('noon')
        this.applyPhase()
      }
      return
    }
    if (this.phase === 'building') {
      const b = this.boy
      if (b.climbT > 0) return
      const cam = -this.world.y
      const wy = y + cam
      const sy = slabY(b.floor)
      const d = this.doors.find(
        d => d.floor === b.floor && !d.done && Math.abs(d.x + 18 - x) < 26 && wy > sy - 80 && wy < sy + 10,
      )
      if (d) {
        b.targetX = d.x + 18 - CW / 2
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
