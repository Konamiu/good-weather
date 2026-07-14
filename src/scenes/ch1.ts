// 第1章 · 蝉鸣：2019夏 · 发传单（爬楼塞门缝）
// 结构：intro旁白 → building爬楼塞传单 → walkhome黄昏 → night夜聊 → end章末卡
import type { Game, Scene } from '../core/engine'
import { W, H } from '../core/engine'
import { CH, CW } from '../core/assets'
import { txt, typewriter } from '../core/text'
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

interface Door {
  floor: number
  x: number
  done: boolean
  /** 塞完的彩蛋反应：狗叫/开门 */
  bubble: string | null
  bubbleT: number
}

interface Toast {
  msg: string
  t: number
}

interface ChatMsg {
  her: boolean
  s: string
}

type Phase = 'intro' | 'building' | 'walkhome' | 'night' | 'end'

const slabY = (floor: number) => WORLD_H - floor * FLOOR_H // 该层地面像素y
const boyYOn = (floor: number) => slabY(floor) - CH - 2

export class Ch1Scene implements Scene {
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
  /** 楼道浮尘（质感层） */
  dust: { x: number; y: number; p: number }[] = []
  given = 0
  msgIdx = 0
  toasts: Toast[] = []
  duskAlpha = 0
  homeX = -40
  chat: ChatMsg[] = []
  choice: string[] | null = null
  endT = 0

  enter() {
    for (let f = 0; f < FLOORS; f++)
      for (const x of DOOR_XS) this.doors.push({ floor: f, x, done: false, bubble: null, bubbleT: 0 })
    for (let i = 0; i < 48; i++)
      this.dust.push({ x: Math.random() * W, y: Math.random() * WORLD_H, p: Math.random() * Math.PI * 2 })
  }

  // ---------- 更新 ----------
  update(g: Game) {
    if (this.phase === 'building') this.updateBuilding(g)
    if (this.phase === 'walkhome') {
      this.homeX += 0.9
      if (this.duskAlpha < 0.16) this.duskAlpha += 0.002 // 色调交给mood滤镜，覆盖层只留薄薄一层
      this.tickToasts()
      if (this.homeX > W + 40) this.startNight(g)
    }
    if (this.phase === 'end') this.endT++
  }

  private tickToasts() {
    this.toasts.forEach(m => m.t++)
    this.toasts = this.toasts.filter(m => m.t < 260)
  }

