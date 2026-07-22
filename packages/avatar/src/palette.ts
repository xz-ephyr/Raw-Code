import type { RNG } from "./rng"
import { pick } from "./rng"
import type { AgentType } from "./face"

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

export function mulRGBA(c: RGBA, factor: number): RGBA {
  return rgba(c.r * factor, c.g * factor, c.b * factor, c.a)
}

export interface AvatarPalette {
  readonly skin: RGBA
  readonly skinShadow: RGBA
  readonly skinHighlight: RGBA
  readonly hair: RGBA
  readonly hairHighlight: RGBA
  readonly eyeWhite: RGBA
  readonly pupil: RGBA
  readonly lip: RGBA
  readonly shirt: RGBA
  readonly shirtDark: RGBA
  readonly pants: RGBA
  readonly pantsDark: RGBA
  readonly shoes: RGBA
  readonly shoesDark: RGBA
  readonly belt: RGBA
  readonly accessory: RGBA
  readonly outline: RGBA
  readonly bg: RGBA
}

interface ColorScheme {
  skin: readonly number[]
  hair: readonly number[]
  shirt: readonly number[]
  pants: readonly number[]
  shoes: readonly number[]
  accessory: readonly number[]
}

const SCHEMES: Record<string, ColorScheme> = {
  general: {
    skin: [255, 220, 185],
    hair: [80, 55, 30],
    shirt: [50, 120, 200],
    pants: [40, 50, 70],
    shoes: [60, 60, 60],
    accessory: [200, 180, 100],
  },
  explore: {
    skin: [230, 195, 160],
    hair: [60, 40, 20],
    shirt: [55, 140, 65],
    pants: [130, 110, 70],
    shoes: [100, 65, 40],
    accessory: [200, 160, 60],
  },
  writer: {
    skin: [245, 225, 210],
    hair: [120, 50, 40],
    shirt: [160, 60, 60],
    pants: [80, 80, 90],
    shoes: [30, 30, 35],
    accessory: [180, 180, 190],
  },
  researcher: {
    skin: [240, 225, 210],
    hair: [180, 180, 185],
    shirt: [220, 225, 235],
    pants: [50, 55, 75],
    shoes: [40, 40, 45],
    accessory: [150, 170, 200],
  },
  video: {
    skin: [235, 210, 180],
    hair: [25, 30, 40],
    shirt: [130, 60, 170],
    pants: [30, 30, 35],
    shoes: [200, 200, 210],
    accessory: [60, 180, 180],
  },
}

export function getScheme(agentType?: AgentType): ColorScheme {
  return SCHEMES[agentType ?? "general"] ?? SCHEMES.general
}

function vary(rng: RNG, base: readonly number[], range: number): readonly [number, number, number] {
  return [
    clampByte(base[0] + (rng() - 0.5) * range),
    clampByte(base[1] + (rng() - 0.5) * range),
    clampByte(base[2] + (rng() - 0.5) * range),
  ]
}

export function generatePalette(rng: RNG, agentType?: AgentType): AvatarPalette {
  const scheme = getScheme(agentType)
  const s = vary(rng, scheme.skin, 30)
  const h = vary(rng, scheme.hair, 20)
  const sh = vary(rng, scheme.shirt, 25)
  const p = vary(rng, scheme.pants, 20)
  const so = vary(rng, scheme.shoes, 15)
  const acc = vary(rng, scheme.accessory, 30)

  const skin = rgba(s[0], s[1], s[2])
  return {
    skin,
    skinShadow: rgba(Math.max(0, s[0] - 50), Math.max(0, s[1] - 50), Math.max(0, s[2] - 50)),
    skinHighlight: rgba(Math.min(255, s[0] + 30), Math.min(255, s[1] + 30), Math.min(255, s[2] + 30)),
    hair: rgba(h[0], h[1], h[2]),
    hairHighlight: rgba(Math.min(255, h[0] + 40), Math.min(255, h[1] + 40), Math.min(255, h[2] + 40)),
    eyeWhite: rgba(240, 240, 240),
    pupil: rgba(20, 20, 25),
    lip: rgba(200, 120, 110),
    shirt: rgba(sh[0], sh[1], sh[2]),
    shirtDark: rgba(Math.max(0, sh[0] - 40), Math.max(0, sh[1] - 40), Math.max(0, sh[2] - 40)),
    pants: rgba(p[0], p[1], p[2]),
    pantsDark: rgba(Math.max(0, p[0] - 30), Math.max(0, p[1] - 30), Math.max(0, p[2] - 30)),
    shoes: rgba(so[0], so[1], so[2]),
    shoesDark: rgba(Math.max(0, so[0] - 25), Math.max(0, so[1] - 25), Math.max(0, so[2] - 25)),
    belt: rgba(50, 40, 30),
    accessory: rgba(acc[0], acc[1], acc[2]),
    outline: rgba(30, 30, 35),
    bg: rgba(0, 0, 0, 0),
  }
}
