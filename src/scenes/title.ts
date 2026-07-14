import type { Game } from '../core/engine'
import { GameScene, W } from '../core/engine'
import { label } from '../core/ui'
import { MemoScene } from './memo'

export class TitleScene extends GameScene {
  private hint = label('点击开始', 14, '#faf7f0', { x: W / 2, y: 420, anchorX: 0.5 })

  enter() {
    this.addChild(
      label('好 天 气', 40, '#f2cc8f', { x: W / 2, y: 250, anchorX: 0.5 }),
      label('GOOD WEATHER', 12, '#8a8580', { x: W / 2, y: 305, anchorX: 0.5 }),
      this.hint,
    )
  }

  update() {
    this.hint.visible = this.t % 60 < 40
  }

  onTap(g: Game) {
    g.setScene(new MemoScene())
  }
}
