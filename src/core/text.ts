export function txt(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'left',
) {
  ctx.font = `${size}px "SF Mono", Menlo, monospace`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  ctx.fillText(s, x, y)
}

/** 打字机：按帧计数逐字显示多行 */
export function typewriter(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  t: number,
  x: number,
  y: number,
  size: number,
  color: string,
  speed = 4,
) {
  let budget = Math.floor(t / speed)
  lines.forEach((line, i) => {
    if (budget <= 0) return
    txt(ctx, line.slice(0, budget), x, y + i * (size + 16), size, color)
    budget -= line.length
  })
}
