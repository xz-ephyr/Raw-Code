import type { FaceParameters, AvatarLandmarks } from "./face"
import type { AvatarPalette, RGBA } from "./palette"
import { rgba } from "./palette"

const SIZE = 64

export interface PixelImage {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
}

export function renderAvatar(p: FaceParameters, lm: AvatarLandmarks, pal: AvatarPalette): PixelImage {
  const s = SIZE
  const px = new Uint8ClampedArray(s * s * 4)

  // Layers bottom → top
  drawFeet(px, s, lm, pal)
  drawLegs(px, s, lm, pal)
  drawBody(px, s, lm, pal)
  drawArms(px, s, lm, pal)
  drawNeck(px, s, lm, pal)
  drawHead(px, s, lm, pal)
  drawHair(px, s, lm, p, pal)
  drawEyes(px, s, lm, pal)
  drawNose(px, s, lm, pal)
  drawMouth(px, s, lm, pal)
  if (lm.glasses) drawGlasses(px, s, lm, pal)
  if (lm.hat) drawHat(px, s, lm.hat, pal)

  return { data: px, width: s, height: s }
}

// --- pixel helpers ---

function i(x: number, y: number, s: number): number {
  return (Math.floor(y) * s + Math.floor(x)) * 4
}

function setP(px: Uint8ClampedArray, s: number, x: number, y: number, c: RGBA): void {
  const idx = i(x, y, s)
  if (idx < 0 || idx + 3 >= px.length) return
  px[idx] = c.r
  px[idx + 1] = c.g
  px[idx + 2] = c.b
  px[idx + 3] = c.a
}

function rect(px: Uint8ClampedArray, s: number, x: number, y: number, w: number, h: number, c: RGBA): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setP(px, s, x + dx, y + dy, c)
    }
  }
}

function rectOutline(px: Uint8ClampedArray, s: number, x: number, y: number, w: number, h: number, c: RGBA): void {
  for (let dx = 0; dx < w; dx++) {
    setP(px, s, x + dx, y, c)
    setP(px, s, x + dx, y + h - 1, c)
  }
  for (let dy = 1; dy < h - 1; dy++) {
    setP(px, s, x, y + dy, c)
    setP(px, s, x + w - 1, y + dy, c)
  }
}

function hLine(px: Uint8ClampedArray, s: number, x: number, y: number, w: number, c: RGBA): void {
  for (let dx = 0; dx < w; dx++) setP(px, s, x + dx, y, c)
}

function vLine(px: Uint8ClampedArray, s: number, x: number, y: number, h: number, c: RGBA): void {
  for (let dy = 0; dy < h; dy++) setP(px, s, x, y + dy, c)
}

function vLineTaper(px: Uint8ClampedArray, s: number, x: number, y: number, h: number, startW: number, endW: number, c: RGBA): void {
  for (let dy = 0; dy < h; dy++) {
    const t = dy / (h - 1 || 1)
    const w = Math.round(startW + (endW - startW) * t)
    for (let dx = 0; dx < w; dx++) {
      setP(px, s, x + dx, y + dy, c)
    }
  }
}

// --- drawing functions ---

function drawFeet(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  for (const f of [lm.leftFoot, lm.rightFoot]) {
    rect(px, s, f.x, f.y, f.w, f.h, pal.shoes)
    rectOutline(px, s, f.x, f.y, f.w, f.h, pal.outline)
    hLine(px, s, f.x + 1, f.y + 1, f.w - 2, pal.shoesDark)
  }
}

function drawLegs(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  for (const leg of [lm.leftLeg, lm.rightLeg]) {
    rect(px, s, leg.x, leg.y, leg.w, leg.h, pal.pants)
    rectOutline(px, s, leg.x, leg.y, leg.w, leg.h, pal.outline)
    // knee highlight
    hLine(px, s, leg.x + 1, leg.y + Math.floor(leg.h * 0.5), leg.w - 2, pal.pantsDark)
  }
}

function drawBody(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  const b = lm.body
  rect(px, s, b.x, b.y, b.w, b.h, pal.shirt)
  rectOutline(px, s, b.x, b.y, b.w, b.h, pal.outline)

  // Collar
  hLine(px, s, b.x + 2, b.y, b.w - 4, pal.shirtDark)
  hLine(px, s, b.x + 3, b.y + 1, b.w - 6, pal.outline)

  // Belt
  hLine(px, s, b.x + 1, b.y + b.h - 2, b.w - 2, pal.belt)
}

function drawArms(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  for (const arm of [lm.leftArm, lm.rightArm]) {
    rect(px, s, arm.x, arm.y, arm.w, arm.h, pal.skin)
    rectOutline(px, s, arm.x, arm.y, arm.w, arm.h, pal.outline)
    // Sleeve cuff
    hLine(px, s, arm.x, arm.y, arm.w, pal.shirtDark)
    hLine(px, s, arm.x, arm.y + 1, arm.w, pal.shirt)
  }
}

function drawNeck(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  const n = lm.neck
  rect(px, s, n.x, n.y, n.w, n.h, pal.skin)
  rectOutline(px, s, n.x, n.y, n.w, n.h, pal.outline)
}

function drawHead(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  const h = lm.head
  // Main head rectangle (slightly rounded effect by skipping corners)
  rect(px, s, h.x, h.y, h.w, h.h, pal.skin)
  rectOutline(px, s, h.x, h.y, h.w, h.h, pal.outline)

  // Cheek blush (subtle)
  hLine(px, s, h.x + 1, h.y + Math.floor(h.h * 0.65), Math.floor(h.w * 0.25), pal.skinShadow)
  hLine(px, s, h.x + h.w - 1 - Math.floor(h.w * 0.25), h.y + Math.floor(h.h * 0.65), Math.floor(h.w * 0.25), pal.skinShadow)
}

