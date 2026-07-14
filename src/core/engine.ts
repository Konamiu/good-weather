// 微引擎：360x640 固定逻辑分辨率，场景栈 + 输入 + 主循环
import type { GameAssets } from './assets'
import { AudioSys } from './audio'
import { Save } from './save'

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
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  scene: Scene | null = null
  /** 当前场景内的帧计数 */
  t = 0
  keys: Record<string, boolean> = {}
  /** 本帧刚按下的键（边沿触发） */
  pressed = new Set<string>()
  assets!: GameAssets
  audio = new AudioSys()
  save = new Save()

  constructor(mount: HTMLElement) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = W
    this.canvas.height = H
    mount.replaceWith(this.canvas)
    this.ctx = this.canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false

    addEventListener('keydown', e => {
      if (!this.keys[e.key]) this.pressed.add(e.key)
      this.keys[e.key] = true
      this.audio.init()
    })
    addEventListener('keyup', e => (this.keys[e.key] = false))

    let holdTimer = 0
    this.canvas.addEventListener('pointerdown', e => {
      this.audio.init()
      const [x, y] = this.toGame(e)
      holdTimer = window.setTimeout(() => this.scene?.onHold?.(this, x, y), 550)
      this.scene?.onTap?.(this, x, y)
    })
    this.canvas.addEventListener('pointerup', () => clearTimeout(holdTimer))
    this.canvas.addEventListener('pointercancel', () => clearTimeout(holdTimer))
  }

  private toGame(e: PointerEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }

  setScene(s: Scene) {
    this.scene = s
    this.t = 0
    s.enter?.(this)
  }

  start() {
    const loop = () => {
      this.t++
      if (this.scene) {
        this.scene.update(this)
        this.scene.draw(this, this.ctx)
      }
      this.pressed.clear()
      requestAnimationFrame(loop)
    }
    loop()
  }
}
