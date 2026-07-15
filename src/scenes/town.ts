// 第1章 · 俯视小镇（P0世界：瓦片+blob拼接+四方向行走+镜头跟随+进楼触发）
import { Container, Graphics, NineSliceSprite, Sprite, Text } from 'pixi.js'
import type { Game } from '../core/engine'
import { GameScene, W, H } from '../core/engine'
import { CW } from '../core/assets'
import { Anim } from '../core/anim'
import { label } from '../core/ui'
import { TILE, MAP_W, MAP_H, terrainAt, blobMask, blobIndex, variantIndex } from '../world/townmap'

const WORLD_W = MAP_W * TILE
const WORLD_H = MAP_H * TILE

interface Prop {
  x: number // 像素（左上）
  y: number
  w: number // 碰撞盒（像素）
  h: number
  spr: Sprite
}

interface Trigger {
  x: number
  y: number
  r: number
  text: string
}

export class TownScene extends GameScene {
  private world = new Container()
  /** 地表层（不排序）与物件层（按脚底y排序，产生遮挡关系） */
  private ground = new Container()
  private objects = new Container()
  private player = { x: 9.5 * TILE, y: 14 * TILE, dir: 'down' as 'down' | 'up' | 'side', flip: false, moving: false, target: null as { x: number; y: number } | null }
  private anim = new Anim()
  private blocks: Prop[] = []
  private triggers: Trigger[] = []
  private bang = label('!', 16, '#f2cc8f', { anchorX: 0.5 })
  private dialog = new Container()
  private dialogText!: Text
  private dialogBox!: NineSliceSprite
  private hud = new Container()
  private iceSpr!: Sprite

  enter(g: Game) {
    g.audio.cicada(true)
    g.audio.bgm('day')
    g.setMood('noon')
    this.objects.sortableChildren = true
    this.world.addChild(this.ground, this.objects)
    this.buildGround(g)
    this.buildProps(g)
    this.anim.set(g.assets.boyIdle, 24)
    this.objects.addChild(this.anim.spr)
    this.world.addChild(this.bang)
    this.bang.visible = false
    this.addChild(this.world)
    this.buildHud(g)
    this.buildDialog(g)
  }

