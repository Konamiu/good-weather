// 素材加载：雪碧图切成 Texture[]，全部最近邻采样（像素锐利）
import { Assets, Rectangle, Texture } from 'pixi.js'

// 角色帧尺寸：1.1批为32x48，1.2批升级到48x64后改这里即可
export const CW = 32
export const CH = 48

export interface GameAssets {
  bg: Texture
  phone: Texture
  rain: Texture[]
  boyIdle: Texture[]
  boyWalkDown: Texture[]
  boyWalkUp: Texture[]
  boyWalkSide: Texture[]
  boyRunSide: Texture[]
  girlIdle: Texture[]
  girlWalkDown: Texture[]
  girlWalkSide: Texture[]
  girlSing: Texture[]
}

const FILES = [
  'bg_summer_street_360x640.png',
  'ui_phone_frame_300x520.png',
  'fx_rain_3f_360x640.png',
  'boy_idle_down_2f_32x48.png',
  'boy_walk_down_4f_32x48.png',
  'boy_walk_up_4f_32x48.png',
  'boy_walk_side_4f_32x48.png',
  'boy_run_side_4f_32x48.png',
  'girl_idle_down_2f_32x48.png',
  'girl_walk_down_4f_32x48.png',
  'girl_walk_side_4f_32x48.png',
  'girl_idle_sing_2f_32x48.png',
]

function slice(tex: Texture, fw: number, fh: number, n: number): Texture[] {
  return Array.from(
    { length: n },
    (_, i) => new Texture({ source: tex.source, frame: new Rectangle(i * fw, 0, fw, fh) }),
  )
}

export async function loadAssets(): Promise<GameAssets> {
  await Assets.load(FILES.map(f => ({ alias: f, src: `assets/${f}` })))
  const T = (f: string): Texture => {
    const t = Assets.get<Texture>(f)
    t.source.scaleMode = 'nearest'
    return t
  }
  return {
    bg: T('bg_summer_street_360x640.png'),
    phone: T('ui_phone_frame_300x520.png'),
    rain: slice(T('fx_rain_3f_360x640.png'), 360, 640, 3),
    boyIdle: slice(T('boy_idle_down_2f_32x48.png'), CW, CH, 2),
    boyWalkDown: slice(T('boy_walk_down_4f_32x48.png'), CW, CH, 4),
    boyWalkUp: slice(T('boy_walk_up_4f_32x48.png'), CW, CH, 4),
    boyWalkSide: slice(T('boy_walk_side_4f_32x48.png'), CW, CH, 4),
    boyRunSide: slice(T('boy_run_side_4f_32x48.png'), CW, CH, 4),
    girlIdle: slice(T('girl_idle_down_2f_32x48.png'), CW, CH, 2),
    girlWalkDown: slice(T('girl_walk_down_4f_32x48.png'), CW, CH, 4),
    girlWalkSide: slice(T('girl_walk_side_4f_32x48.png'), CW, CH, 4),
    girlSing: slice(T('girl_idle_sing_2f_32x48.png'), CW, CH, 2),
  }
}
