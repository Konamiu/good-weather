// 手动帧动画：比 AnimatedSprite 更适合频繁切换动作的角色
import { Sprite, Texture } from 'pixi.js'

export class Anim {
  spr = new Sprite()
  private frames: Texture[] = []
  private speed = 8

  constructor() {
    this.spr.anchor.set(0.5, 0) // 中心锚点便于水平翻转
  }

  /** 切换动作（同一组帧重复调用无副作用） */
  set(frames: Texture[], speed = 8) {
    this.frames = frames
    this.speed = speed
  }

  set flip(v: boolean) {
    this.spr.scale.x = v ? -1 : 1
  }

  tick(t: number) {
    if (this.frames.length) this.spr.texture = this.frames[Math.floor(t / this.speed) % this.frames.length]
  }
}