  // ---------- 地表 ----------
  private buildGround(g: Game) {
    const A = g.assets
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++) {
        const t = terrainAt(x, y)
        // 背景层：非水泥格先垫一块纯水泥（blob过渡的底色）
        if (t !== 'C') {
          const under = new Sprite(A.groundBase[8])
          under.position.set(x * TILE, y * TILE)
          this.ground.addChild(under)
        }
        const mask = blobMask(x, y)
        let spr: Sprite
        if (t === 'C' || mask === 255) {
          spr = new Sprite(A.groundBase[variantIndex(t, x, y)])
        } else {
          // 边缘格：用对应地形对的blob图集
          const atlas = t === 'G'
            ? (this.touches(x, y, 'D') ? A.autoGrassDirt : A.autoGrassCement)
            : A.autoDirtCement
          spr = new Sprite(atlas[blobIndex(mask)])
        }
        spr.position.set(x * TILE, y * TILE)
        this.ground.addChild(spr)
      }
  }

  private touches(x: number, y: number, t: string): boolean {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (terrainAt(x + dx, y + dy) === t) return true
    return false
  }

  // ---------- 物件 ----------
  private buildProps(g: Game) {
    const A = g.assets
    const add = (tex: Sprite['texture'], px: number, py: number, cw: number, ch: number): Sprite => {
      const s = new Sprite(tex)
      s.position.set(px, py)
      s.zIndex = py + s.height
      this.objects.addChild(s)
      this.blocks.push({ x: px, y: py + s.height - ch, w: cw, h: ch, spr: s })
      return s
    }
    // 出租屋（碰撞只算下半截，让角色能站到屋前）
    add(A.bldHome, 2 * TILE, 5 * TILE, 96, 64)
    // 单元楼A
    add(A.bldUnitA, 12 * TILE, 4 * TILE, 128, 72)
    // 梧桐树×3
    add(A.tree, 5 * TILE, 15 * TILE, 40, 24)
    add(A.tree, 14 * TILE, 16 * TILE, 40, 24)
    add(A.tree, 15 * TILE, 1 * TILE, 40, 24)
    // 树荫叠加
    ;[[5, 17], [14, 18], [15, 3]].forEach(([tx, ty]) => {
      const sh = new Sprite(A.groundOverlay[1])
      sh.position.set(tx * TILE, (ty + 1) * TILE)
      this.ground.addChild(sh)
    })
    // 磨损小路（出租屋门口→大路，环境叙事）
    ;[[3, 9, 5], [3, 8, 5]].forEach(([tx, ty, idx]) => {
      const p = new Sprite(A.groundOverlay[idx])
      p.position.set(tx * TILE, ty * TILE)
      this.ground.addChild(p)
    })
    // 触发点
    this.triggers.push(
      { x: 3.5 * TILE, y: 9.6 * TILE, r: 30, text: '我的出租屋。晚上回来和她聊天。' },
      { x: 14 * TILE, y: 8.6 * TILE, r: 34, text: '单元楼A——今天的传单从这栋开始。\n（爬楼玩法将从这里进入）' },
    )
  }

  private buildHud(g: Game) {
    const bar = new Graphics().rect(0, 0, W, 34).fill({ color: 0x1f1a17, alpha: 0.72 })
    this.iceSpr = new Sprite(g.assets.iceHeart[0])
    this.iceSpr.position.set(6, 3)
    this.hud.addChild(bar, this.iceSpr, label('第 1 天 · 蝉鸣', 13, '#faf7f0', { x: 42, y: 10 }))
    this.addChild(this.hud)
  }

  private buildDialog(g: Game) {
    this.dialogBox = new NineSliceSprite({
      texture: g.assets.dialogFrame,
      leftWidth: 8, rightWidth: 8, topHeight: 8, bottomHeight: 10,
    })
    this.dialogBox.width = W - 24
    this.dialogBox.height = 84
    this.dialogBox.position.set(12, H - 100)
    this.dialogText = label('', 13, '#1f1a17', { x: 28, y: H - 82 })
    this.dialog.addChild(this.dialogBox, this.dialogText)
    this.dialog.visible = false
    this.addChild(this.dialog)
  }

  // ---------- 更新 ----------
  update(g: Game) {
    const p = this.player
    const SPD = 1.7
    let vx = 0, vy = 0
    if (g.keys.ArrowLeft) vx = -SPD
    else if (g.keys.ArrowRight) vx = SPD
    if (g.keys.ArrowUp) vy = -SPD
    else if (g.keys.ArrowDown) vy = SPD
    if (!vx && !vy && p.target) {
      const dx = p.target.x - p.x, dy = p.target.y - p.y
      const d = Math.hypot(dx, dy)
      if (d > 4) { vx = (dx / d) * SPD; vy = (dy / d) * SPD }
      else p.target = null
    } else if (vx || vy) p.target = null

    p.moving = !!(vx || vy)
    if (p.moving) {
      // 碰撞：分轴移动
      const nx = Math.max(8, Math.min(WORLD_W - 8, p.x + vx))
      if (!this.hit(nx, p.y)) p.x = nx
      const ny = Math.max(10, Math.min(WORLD_H - 4, p.y + vy))
      if (!this.hit(p.x, ny)) p.y = ny
      else if (p.target && Math.abs(vy) > 0) p.target = null
      if (Math.abs(vx) >= Math.abs(vy)) { p.dir = 'side'; p.flip = vx < 0 }
      else p.dir = vy < 0 ? 'up' : 'down'
    }

    const A = g.assets
    const frames = p.moving
      ? (p.dir === 'up' ? A.boyWalkUp : p.dir === 'down' ? A.boyWalkDown : A.boyWalkSide)
      : A.boyIdle
    this.anim.set(frames, p.moving ? 8 : 24)
    this.anim.flip = p.dir === 'side' && p.flip
    this.anim.tick(this.t)
    this.anim.spr.position.set(p.x, p.y - 61) // 脚底锚点(24,61)
    this.anim.spr.zIndex = p.y

    // 镜头
    this.world.x = -Math.max(0, Math.min(p.x - W / 2, WORLD_W - W))
    this.world.y = -Math.max(0, Math.min(p.y - H / 2, WORLD_H - H))

    // 触发提示
    const near = this.nearTrigger()
    this.bang.visible = !!near && !this.dialog.visible
    if (near) this.bang.position.set(p.x, p.y - 78)
    if (near && g.pressed.has(' ')) this.showDialog(near.text)
  }

  private hit(px: number, py: number): boolean {
    // 玩家碰撞盒：脚底16×8
    const l = px - 8, r = px + 8, t = py - 8, b = py
    return this.blocks.some(o => l < o.x + o.w && r > o.x && t < o.y + o.h && b > o.y)
  }

  private nearTrigger(): Trigger | null {
    const p = this.player
    return this.triggers.find(tr => Math.hypot(tr.x - p.x, tr.y - p.y) < tr.r) || null
  }

  private showDialog(text: string) {
    this.dialog.visible = true
    this.dialogText.text = text
  }

  onTap(g: Game, x: number, y: number) {
    if (this.dialog.visible) {
      this.dialog.visible = false
      return
    }
    const near = this.nearTrigger()
    if (near) {
      // 点到触发点附近直接交互
      const wx = x - this.world.x, wy = y - this.world.y
      if (Math.hypot(near.x - wx, near.y - wy) < near.r + 16) {
        this.showDialog(near.text)
        return
      }
    }
    this.player.target = { x: x - this.world.x, y: y - this.world.y }
  }
}
