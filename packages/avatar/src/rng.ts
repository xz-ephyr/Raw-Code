export type RNG = () => number

// Mulberry32 — deterministic seeded PRNG
export function createRNG(seed: number): RNG {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function pickN<T>(rng: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr]
  const result: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length)
    result.push(copy[idx])
    copy.splice(idx, 1)
  }
  return result
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
