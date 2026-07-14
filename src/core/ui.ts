import { Text } from 'pixi.js'

export const MONO = 'Menlo, "SF Mono", monospace'

export function label(
  text: string,
  size: number,
  color: string,
  opts: { x?: number; y?: number; anchorX?: number } = {},
): Text {
  const t = new Text({
    text,
    style: { fontFamily: MONO, fontSize: size, fill: color },
  })
  t.anchor.set(opts.anchorX ?? 0, 0)
  t.position.set(opts.x ?? 0, opts.y ?? 0)
  return t
}

/** 打字机：按帧预算把多行文本切片，budget 由 t/speed 决定 */
export function typeSlice(lines: string[], t: number, speed = 4): string[] {
  let budget = Math.floor(t / speed)
  return lines.map(line => {
    if (budget <= 0) return ''
    const s = line.slice(0, budget)
    budget -= line.length
    return s
  })
}
