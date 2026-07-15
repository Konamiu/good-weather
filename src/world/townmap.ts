// 小镇地图数据 + blob-47 自动拼接查表
// 图例：G=草地 C=水泥路 D=土面
export const TILE = 32

// 20列 × 22行（世界 640×704）
const RAW = [
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGDDGGGCCCGGGGGGGGG',
  'GGGDDGGGCCCGGGGGGGGG',
  'CCCCCCCCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCCCCCCCC',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
  'GGGGGGGGCCCGGGGGGGGG',
]

export const MAP_W = RAW[0].length
export const MAP_H = RAW.length

export type Terrain = 'G' | 'C' | 'D'

export function terrainAt(x: number, y: number): Terrain {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 'C' // 出界视作背景
  return RAW[y][x] as Terrain
}

// blob-47 图集排布顺序（与批次D2文档一致）
const MASK_ORDER = [
  0, 1, 4, 5, 7, 16, 17, 20,
  21, 23, 28, 29, 31, 64, 65, 68,
  69, 71, 80, 81, 84, 85, 87, 92,
  93, 95, 112, 113, 116, 117, 119, 124,
  125, 127, 193, 197, 199, 209, 213, 215,
  221, 223, 241, 245, 247, 253, 255,
]
const MASK_TO_INDEX = new Map(MASK_ORDER.map((m, i) => [m, i]))

/** 计算某格相对同地形邻居的blob mask（对角bit仅在两正交边同在时生效） */
export function blobMask(x: number, y: number): number {
  const me = terrainAt(x, y)
  const same = (dx: number, dy: number) => terrainAt(x + dx, y + dy) === me
  const n = same(0, -1), e = same(1, 0), s = same(0, 1), w = same(-1, 0)
  let m = 0
  if (n) m |= 1
  if (e) m |= 4
  if (s) m |= 16
  if (w) m |= 64
  if (n && e && same(1, -1)) m |= 2
  if (e && s && same(1, 1)) m |= 8
  if (s && w && same(-1, 1)) m |= 32
  if (w && n && same(-1, -1)) m |= 128
  return m
}

export function blobIndex(mask: number): number {
  return MASK_TO_INDEX.get(mask) ?? MASK_TO_INDEX.get(255)!
}

// 地表基础变体索引（tileset_ground_base_v2 的格号，0起）
// 草地: 0纯 1草簇 2小白花 3蒲公英 | 土路: 4纯 5车辙 6杂草 7脚印 | 水泥: 8纯 9裂缝 10井盖 11修补
const VARIANTS: Record<Terrain, { common: number; alt: number[]; rare: number[] }> = {
  G: { common: 0, alt: [1, 2], rare: [3] },
  D: { common: 4, alt: [5, 6], rare: [7] },
  C: { common: 8, alt: [9], rare: [10, 11] },
}

/** 70/20/10 加权变体（确定性：按坐标散列，避免每次进图闪变） */
export function variantIndex(t: Terrain, x: number, y: number): number {
  let h = (x * 73856093 ^ y * 19349663) >>> 0
  h = (h ^ (h >>> 13)) * 1274126177 >>> 0
  h = (h ^ (h >>> 16)) >>> 0
  const r = (h % 100) / 100
  const v = VARIANTS[t]
  if (r < 0.7) return v.common
  if (r < 0.9) return v.alt[h % v.alt.length]
  return v.rare[h % v.rare.length]
}
