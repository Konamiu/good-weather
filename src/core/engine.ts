// 微引擎：逻辑层仍是 360x640 Canvas2D 立即模式（场景代码不变），
// 渲染层升级为 PixiJS v8 —— Canvas 画面作为纹理进 WebGL，之上叠全屏滤镜(色彩分级等)。
import { Application, Sprite, Texture, ColorMatrixFilter } from 'pixi.js'
import type { GameAssets } from './assets'
import { AudioSys } from './audio'
import { Save } from './save'
import { applyMood, type Mood } from './mood'

export const W = 360
export const H = 640

export interface Scene {
  enter?(g: Game): void
  update(g: Game): void
  draw(g: Game, ctx: CanvasRenderingContext2D): void
  /** 逻辑坐标系点击 */
  onTap?(g: Game, x: number, y: number): void
  /** 长按（显影用） */
  onHold?(g: Game, x: number, y: number): void
}

export class Game {
  /** 逻辑画布（离屏）：场景往这里画 */
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  app: Application | null = null
  private screenTex: Texture | null = null
  private grade = new ColorMatrixFilter()
  private vignette: CanvasGradient | null = null

  scene: Scene | null = null
  /** 当前场景内的帧计数 */
  t = 0
  keys: Record<string, boolean> = {}
  /** 本帧刚按下的键（边沿触发） */
  pressed = new Set<string>()
  assets!: GameAssets
  audio = new AudioSys()
  save = new Save()

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = W
    this.canvas.height = H
    this.ctx = this.canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
  }

  /** 初始化 Pixi 渲染层并挂载 */
  async init(mount: HTMLElement) {
    const app = new Application()
    await app.init({ width: W, height: H, background: '#151318', antialias: false })
    this.app = app
    mount.replaceWith(app.canvas)

    this.screenTex = Texture.from(this.canvas)
    this.screenTex.source.scaleMode = 'nearest'
    const spr = new Sprite(this.screenTex)
    app.stage.addChild(spr)
    app.stage.filters = [this.grade]

    // 输入
    addEventListener('keydown', e => {
      if (!this.keys[e.key]) this.pressed.add(e.key)
      this.keys[e.key] = true
      this.audio.init()
    })
    addEventListener('keyup', e => (this.keys[e.key] = false))
    let holdTimer = 0
    app.canvas.addEventListener('pointerdown', e => {
      this.audio.init()
      const [x, y] = this.toGame(e as PointerEvent)
      holdTimer = window.setTimeout(() => this.scene?.onHold?.(this, x, y), 550)
      this.scene?.onTap?.(this, x, y)
    })
    app.canvas.addEventListener('pointerup', () => clearTimeout(holdTimer))
    app.canvas.addEventListener('pointercancel', () => clearTimeout(holdTimer))

    // 暗角（质感层，画在逻辑画布最后）
    const vg = this.ctx.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.75)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.20)')
    this.vignette = vg

    app.ticker.add(() => this.tick())
  }

  /** 场景切换全屏色调（星露谷式时段氛围） */
  setMood(m: Mood) {
    applyMood(this.grade, m)
  }

  private toGame(e: PointerEvent): [number, number] {
    const canvas = this.app!.canvas
    const r = canvas.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }

  setScene(s: Scene) {
    this.scene = s
    this.t = 0
    this.setMood('none')
    s.enter?.(this)
  }

  private tick() {
    this.t++
    if (this.scene) {
      this.scene.update(this)
      this.scene.draw(this, this.ctx)
      if (this.vignette) {
        this.ctx.fillStyle = this.vignette
        this.ctx.fillRect(0, 0, W, H)
      }
    }
    this.screenTex?.source.update()
    this.pressed.clear()
  }
}
