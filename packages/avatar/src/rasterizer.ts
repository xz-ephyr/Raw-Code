import type { FaceLandmarks, FaceParameters } from "./face"
import type { AvatarPalette, RGBA } from "./palette"
import { rgba, mulRGBA } from "./palette"
import { vec2, dist, sdEllipse, sdLineSegment, pixelCoverage, smoothMin } from "./primitives"

const SIZE = 64

export interface PixelImage {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
}

export function renderAvatar(
  p: FaceParameters,
  lm: FaceLandmarks,
  palette: AvatarPalette,
): PixelImage {
  const size = SIZE
  const px = new Uint8ClampedArray(size * size * 4)

  // Layers bottom→top
  neck(px, size, lm, palette)
  head(px, size, lm, palette)
  hair(px, size, lm, palette)
  brows(px, size, lm, palette)
  eyes(px, size, lm, palette)
  nose(px, size, lm, palette)
  mouth(px, size, lm, palette)
  if (lm.hasGlasses) glasses(px, size, lm, palette)

  return { data: px, width: size, height: size }
}

// --- helpers ---
function i(x: number, y: number, s: number): number {
  return (Math.floor(y) * s + Math.floor(x)) * 4
}

function set(p: Uint8ClampedArray, s: number, x: number, y: number, c: RGBA): void {
  const idx = i(x, y, s)
  if (idx < 0 || idx >= p.length) return
  const a = c.a / 255, ia = 1 - a
  p[idx] = p[idx] * ia + c.r * a
  p[idx + 1] = p[idx + 1] * ia + c.g * a
  p[idx + 2] = p[idx + 2] * ia + c.b * a
  p[idx + 3] = Math.min(255, p[idx + 3] + c.a)
}

function cov(p: Uint8ClampedArray, s: number, x: number, y: number, c: RGBA, v: number): void {
  if (v <= 0) return
  set(p, s, x, y, rgba(c.r, c.g, c.b, Math.round(255 * v)))
}

// --- Neck ---
function neck(px: Uint8ClampedArray, s: number, lm: FaceLandmarks, pal: AvatarPalette): void {
  const n = lm.neck
  for (let y = Math.round(n.topY); y < Math.round(n.botY); y++) {
    for (let x = Math.round(n.cx - n.rx); x <= Math.round(n.cx + n.rx); x++) {
      const d = sdEllipse(vec2(x - n.cx, y - (n.topY + n.botY) / 2), n.rx, (n.botY - n.topY) / 2)
      cov(px, s, x, y, mulRGBA(pal.skin, 0.9), pixelCoverage(d))
    }
  }
}

// --- Head (simple fill with cheek shadow) ---
function head(px: Uint8ClampedArray, s: number, lm: FaceLandmarks, pal: AvatarPalette): void {
  const h = lm.head
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = sdEllipse(vec2(x - h.cx, y - h.cy), h.rx, h.ry)
      const v = pixelCoverage(d)
      if (v === 0) continue

      // Simple gradient: lighter on left side → darker right
      const t = (x - h.cx) / h.rx // -1..1
      const shade = 0.85 - 0.15 * t // 1.0 on left → 0.7 on right
      cov(px, s, x, y, mulRGBA(pal.skin, shade), v)
    }
  }
}

// --- Hair (dark block on top) ---
function hair(px: Uint8ClampedArray, s: number, lm: FaceLandmarks, pal: AvatarPalette): void {
  const h = lm.head
  const top = h.cy - h.ry * 1.15
  const bot = h.cy - h.ry * 0.2
  const hrx = h.rx * 1.2
  const hry = (bot - top) / 2
  const hcx = h.cx
  const hcy = (top + bot) / 2

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d0 = sdEllipse(vec2(x - hcx, y - hcy), hrx, hry)
      const d1 = sdEllipse(vec2(x - hcx, y - hcy + hry * 0.1), hrx * 0.92, hry * 0.85)
      const d = Math.max(d0, -d1) // subtract bottom to expose forehead
      const v = pixelCoverage(d)
      if (v === 0) continue

      // Simple texture
      const tex = 0.9 + 0.1 * ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1)
      const hl = y < hcy - hry * 0.4 ? 0.3 : 0 // subtle top highlight
      cov(px, s, x, y, mulRGBA(pal.hair, tex + hl), v)

      // Forehead shadow line
      if (y === Math.round(hcy + hry * 0.5) || y === Math.round(hcy + hry * 0.5) + 1) {
        set(px, s, x, y, mulRGBA(pal.skinShadow, 0.3))
      }
    }
  }
}

