// 第1章 · 蝉鸣：2019夏 · 发传单
// 结构：intro旁白 → street发传单 → dusk黄昏 → night夜聊 → end章末卡
import type { Game, Scene } from '../core/engine'
import { W, H } from '../core/engine'
import type { Sheet } from '../core/assets'
import { CH } from '../core/assets'
import { txt, typewriter } from '../core/text'
import { MemoScene } from './memo'

const HER_MSGS = [
  '天这么热，多喝点水呀',
  '记得拿湿巾擦擦汗！',
  '别中暑啦，找个阴凉躲会儿',
  '今天发出去多少张啦？',
  '加油呀~ 晚上给你唱歌听',
]
const NPC_TINTS = ['#c4554d', '#6a994e', '#f2cc8f', '#8a7ca8']
const GOAL = 8
const GROUND_Y = 470

interface Npc {
  x: number
  y: number
  dir: 1 | -1
  spd: number
  sheet: Sheet
  done: boolean
  mark: '✗' | '♥' | null
  markT: number
}

interface Toast {
  msg: string
  t: number
}

interface ChatMsg {
  her: boolean
  s: string
}

type Phase = 'intro' | 'street' | 'night' | 'end'

export class Ch1Scene implements Scene {
  phase: Phase = 'intro'
  boy = { x: 60, dir: 1 as 1 | -1, moving: false, target: null as number | null }
  npcs: Npc[] = []
  tints: Sheet[] = []
  given = 0
  rejected = 0
  msgIdx = 0
  toasts: Toast[] = []
  dusk = false
  duskAlpha = 0
  spawnCd = 0
  chat: ChatMsg[] = []
  choice: string[] | null = null
  chatTimers: number[] = []
  endT = 0

  enter(g: Game) {
    this.tints = NPC_TINTS.map(c => g.assets.boyWalkSide.tinted(c))
  }

  // ---------- 更新 ----------
  update(g: Game) {
    if (this.phase === 'intro') {
      if (g.t > 90 && (g.pressed.has(' ') || false)) this.startStreet(g)
      return
    }
    if (this.phase === 'street') this.updateStreet(g)
    if (this.phase === 'end') this.endT++
  }

  private startStreet(g: Game) {
    this.phase = 'street'
    g.audio.cicada(true)
    g.audio.bgm('day')
  }

  private updateStreet(g: Game) {
    const b = this.boy
    // 移动
    if (g.keys.ArrowLeft) { b.x -= 1.6; b.dir = -1; b.moving = true; b.target = null }
    else if (g.keys.ArrowRight) { b.x += 1.6; b.dir = 1; b.moving = true; b.target = null }
    else if (b.target != null && Math.abs(b.target - b.x) > 3) {
      b.dir = Math.sign(b.target - b.x) as 1 | -1
      b.x += 1.6 * b.dir
      b.moving = true
    } else b.moving = false
    b.x = Math.max(0, Math.min(W - 32, b.x))
    if (g.pressed.has(' ')) this.giveFlyer(g)

    // NPC 生成与移动
    if (!this.dusk && this.npcs.length < 4 && --this.spawnCd <= 0) {
      this.spawnCd = 80 + Math.random() * 60
      const fromLeft = Math.random() < 0.5
      this.npcs.push({
        x: fromLeft ? -40 : W + 40,
        y: 455 + Math.random() * 60,
        dir: fromLeft ? 1 : -1,
        spd: 0.6 + Math.random() * 0.5,
        sheet: this.tints[(Math.random() * this.tints.length) | 0],
        done: false,
        mark: null,
        markT: 0,
      })
    }
    this.npcs.forEach(n => (n.x += n.spd * n.dir))
    this.npcs = this.npcs.filter(n => n.x > -60 && n.x < W + 60)

    // toast 计时
    this.toasts.forEach(m => m.t++)
    this.toasts = this.toasts.filter(m => m.t < 260)

    // 黄昏渐变
    if (this.dusk && this.duskAlpha < 0.32) this.duskAlpha += 0.002
  }

