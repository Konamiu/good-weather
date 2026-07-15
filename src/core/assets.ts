// 素材加载：雪碧图切成 Texture[]，全部最近邻采样（像素锐利）
import { Assets, Rectangle, Texture } from 'pixi.js'

// 1.2批角色使用原生48x64帧；所有场景按脚底锚点摆放。
export const CW = 48
export const CH = 64

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
  girlWalkUp: Texture[]
  girlWalkSide: Texture[]
  girlSing: Texture[]
  /** B2 楼道零件 */
  wallBase: Texture[]
  doorVariants: Texture[] // 10帧：款1普通/款1塞单/款2普通/…
  propsFloor: Texture[] // 24件 32x32
  vehicles: Texture[] // 电瓶车/自行车 48x32
}

const FILES = [
  'bg_summer_street_360x640.png',
  'ui_phone_frame_300x520.png',
  'fx_rain_3f_360x640.png',
  'boy_idle_down_2f_48x64.png',
  'boy_walk_down_4f_48x64.png',
  'boy_walk_up_4f_48x64.png',
  'boy_walk_side_4f_48x64.png',
  'boy_run_side_4f_48x64.png',
  'girl_idle_down_2f_48x64.png',
  'girl_walk_down_4f_48x64.png',
  'girl_walk_up_4f_48x64.png',
  'girl_walk_side_4f_48x64.png',
  'girl_idle_sing_2f_48x64.png',
  'wall_base_3s_360x90.png',
  'door_variants_5x2_40x72.png',
  'props_floor_sheet.png',
  'props_floor_vehicles_2s_48x32.png',
]

function slice(tex: Texture, fw: number, fh: number, n: number): Texture[] {
  return Array.from(
    { length: n },
    (_, i) => new Texture({ source: tex.source, frame: new Rectangle(i * fw, 0, fw, fh) }),
  )
}

function sliceGrid(tex: Texture, fw: number, fh: number, cols: number, rows: number): Texture[] {
  const out: Texture[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push(new Texture({ source: tex.source, frame: new Rectangle(c * fw, r * fh, fw, fh) }))
  return out
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
    boyIdle: slice(T('boy_idle_down_2f_48x64.png'), CW, CH, 2),
    boyWalkDown: slice(T('boy_walk_down_4f_48x64.png'), CW, CH, 4),
    boyWalkUp: slice(T('boy_walk_up_4f_48x64.png'), CW, CH, 4),
    boyWalkSide: slice(T('boy_walk_side_4f_48x64.png'), CW, CH, 4),
    boyRunSide: slice(T('boy_run_side_4f_48x64.png'), CW, CH, 4),
    girlIdle: slice(T('girl_idle_down_2f_48x64.png'), CW, CH, 2),
    girlWalkDown: slice(T('girl_walk_down_4f_48x64.png'), CW, CH, 4),
    girlWalkUp: slice(T('girl_walk_up_4f_48x64.png'), CW, CH, 4),
    girlWalkSide: slice(T('girl_walk_side_4f_48x64.png'), CW, CH, 4),
    girlSing: slice(T('girl_idle_sing_2f_48x64.png'), CW, CH, 2),
    wallBase: slice(T('wall_base_3s_360x90.png'), 360, 90, 3),
    doorVariants: slice(T('door_variants_5x2_40x72.png'), 40, 72, 10),
    propsFloor: sliceGrid(T('props_floor_sheet.png'), 32, 32, 8, 3),
    vehicles: slice(T('props_floor_vehicles_2s_48x32.png'), 48, 32, 2),
  }
}