// --- Brows ---
function brows(px: Uint8ClampedArray, s: number, lm: FaceLandmarks, pal: AvatarPalette): void {
  for (const b of [lm.leftBrow, lm.rightBrow]) {
    const bw = b.w / 2, bh = b.h / 2
    const ang = b.angle * 0.3, ca = Math.cos(ang), sa = Math.sin(ang)
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - b.cx, dy = y - b.cy
        const rx2 = dx * ca + dy * sa, ry2 = -dx * sa + dy * ca
        cov(px, s, x, y, pal.brow, pixelCoverage(sdEllipse(vec2(rx2, ry2), bw, bh)))
      }
    }
  }
}

// --- Eyes (simple black slits + iris dot) ---
function eyes(px: Uint8ClampedArray, s: number, lm: FaceLandmarks, pal: AvatarPalette): void {
  for (const e of [lm.leftEye, lm.rightEye]) {
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const rx = e.w / 2, ry = e.h / 2
        const dO = sdEllipse(vec2(x - e.cx, y - e.cy - ry * 0.15), rx, ry * 0.9)
        const dI = sdEllipse(vec2(x - e.cx, y - e.cy + ry * 0.15), rx, ry * 0.7)
        const dEye = smoothMin(dO, dI, 0.5)
        const v = pixelCoverage(dEye)
        if (v === 0) continue

        // Lid top shadow
        const lid = Math.max(0, 1 - (y - (e.cy - ry)) / (ry * 0.35))
        cov(px, s, x, y, mulRGBA(pal.eyeWhite, 1 - lid * 0.3), v)

        // Iris (dark dot)
        const ir = rx * 0.4
        const dIris = dist(vec2(x, y), vec2(e.cx, e.cy + ry * 0.1))
        if (dIris < ir) {
          set(px, s, x, y, pal.pupil)
        }
      }
    }
  }
}

// --- Nose (subtle bridge + tip) ---
function nose(px: Uint8ClampedArray, s: number, lm: FaceLandmarks, pal: AvatarPalette): void {
  const n = lm.nose
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      // Side shadows
      const side = Math.abs(x - n.bridgeTop.x)
      if (side < 4 && side > 1 && y > n.bridgeTop.y + 2 && y < n.tip.y) {
        const shade = ((side - 1) / 3) * 0.3
        set(px, s, x, y, mulRGBA(pal.skinShadow, shade))
      }
      // Tip (small dot)
      if (dist(vec2(x, y), n.tip) < 1.5) {
        set(px, s, x, y, mulRGBA(pal.skin, 0.85))
      }
      // Nostrils
      for (const no of [n.leftN, n.rightN]) {
        if (dist(vec2(x, y), no) < 1) set(px, s, x, y, pal.skinShadow)
      }
    }
  }
}

// --- Mouth (simple line) ---
function mouth(px: Uint8ClampedArray, s: number, lm: FaceLandmarks, pal: AvatarPalette): void {
  const m = lm.mouth
  const uC = vec2(m.cx, m.cy - m.upperH * 0.3)
  const lC = vec2(m.cx, m.cy + m.lowerH * 0.3)
  const rx = m.halfW * 0.8

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dU = sdEllipse(vec2(x - uC.x, y - uC.y), rx, m.upperH)
      const dL = sdEllipse(vec2(x - lC.x, y - lC.y), rx, m.lowerH)
      const dM = smoothMin(dU, dL, 0.3)
      const v = pixelCoverage(dM)
      if (v === 0) continue

      const isLine = Math.abs(y - m.cy) < 0.5
      cov(px, s, x, y, isLine ? mulRGBA(pal.skinShadow, 1.3) : mulRGBA(pal.lip, 0.85), v)
    }
  }
}

// --- Glasses (thin wireframe) ---
function glasses(px: Uint8ClampedArray, s: number, lm: FaceLandmarks, pal: AvatarPalette): void {
  for (const e of [lm.leftEye, lm.rightEye]) {
    const cx = e.cx, cy = e.cy + e.h * 0.3
    const rx = e.w * 0.7, ry = e.h * 0.6
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dO = sdEllipse(vec2(x - cx, y - cy), rx, ry)
        const dI = sdEllipse(vec2(x - cx, y - cy), rx - 0.8, ry - 0.8)
        if (dO < 0 && dI > 0) set(px, s, x, y, pal.glasses)
      }
    }
  }
  // Bridge
  const l = lm.leftEye, r = lm.rightEye
  const by = l.cy + l.h * 0.3
  for (let x = Math.round(l.cx + l.w * 0.5); x <= Math.round(r.cx - r.w * 0.5); x++) {
    for (let dy = -1; dy <= 1; dy++) {
      const yy = Math.round(by + dy)
      if (x >= 0 && x < s && yy >= 0 && yy < s) set(px, s, x, yy, pal.glasses)
    }
  }
}
