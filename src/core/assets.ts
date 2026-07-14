// 素材加载：雪碧图按固定帧宽等距切帧
export class Sheet {
  constructor(
    public img: HTMLImageElement,
    public fw: number,
    public fh: number,
    public frames: number,
  ) {}

  draw(ctx: CanvasRenderingContext2D, f: number, x: number, y: number, flip = false) {
    const sx = (f % this.frames) * this.fw
    if (flip) {
      ctx.save()
      ctx.translate(x + this.fw, y)
      ctx.scale(-1, 1)
      ctx.drawImage(this.img, sx, 0, this.fw, this.fh, 0, 0, this.fw, this.fh)
      ctx.restore()
    } else {
      ctx.drawImage(this.img, sx, 0, this.fw, this.fh, x, y, this.fw, this.fh)
    }
  }

  /** 换色副本（占位NPC用） */
  tinted(color: string): Sheet {
    const c = document.createElement('canvas')
    c.width = this.img.width
    c.height = this.img.height
    const x = c.getContext('2d')!
    x.drawImage(this.img, 0, 0)
    x.globalCompositeOperation = 'source-atop'
    x.globalAlpha = 0.45
    x.fillStyle = color
    x.fillRect(0, 0, c.width, c.height)
    const img = new Image()
    img.src = c.toDataURL()
    const s = new Sheet(img, this.fw, this.fh, this.frames)
    return s
  }
}

export interface GameAssets {
  bg: HTMLImageElement
  phone: HTMLImageElement
  rain: Sheet
  boyIdle: Sheet
  boyWalkDown: Sheet
  boyWalkUp: Sheet
  boyWalkSide: Sheet
  boyRunSide: Sheet
  girlIdle: Sheet
  girlWalkDown: Sheet
  girlWalkSide: Sheet
  girlSing: Sheet
}

const load = (name: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = `assets/${name}`
  })

// 角色帧尺寸：1.1批为32x48，1.2批升级到48x64后改这里即可
export const CW = 32
export const CH = 48

export async function loadAssets(): Promise<GameAssets> {
  const [bg, phone, rain, bi, bwd, bwu, bws, brs, gi, gwd, gws, gs] = await Promise.all([
    load('bg_summer_street_360x640.png'),
    load('ui_phone_frame_300x520.png'),
    load('fx_rain_3f_360x640.png'),
    load('boy_idle_down_2f_32x48.png'),
    load('boy_walk_down_4f_32x48.png'),
    load('boy_walk_up_4f_32x48.png'),
    load('boy_walk_side_4f_32x48.png'),
    load('boy_run_side_4f_32x48.png'),
    load('girl_idle_down_2f_32x48.png'),
    load('girl_walk_down_4f_32x48.png'),
    load('girl_walk_side_4f_32x48.png'),
    load('girl_idle_sing_2f_32x48.png'),
  ])
  return {
    bg,
    phone,
    rain: new Sheet(rain, 360, 640, 3),
    boyIdle: new Sheet(bi, CW, CH, 2),
    boyWalkDown: new Sheet(bwd, CW, CH, 4),
    boyWalkUp: new Sheet(bwu, CW, CH, 4),
    boyWalkSide: new Sheet(bws, CW, CH, 4),
    boyRunSide: new Sheet(brs, CW, CH, 4),
    girlIdle: new Sheet(gi, CW, CH, 2),
    girlWalkDown: new Sheet(gwd, CW, CH, 4),
    girlWalkSide: new Sheet(gws, CW, CH, 4),
    girlSing: new Sheet(gs, CW, CH, 2),
  }
}