function drawHair(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, p: FaceParameters, pal: AvatarPalette): void {
  const h = lm.hairTop
  const head = lm.head

  switch (p.hairStyle) {
    case "buzz": {
      // Very short, just a cap on top
      rect(px, s, h.x + 2, h.y, h.w - 4, Math.min(4, h.h), pal.hair)
      break
    }
    case "spiky": {
      // Spiky top
      vLineTaper(px, s, h.x + 1, h.y, Math.min(h.h, 6), 1, 3, pal.hair)
      vLineTaper(px, s, h.x + Math.floor(h.w * 0.25), h.y - 1, Math.min(h.h + 1, 7), 1, 3, pal.hair)
      vLineTaper(px, s, h.x + Math.floor(h.w * 0.5) - 1, h.y - 2, Math.min(h.h + 2, 8), 1, 4, pal.hair)
      vLineTaper(px, s, h.x + Math.floor(h.w * 0.75) - 1, h.y - 1, Math.min(h.h + 1, 7), 1, 3, pal.hair)
      vLineTaper(px, s, h.x + h.w - 3, h.y, Math.min(h.h, 6), 1, 3, pal.hair)
      // Fill between spikes
      rect(px, s, h.x + 3, h.y + 2, h.w - 6, Math.max(1, h.h - 2), pal.hair)
      // Side hair
      rect(px, s, head.x - 1, head.y + 2, 2, Math.floor(head.h * 0.45), pal.hair)
      rect(px, s, head.x + head.w - 1, head.y + 2, 2, Math.floor(head.h * 0.45), pal.hair)
      break
    }
    case "long": {
      // Full top coverage + sides flowing down
      rect(px, s, h.x, h.y, h.w, h.h, pal.hair)
      // Sides flowing down past head
      const sideLen = Math.floor(head.h * 0.5)
      rect(px, s, head.x - 2, head.y + 1, 2, sideLen, pal.hair)
      rect(px, s, head.x + head.w, head.y + 1, 2, sideLen, pal.hair)
      // Bangs
      hLine(px, s, h.x + 1, h.y + h.h - 2, h.w - 2, pal.hairHighlight)
      break
    }
    case "side": {
      // Swept to the side
      rect(px, s, h.x, h.y, h.w, Math.min(h.h, 5), pal.hair)
      rect(px, s, h.x + 2, h.y + 1, h.w - 4, h.h - 1, pal.hair)
      // Swept side part
      hLine(px, s, h.x + Math.floor(h.w * 0.3), h.y + h.h - 1, Math.floor(h.w * 0.5), pal.hairHighlight)
      break
    }
    default: {
      // Short — full cap
      rect(px, s, h.x, h.y, h.w, Math.min(h.h, 5), pal.hair)
      rect(px, s, h.x + 1, h.y + 1, h.w - 2, h.h, pal.hair)
      rect(px, s, head.x - 1, head.y + 2, 2, Math.floor(head.h * 0.3), pal.hair)
      rect(px, s, head.x + head.w - 1, head.y + 2, 2, Math.floor(head.h * 0.3), pal.hair)
      break
    }
  }

  // Hair outline always
  if (p.hairStyle !== "buzz") {
    rectOutline(px, s, h.x, h.y, h.w, Math.min(h.h, 6), pal.outline)
  }
}

function drawEyes(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  for (const eye of [lm.leftEye, lm.rightEye]) {
    // Eye white
    setP(px, s, eye.x, eye.y, pal.eyeWhite)
    if (lm.glasses) {
      setP(px, s, eye.x + 1, eye.y, pal.eyeWhite)
    }
    // Pupil
    setP(px, s, eye.x + 1, eye.y, pal.pupil)
    if (lm.glasses) {
      setP(px, s, eye.x + 2, eye.y, pal.pupil)
    }
  }
}

function drawNose(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  // Small nose dot
  setP(px, s, lm.nose.x, lm.nose.y, pal.skinShadow)
  setP(px, s, lm.nose.x, lm.nose.y + 1, pal.skinShadow)
}

function drawMouth(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  hLine(px, s, lm.mouth.x, lm.mouth.y, lm.mouth.w, pal.lip)
  // Smile corners
  setP(px, s, lm.mouth.x - 1, lm.mouth.y - 1, pal.lip)
  setP(px, s, lm.mouth.x + lm.mouth.w, lm.mouth.y - 1, pal.lip)
  // Lip line
  hLine(px, s, lm.mouth.x + 1, lm.mouth.y + 1, lm.mouth.w - 2, pal.outline)
}

function drawGlasses(px: Uint8ClampedArray, s: number, lm: AvatarLandmarks, pal: AvatarPalette): void {
  for (const eye of [lm.leftEye, lm.rightEye]) {
    // Frame around eye
    rectOutline(px, s, eye.x - 1, eye.y - 1, 4, 3, pal.accessory)
  }
  // Bridge
  const l = lm.leftEye, r = lm.rightEye
  const bridgeX = l.x + 3
  const bridgeW = r.x - bridgeX
  hLine(px, s, bridgeX, l.y, bridgeW, pal.accessory)
}

function drawHat(px: Uint8ClampedArray, s: number, hat: NonNullable<AvatarLandmarks["hat"]>, pal: AvatarPalette): void {
  rect(px, s, hat.x, hat.y, hat.w, hat.h, pal.accessory)
  rectOutline(px, s, hat.x, hat.y, hat.w, hat.h, pal.outline)
  // Brim
  hLine(px, s, hat.x - 1, hat.y + hat.h - 1, hat.w + 2, pal.accessory)
  hLine(px, s, hat.x - 1, hat.y + hat.h, hat.w + 2, pal.outline)
}
