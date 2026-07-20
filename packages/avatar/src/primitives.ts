// Signed distance fields and shape primitives for face rendering

export interface Vec2 {
  readonly x: number
  readonly y: number
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v)
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 }
}

export function dist(a: Vec2, b: Vec2): number {
  return length(sub(a, b))
}

// SDF: signed distance to ellipse centered at origin
export function sdEllipse(p: Vec2, rx: number, ry: number): number {
  const px = Math.abs(p.x)
  const py = Math.abs(p.y)

  // Solve for closest point on ellipse using Newton's method
  let t = Math.PI / 4
  for (let i = 0; i < 3; i++) {
    const ct = Math.cos(t)
    const st = Math.sin(t)
    const ex = rx * ct
    const ey = ry * st
    const dx = ex - px
    const dy = ey - py
    const f = (dx * ex / (rx * rx)) + (dy * ey / (ry * ry))
    const df = (dx / (rx * rx)) * (-rx * st) + (ex / (rx * rx)) * (-rx * st) +
               (ex * (-rx * st) / (rx * rx)) + (dy / (ry * ry)) * (ry * ct) +
               (ey / (ry * ry)) * (ry * ct) + (ey * (ry * ct) / (ry * ry))
    t = t - f / df
  }

  const ct = Math.cos(t)
  const st = Math.sin(t)
  const closest = vec2(rx * ct, ry * st)
  const diff = sub(vec2(px, py), closest)
  const sign = (px * px / (rx * rx) + py * py / (ry * ry) - 1) > 0 ? 1 : -1
  return sign * length(diff)
}

// SDF: distance to line segment
export function sdLineSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a)
  const ap = sub(p, a)
  const t = clamp(dot(ap, ab) / dot(ab, ab), 0, 1)
  return length(sub(ap, vec2(ab.x * t, ab.y * t)))
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// Coverage: fraction of a pixel (unit square at origin) covered by shape with given signed distance
export function pixelCoverage(sd: number): number {
  if (sd <= -0.5) return 1
  if (sd >= 0.5) return 0
  return 0.5 - sd
}

// Smooth min for blending shapes
export function smoothMin(a: number, b: number, k: number): number {
  const h = clamp(0.5 + 0.5 * (a - b) / k, 0, 1)
  return a + (b - a) * h - k * h * (1 - h)
}


