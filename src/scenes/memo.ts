// 第0章 · 备忘录：游戏的壳。所有章节从这里进入
import { Graphics, Sprite } from 'pixi.js'
import type { Game } from '../core/engine'
import { GameScene, W } from '../core/engine'
import { label } from '../core/ui'
import { Ch1Scene } from './ch1'

interface Entry {
  label: string
  chapter: number // 对应章节号，-1 表示纯文本备忘录
}

// 章节表：故事补全后继续追加
const ENTRIES: Entry[] = [
  { label: '2019.6 · 蝉鸣', chapter: 1 },
  { label: '？？？', chapter: 2 },
  { label: '？？？', chapter: 3 },
  { label: '？？？', chapter: 4 },
]

export class MemoScene extends GameScene {
  private hint = label('点击备忘录，回到那天', 12, '#8a8580', { x: W / 2, y: 570, anchorX: 0.5 })

  enter(g: Game) {
    g.audio.bgm('off')
    g.audio.cicada(false)

    const bg = new Graphics().rect(0, 0, 360, 640).fill('#151318')
    const phone = new Sprite(g.assets.phone)
    phone.position.set(30, 60)
    const screen = new Graphics().rect(46, 110, 268, 420).fill('#faf7f0')
    this.addChild(bg, phone, screen, label('备忘录', 16, '#1f1a17', { x: W / 2, y: 122, anchorX: 0.5 }))

    ENTRIES.forEach((e, i) => {
      const on = e.chapter <= g.save.data.unlocked
      const row = new Graphics().roundRect(56, 150 + i * 52, 248, 42, 3).fill(on ? '#f2cc8f' : '#e5e0d5')
      this.addChild(row, label(on ? e.label : '？？？', 13, on ? '#1f1a17' : '#aaa49a', { x: 68, y: 163 + i * 52 }))
    })
    this.addChild(this.hint)
  }

  update() {
    this.hint.visible = this.t % 60 < 40
  }

  onTap(g: Game, _x: number, y: number) {
    const i = Math.floor((y - 150) / 52)
    const e = ENTRIES[i]
    if (!e || 150 + i * 52 + 42 < y) return
    if (e.chapter > g.save.data.unlocked) return
    if (e.chapter === 1) g.setScene(new Ch1Scene())
    // 后续章节在此路由
  }
}
