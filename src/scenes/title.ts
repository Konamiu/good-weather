import type { Game, Scene } from '../core/engine'
import { W } from '../core/engine'
import { txt } from '../core/text'
import { MemoScene } from './memo'

export class TitleScene implements Scene {
  update() {}

  draw(g: Game, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#151318'
    ctx.fillRect(0, 0, 360, 640)
    txt(ctx, '好 天 气', W / 2, 250, 40, '#f2cc8f', 'center')
    txt(ctx, 'GOOD WEATHER', W / 2, 305, 12, '#8a8580', 'center')
    if (g.t % 60 < 40) txt(ctx, '点击开始', W / 2, 420, 14, '#faf7f0', 'center')
  }

  onTap(g: Game) {
    g.setScene(new MemoScene())
  }
}