  private updateBuilding(g: Game) {
    const b = this.boy
    this.tickToasts()
    this.doors.forEach(d => d.bubble && d.bubbleT++)
    this.dust.forEach(m => {
      m.y -= 0.07
      m.x += Math.sin(g.t / 40 + m.p) * 0.12
      if (m.y < 0) m.y = WORLD_H
    })

    // 爬楼动画
    if (b.climbT > 0) {
      b.climbT--
      if (b.climbT === 0) {
        b.floor++
        b.x = STAIR_X - 10
        b.targetX = null
      }
      return
    }
    // 键盘
    if (g.keys.ArrowLeft) { b.x -= 1.6; b.dir = -1; b.moving = true; b.targetX = null; b.action = null }
    else if (g.keys.ArrowRight) { b.x += 1.6; b.dir = 1; b.moving = true; b.targetX = null; b.action = null }
    else if (g.pressed.has('ArrowUp')) { this.tryClimb() }
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

  private nearestDoor(): Door | null {
    const b = this.boy
    return (
      this.doors.find(d => d.floor === b.floor && !d.done && Math.abs(d.x + 18 - (b.x + CW / 2)) < 30) || null
    )
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
    // 彩蛋反应
    const r = Math.random()
    if (r < 0.18) { d.bubble = '汪汪汪！'; d.bubbleT = 0; g.audio.sndNo() }
    else if (r < 0.28) { d.bubble = '谁呀？！'; d.bubbleT = 0 }
    if (MSG_AT.includes(this.given) && this.msgIdx < HER_MSGS.length) this.toast(g, HER_MSGS[this.msgIdx++])
    if (this.given >= GOAL) {
      window.setTimeout(() => {
        this.phase = 'walkhome'
        g.audio.bgm('dusk')
        g.setMood('dusk')
        this.toast(g, '今天也辛苦啦')
      }, 1600)
    }
  }

  private toast(g: Game, msg: string) {
    g.audio.sndMsg()
    this.toasts.push({ msg, t: 0 })
  }

  // ---------- 夜聊 ----------
  private startNight(g: Game) {
    this.phase = 'night'
    g.audio.cicada(false)
    g.setMood('night')
    this.chat = [{ her: true, s: '下班啦？今天累不累呀' }]
    this.choice = ['腿快跑断了…但还好', '看到你消息，就不累了']
  }

  private pickChoice(g: Game, i: number) {
    if (!this.choice) return
    this.chat.push({ her: false, s: this.choice[i] })
    this.choice = null
    g.audio.sndMsg()
    window.setTimeout(() => {
      this.chat.push({ her: true, s: i === 0 ? '心疼…明天少爬两栋嘛' : '油嘴滑舌…但我爱听' })
      window.setTimeout(() => {
        this.chat.push({ her: true, s: '明天也给你发消息呀' })
        window.setTimeout(() => {
          this.phase = 'end'
          g.audio.bgm('off')
          g.audio.sndOk()
          g.setMood('none')
          g.save.unlock(1)
        }, 1800)
      }, 1500)
    }, 900)
  }

  // ---------- 绘制 ----------
  draw(g: Game, ctx: CanvasRenderingContext2D) {
    if (this.phase === 'intro') return this.drawIntro(g, ctx)
    if (this.phase === 'end') return this.drawEnd(g, ctx)
    if (this.phase === 'building') this.drawBuilding(g, ctx)
    else {
      // walkhome / night 底图：街道
      ctx.drawImage(g.assets.bg, 0, 0)
      if (this.phase === 'walkhome') {
        const f = Math.floor(g.t / 8) % 4
        g.assets.boyWalkSide.draw(ctx, f, this.homeX, STREET_FOOT_Y - CH)
      }
      if (this.duskAlpha > 0) {
        ctx.fillStyle = `rgba(214,110,58,${this.duskAlpha})`
        ctx.fillRect(0, 0, W, H)
      }
    }
    this.drawHud(ctx)
    this.drawToasts(ctx)
    if (this.phase === 'night') this.drawNight(g, ctx)
  }

  /** 楼道剖面（占位画法，待Codex楼道瓷砖替换） */
  private drawBuilding(g: Game, ctx: CanvasRenderingContext2D) {
    const b = this.boy
    const boyY = b.climbT > 0 ? boyYOn(b.floor) - ((40 - b.climbT) / 40) * FLOOR_H : boyYOn(b.floor)
    const cam = Math.max(0, Math.min(boyY - 350, WORLD_H - H))
    ctx.save()
    ctx.translate(0, -cam)

    // 墙面
    ctx.fillStyle = '#cfc6b0'
    ctx.fillRect(0, cam > 0 ? 0 : -60, W, WORLD_H + 60)
    for (let f = 0; f < FLOORS; f++) {
      const sy = slabY(f)
      // 楼板
      ctx.fillStyle = '#8a8580'
      ctx.fillRect(0, sy, W, 8)
      // 窗户（左侧，透出天色）
      ctx.fillStyle = '#a8d8e8'
      ctx.fillRect(14, sy - 64, 26, 34)
      // 正午阳光从窗口斜切进楼道（质感层）
      ctx.save()
      ctx.globalAlpha = 0.1
      ctx.fillStyle = '#fff4d6'
      ctx.beginPath()
      ctx.moveTo(14, sy - 64)
      ctx.lineTo(40, sy - 64)
      ctx.lineTo(108, sy)
      ctx.lineTo(66, sy)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      // 楼层号
      txt(ctx, `${f + 1}F`, 46, sy - 60, 10, '#8a8580')
      // 门
      this.doors.filter(d => d.floor === f).forEach(d => {
        ctx.fillStyle = d.done ? '#6f5344' : '#8a6a52'
        ctx.fillRect(d.x, sy - 70, 36, 70)
        ctx.fillStyle = '#5a4436'
        ctx.fillRect(d.x + 28, sy - 40, 4, 8) // 门把手
        if (d.done) {
          ctx.fillStyle = '#faf7f0' // 塞好的传单
          ctx.fillRect(d.x + 6, sy - 12, 14, 8)
        }
        if (d.bubble && d.bubbleT < 60) {
          ctx.fillStyle = 'rgba(250,247,240,.95)'
          ctx.fillRect(d.x - 8, sy - 96, 60, 20)
          txt(ctx, d.bubble, d.x + 22, sy - 92, 10, '#1f1a17', 'center')
        }
      })
      // 楼梯（右侧，通往上一层）
      if (f < FLOORS - 1) {
        ctx.fillStyle = '#b3a88e'
        for (let s = 0; s < 6; s++) ctx.fillRect(STAIR_X + s * 9, sy - 10 - s * 13, 10 + (5 - s) * 9, 6)
        txt(ctx, '▲', STAIR_X + 28, sy - 88, 12, '#6f6a5e', 'center')
      }
    }
    // 浮尘（光里的尘埃，闪烁）
    this.dust.forEach(m => {
      const a = 0.18 + 0.18 * Math.sin(g.t / 18 + m.p)
      ctx.fillStyle = `rgba(255,244,214,${a.toFixed(2)})`
      ctx.fillRect(m.x, m.y, 1.5, 1.5)
    })
    // 男主
    const sheet = b.climbT > 0 ? g.assets.boyWalkUp : b.moving ? g.assets.boyWalkSide : g.assets.boyIdle
    const f = Math.floor(g.t / (b.moving || b.climbT > 0 ? 8 : 24)) % sheet.frames
    sheet.draw(ctx, f, b.x, boyY, b.moving && b.dir < 0)
    // 附近可塞的门提示
    const nd = this.nearestDoor()
    if (nd) txt(ctx, '!', b.x + CW / 2, boyY - 14, 16, '#f2cc8f', 'center')
    ctx.restore()
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(31,26,23,.75)'
    ctx.fillRect(0, 0, W, 30)
    txt(ctx, `传单 ${this.given}/${GOAL}`, 10, 8, 13, '#faf7f0')
    if (this.phase === 'building') txt(ctx, `${this.boy.floor + 1}F`, W - 10, 8, 13, '#8a8580', 'right')
  }

  private drawToasts(ctx: CanvasRenderingContext2D) {
    this.toasts.forEach(m => {
      ctx.fillStyle = 'rgba(250,247,240,.95)'
      ctx.fillRect(20, 44, 320, 44)
      ctx.fillStyle = '#4a6fa5'
      ctx.fillRect(20, 44, 4, 44)
      txt(ctx, '楠', 34, 50, 11, '#4a6fa5')
      txt(ctx, m.msg, 34, 66, 13, '#1f1a17')
    })
  }

  private drawIntro(g: Game, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#151318'
    ctx.fillRect(0, 0, W, H)
    typewriter(
      ctx,
      ['2019年夏天，高中毕业。', '我在市里打暑假工，发传单——', '整栋楼、整个小区地跑，', '把传单塞到每一户门口。'],
      g.t, 40, 250, 15, '#faf7f0',
    )
    if (g.t > 200 && g.t % 60 < 40) txt(ctx, '点击继续 ▸', W - 40, 580, 12, '#8a8580', 'right')
  }

  private drawNight(g: Game, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(21,19,24,.88)'
    ctx.fillRect(0, 0, W, H)
    ctx.drawImage(g.assets.phone, 30, 60)
    ctx.fillStyle = '#faf7f0'
    ctx.fillRect(46, 110, 268, 420)
    txt(ctx, '楠 · QQ', W / 2, 120, 13, '#1f1a17', 'center')
    let cy = 150
    this.chat.forEach(c => {
      const w = Math.min(210, c.s.length * 13 + 20)
      const cx = c.her ? 56 : 304 - w
      ctx.fillStyle = c.her ? '#e8e3d8' : '#4a6fa5'
      ctx.fillRect(cx, cy, w, 34)
      txt(ctx, c.s, cx + 10, cy + 10, 12, c.her ? '#1f1a17' : '#faf7f0')
      cy += 44
    })
    this.choice?.forEach((c, i) => {
      ctx.fillStyle = '#f2cc8f'
      ctx.fillRect(56, 430 + i * 60, 248, 46)
      txt(ctx, c, W / 2, 445 + i * 60, 13, '#1f1a17', 'center')
    })
  }

  private drawEnd(g: Game, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#151318'
    ctx.fillRect(0, 0, W, H)
    typewriter(ctx, ['那年夏天，我们聊了很多很多。', '后来我说：'], this.endT, 40, 240, 14, '#faf7f0')
    if (this.endT > 160) txt(ctx, '「 试 试 吧 」', W / 2, 330, 26, '#f2cc8f', 'center')
    if (this.endT > 220) {
      txt(ctx, '—— 我们在一起了', W / 2, 390, 13, '#8a8580', 'center')
      if (g.t % 60 < 40) txt(ctx, '点击返回备忘录', W / 2, 560, 12, '#8a8580', 'center')
    }
  }

  // ---------- 输入 ----------
  onTap(g: Game, x: number, y: number) {
    if (this.phase === 'intro') {
      if (g.t > 120) {
        this.phase = 'building'
        g.audio.cicada(true)
        g.audio.bgm('day')
        g.setMood('noon')
      }
      return
    }
    if (this.phase === 'building') {
      const b = this.boy
      if (b.climbT > 0) return
      const boyY = boyYOn(b.floor)
      const cam = Math.max(0, Math.min(boyY - 350, WORLD_H - H))
      const wy = y + cam
      const sy = slabY(b.floor)
      // 点了本层的门 → 走过去塞
      const d = this.doors.find(
        d => d.floor === b.floor && !d.done && Math.abs(d.x + 18 - x) < 26 && wy > sy - 80 && wy < sy + 10,
      )
      if (d) {
        b.targetX = d.x + 18 - CW / 2
        b.action = { kind: 'door', door: d }
        return
      }
      // 点了楼梯区 → 爬楼
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
