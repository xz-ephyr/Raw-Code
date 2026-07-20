import type { RNG } from "./rng"

export interface RGBA {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number
}

export function rgba(r: number, g: number, b: number, a: number = 255): RGBA {
  return { r: clampByte(r), g: clampByte(g), b: clampByte(b), a: clampByte(a) }
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

export function blendRGBA(a: RGBA, b: RGBA): RGBA {
  const alpha = b.a / 255
  const invAlpha = 1 - alpha
  return {
    r: clampByte(a.r * invAlpha + b.r * alpha),
    g: clampByte(a.g * invAlpha + b.g * alpha),
    b: clampByte(a.b * invAlpha + b.b * alpha),
    a: 255,
  }
}

export function mulRGBA(c: RGBA, factor: number): RGBA {
  return rgba(c.r * factor, c.g * factor, c.b * factor, c.a)
}

export function alphaBlend(layers: readonly RGBA[]): RGBA {
  let result = layers[0] ?? rgba(0, 0, 0, 0)
  for (let i = 1; i < layers.length; i++) {
    result = blendRGBA(result, layers[i])
  }
  return result
}

// Greyscale portrait palette — 5 shades
const SKIN_VALUES: readonly number[] = [220, 200, 180, 160, 140]
const HAIR_VALUES: readonly number[] = [20, 35, 55, 80, 110]

export interface AvatarPalette {
  readonly skin: RGBA        // light grey
  readonly skinShadow: RGBA  // darker grey
  readonly skinHighlight: RGBA // white-ish
  readonly hair: RGBA        // near-black
  readonly eyeWhite: RGBA    // white
  readonly iris: RGBA        // mid-dark grey
  readonly pupil: RGBA       // black
  readonly lip: RGBA         // mid grey
  readonly lipHighlight: RGBA // lighter grey
  readonly brow: RGBA        // dark
  readonly glasses: RGBA     // light grey (wire frames)
  readonly bg: RGBA          // transparent
}

export function generatePalette(rng: RNG): AvatarPalette {
  const skinL = SKIN_VALUES[Math.floor(rng() * SKIN_VALUES.length)]
  const skin = rgba(skinL, skinL, skinL)
  const skinShadow = rgba(Math.max(0, skinL - 60), Math.max(0, skinL - 60), Math.max(0, skinL - 60))
  const skinHighlight = rgba(Math.min(255, skinL + 40), Math.min(255, skinL + 40), Math.min(255, skinL + 40))

  const hairL = HAIR_VALUES[Math.floor(rng() * HAIR_VALUES.length)]
  const hair = rgba(hairL, hairL, hairL)

  const eyeWhite = rgba(240, 240, 240)
  const iris = rgba(60, 60, 60)
  const pupil = rgba(0, 0, 0)
  const lip = rgba(120, 120, 120)
  const lipHighlight = rgba(160, 160, 160)
  const brow = rgba(hairL, hairL, hairL)
  const glasses = rgba(160, 160, 160)
  const bg = rgba(0, 0, 0, 0)

  return { skin, skinShadow, skinHighlight, hair, eyeWhite, iris, pupil, lip, lipHighlight, brow, glasses, bg }
}
