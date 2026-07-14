// 全屏色彩分级（星露谷式时段氛围）：作用在 WebGL 后处理层
import { ColorMatrixFilter } from 'pixi.js'

export type Mood = 'none' | 'noon' | 'dusk' | 'night' | 'gray'

export function applyMood(f: ColorMatrixFilter, m: Mood) {
  f.reset()
  switch (m) {
    case 'noon': // 正午：轻微提饱和提亮，燥热感
      f.saturate(0.12, true)
      f.brightness(1.04, true)
      break
    case 'dusk': // 黄昏：暖移，红抬蓝压
      f.matrix = [
        1.14, 0, 0, 0, 0.02,
        0, 0.96, 0, 0, 0.01,
        0, 0, 0.78, 0, 0,
        0, 0, 0, 1, 0,
      ]
      break
    case 'night': // 夜：冷移压暗，蓝微抬
      f.matrix = [
        0.78, 0, 0, 0, 0,
        0, 0.84, 0, 0, 0.005,
        0, 0, 1.08, 0, 0.03,
        0, 0, 0, 1, 0,
      ]
      break
    case 'gray': // 失去灵魂：大幅去饱和压暗（第3章用）
      f.saturate(-0.85, true)
      f.brightness(0.88, true)
      break
  }
}
