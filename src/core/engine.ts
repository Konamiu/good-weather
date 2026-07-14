// 引擎：PixiJS v8 原生场景图。GameScene 即 Container，对象级滤镜/补间全部可用。
import { Application, ColorMatrixFilter, Container, Sprite, Texture } from 'pixi.js'
import type { GameAssets } from './assets'
import { AudioSys } from './audio'
import { Save } from './save'
import { applyMood, type Mood } from './mood'

export const W = 360
export const H = 640

export abstract class GameScene extends Container {
  /** 场景内帧计数（由引擎递增） */
  t = 0
  enter(_g: Game): void {}
  update(_g: Game): void {}
  onTap?(g: Game, x: number, y: number): void
  onHold?(g: Game, x: number, y: number): void
}

export class Game {
  app = new Application()
  /** 场景层（mood滤镜作用于此，暗角不受影响） */
  private sceneLayer = new Container()
  private grade = new ColorMatrixFilter()
  scene: GameScene | null = null

  keys: Record<string, boolean> = {}
  /** 本帧刚按下的键（边沿触发） */
  pressed = new Set<string>()
  assets!: GameAssets
  audio = new AudioSys()
  save = new Save()

  async init(mount: HTMLElement) {
    await this.app.init({ width: W, height: H, background: '#151318', antialias: false, roundPixels: true })
    mount.replaceWith(this.app.canvas)

    this.sceneLayer.filters = [this.grade]
    this.app.stage.addChild(this.sceneLayer)
    this.app.stage.addChild(this.makeVignette())

    // 输入
    addEventListener('keydown', e => {
      if (!this.keys[e.key]) this.pressed.add(e.key)
      this.keys[e.key] = true
      this.audio.init()
    })
    addEventListener('keyup', e => (this.keys[e.key] = false))
    let holdTimer = 0
    this.app.canvas.addEventListener('pointerdown', e => {
      this.audio.init()
      const [x, y] = this.toGame(e as PointerEvent)
      holdTimer = window.setTimeout(() => this.scene?.onHold?.(this, x, y), 550)
      this.scene?.onTap?.(this, x, y)
    })
    this.app.canvas.addEventListener('pointerup', () => clearTimeout(holdTimer))
    this.app.canvas.addEventListener('pointercancel', () => clearTimeout(holdTimer))

    this.app.ticker.add(() => {
      if (this.scene) {
        this.scene.t++
        this.scene.update(this)
      }
      this.pressed.clear()
    })
  }

  /** 全屏色彩分级（星露谷式时段氛围） */
  setMood(m: Mood) {
    applyMood(this.grade, m)
  }

  setScene(s: GameScene) {
    if (this.scene) {
      this.sceneLayer.removeChild(this.scene)
      this.scene.destroy({ children: true })
    }
    this.scene = s
    this.setMood('none')
    this.sceneLayer.addChild(s)
    s.enter(this)
  }

  private toGame(e: PointerEvent): [number, number] {
    const r = this.app.canvas.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }

  private makeVignette(): Sprite {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const x = c.getContext('2d')!
    const vg = x.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.75)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.20)')
    x.fillStyle = vg
    x.fillRect(0, 0, W, H)
    const spr = new Sprite(Texture.from(c))
    spr.eventMode = 'none'
    return spr
  }
}