  private giveFlyer(g: Game) {
    if (this.phase !== 'street') return
    const n = this.npcs.find(n => !n.done && Math.abs(n.x - this.boy.x) < 30)
    if (!n) return
    n.done = true
    if (Math.random() < 0.62 && this.given < GOAL) {
      n.mark = '✗'
      n.spd *= 1.8
      this.rejected++
      g.audio.sndNo()
    } else {
      n.mark = '♥'
      this.given++
      g.audio.sndOk()
      if (this.given % 2 === 0 && this.msgIdx < HER_MSGS.length) this.toast(g, HER_MSGS[this.msgIdx++])
      if (this.given >= GOAL) {
        window.setTimeout(() => {
          this.dusk = true
          g.audio.bgm('dusk')
          this.toast(g, '今天也辛苦啦')
          window.setTimeout(() => this.startNight(g), 3000)
        }, 2200)
      }
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
    this.chat = [{ her: true, s: '下班啦？今天累不累呀' }]
    this.choice = ['还好，就是有点晒', '看到你消息，就不累了']
  }

  private pickChoice(g: Game, i: number) {
    if (!this.choice) return
    this.chat.push({ her: false, s: this.choice[i] })
    this.choice = null
    g.audio.sndMsg()
    this.chatTimers.push(
      window.setTimeout(() => {
        this.chat.push({ her: true, s: i === 0 ? '那明天记得涂防晒呀！' : '油嘴滑舌…但我爱听' })
        this.chatTimers.push(
          window.setTimeout(() => {
            this.chat.push({ her: true, s: '明天也给你发消息呀' })
            this.chatTimers.push(
              window.setTimeout(() => {
                this.phase = 'end'
                g.audio.bgm('off')
                g.audio.sndOk()
                g.save.unlock(1)
              }, 1800),
            )
          }, 1500),
        )
      }, 900),
    )
  }

  // ---------- 绘制 ----------
  draw(g: Game, ctx: CanvasRenderingContext2D) {
    if (this.phase === 'intro') return this.drawIntro(g, ctx)
    if (this.phase === 'end') return this.drawEnd(g, ctx)

    const A = g.assets
    ctx.drawImage(A.bg, 0, 0)

    // NPC
    this.npcs.forEach(n => {
      const f = Math.floor(g.t / 8) % 4
      n.sheet.draw(ctx, f, n.x, n.y, n.dir < 0)
      if (n.mark && n.markT++ < 50)
        txt(ctx, n.mark, n.x + 16, n.y - 16, 16, n.mark === '♥' ? '#c4554d' : '#5c6b7a', 'center')
    })

    // 男主
    const b = this.boy
    const sheet = b.moving ? A.boyWalkSide : A.boyIdle
    const f = Math.floor(g.t / (b.moving ? 8 : 24)) % sheet.frames
    sheet.draw(ctx, f, b.x, GROUND_Y, b.moving && b.dir < 0)
    if (this.phase === 'street' && this.npcs.some(n => !n.done && Math.abs(n.x - b.x) < 30))
      txt(ctx, '!', b.x + 16, GROUND_Y - CH / 2, 16, '#f2cc8f', 'center')

    // 黄昏
    if (this.duskAlpha > 0) {
      ctx.fillStyle = `rgba(214,110,58,${this.duskAlpha})`
      ctx.fillRect(0, 0, W, H)
    }

    // HUD
    ctx.fillStyle = 'rgba(31,26,23,.75)'
    ctx.fillRect(0, 0, W, 30)
    txt(ctx, `传单 ${this.given}/${GOAL}`, 10, 8, 13, '#faf7f0')
    txt(ctx, `被拒 ${this.rejected}`, W - 10, 8, 13, '#8a8580', 'right')

    // 消息 toast
    this.toasts.forEach(m => {
      if (m.t >= 260) return
      ctx.fillStyle = 'rgba(250,247,240,.95)'
      ctx.fillRect(20, 44, 320, 44)
      ctx.fillStyle = '#4a6fa5'
      ctx.fillRect(20, 44, 4, 44)
      txt(ctx, '楠', 34, 50, 11, '#4a6fa5')
      txt(ctx, m.msg, 34, 66, 13, '#1f1a17')
    })

    if (this.phase === 'night') this.drawNight(g, ctx)
  }

  private drawIntro(g: Game, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#151318'
    ctx.fillRect(0, 0, W, H)
    typewriter(ctx, ['2019年夏天，高中毕业。', '我在市里打暑假工，发传单。'], g.t, 40, 280, 15, '#faf7f0')
    if (g.t > 120 && g.t % 60 < 40) txt(ctx, '点击继续 ▸', W - 40, 580, 12, '#8a8580', 'right')
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
      const w = Math.min(200, c.s.length * 13 + 20)
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
      if (g.t > 90) this.startStreet(g)
      return
    }
    if (this.phase === 'street') {
      const near = this.npcs.some(n => !n.done && Math.abs(n.x - this.boy.x) < 30)
      if (near && Math.abs(x - this.boy.x - 16) < 40 && Math.abs(y - (GROUND_Y + CH / 2)) < 80) this.giveFlyer(g)
      else this.boy.target = x - 16
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
