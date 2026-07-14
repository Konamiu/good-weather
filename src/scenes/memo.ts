// 第0章 · 备忘录：游戏的壳。所有章节从这里进入
import type { Game, Scene } from '../core/engine'
import { W } from '../core/engine'
import { txt } from '../core/text'
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

export class MemoScene implements Scene {
  enter(g: Game) {
    g.audio.bgm('off')
    g.audio.cicada(false)
  }

  update() {}

  draw(g: Game, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#151318'
    ctx.fillRect(0, 0, 360, 640)
    ctx.drawImage(g.assets.phone, 30, 60)
    ctx.fillStyle = '#faf7f0'
    ctx.fillRect(46, 110, 268, 420)
    txt(ctx, '备忘录', W / 2, 122, 16, '#1f1a17', 'center')
    ENTRIES.forEach((e, i) => {
      const on = e.chapter <= g.save.data.unlocked
      ctx.fillStyle = on ? '#f2cc8f' : '#e5e0d5'
      ctx.fillRect(56, 150 + i * 52, 248, 42)
      txt(ctx, on ? e.label : '？？？', 68, 163 + i * 52, 13, on ? '#1f1a17' : '#aaa49a')
    })
    if (g.t % 60 < 40) txt(ctx, '点击备忘录，回到那天', W / 2, 570, 12, '#8a8580', 'center')
  }

  onTap(g: Game, _x: number, y: number) {
    const i = Math.floor((y - 150) / 52)
    const e = ENTRIES[i]
    if (!e || (150 + i * 52 + 42) < y) return
    if (e.chapter > g.save.data.unlocked) return
    if (e.chapter === 1) g.setScene(new Ch1Scene())
    // 后续章节在此路由
  }
}
