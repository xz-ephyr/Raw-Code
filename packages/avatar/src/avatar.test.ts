import { describe, it, expect } from "vitest"
import { generateAvatar } from "./index"
import { createRNG, hashString } from "./rng"
import { generateFaceParams, computeLandmarks } from "./face"
import { generatePalette } from "./palette"

describe("avatar RNG", () => {
  it("produces deterministic output from same seed", () => {
    const rng1 = createRNG(42)
    const rng2 = createRNG(42)
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2())
    }
  })

  it("produces different output from different seeds", () => {
    const rng1 = createRNG(42)
    const rng2 = createRNG(99)
    expect(rng1()).not.toBe(rng2())
  })

  it("hashString is deterministic", () => {
    expect(hashString("hello")).toBe(hashString("hello"))
  })

  it("hashString produces different values for different seeds", () => {
    expect(hashString("general-explore")).not.toBe(hashString("general-writer"))
  })
})

describe("avatar generation", () => {
  it("generates a 64x64 image", () => {
    const img = generateAvatar("test-seed")
    expect(img.width).toBe(64)
    expect(img.height).toBe(64)
    expect(img.data.length).toBe(64 * 64 * 4)
  })

  it("generates same output for same seed", () => {
    const a = generateAvatar("deterministic")
    const b = generateAvatar("deterministic")
    expect(a.data).toEqual(b.data)
  })

  it("generates different output for different seeds", () => {
    const a = generateAvatar("seed-a")
    const b = generateAvatar("seed-b")
    expect(a.data).not.toEqual(b.data)
  })

  it("generates for all agent types without error", () => {
    for (const agentType of ["general", "explore", "writer", "researcher", "video"]) {
      const img = generateAvatar(`agent-${agentType}`, { agentType })
      expect(img.width).toBe(64)
      expect(img.data.length).toBe(64 * 64 * 4)
    }
  })

  it("produces non-transparent pixels (face has content)", () => {
    const img = generateAvatar("should-have-content")
    let hasOpaque = false
    for (let i = 3; i < img.data.length; i += 4) {
      if (img.data[i] > 0) { hasOpaque = true; break }
    }
    expect(hasOpaque).toBe(true)
  })

  it("each agent type produces distinct output", () => {
    const results = new Set<string>()
    for (const agentType of ["general", "explore", "writer", "researcher", "video"]) {
      const img = generateAvatar(`agent-${agentType}`, { agentType })
      // Simple hash of pixel data
      let h = 0
      for (let i = 0; i < img.data.length; i += 4) {
        h = ((h << 5) - h + img.data[i] + img.data[i + 1] + img.data[i + 2] + img.data[i + 3]) | 0
      }
      results.add(String(h))
    }
    expect(results.size).toBe(5)
  })
})

describe("face parameters", () => {
  it("generates parameters for each agent type", () => {
    for (const agentType of ["general", "explore", "writer", "researcher", "video"]) {
      const rng = createRNG(hashString(agentType))
      const p = generateFaceParams(rng, agentType)
      expect(p.headW).toBeGreaterThan(0)
      expect(p.headH).toBeGreaterThan(0)
    }
  })

  it("computeLandmarks produces valid body structure", () => {
    const rng = createRNG(12345)
    const p = generateFaceParams(rng)
    const lm = computeLandmarks(p)
    expect(lm.head.w).toBeGreaterThan(0)
    expect(lm.head.h).toBeGreaterThan(0)
    expect(lm.neck.w).toBeGreaterThan(0)
    expect(lm.neck.h).toBeGreaterThan(0)
    expect(lm.body.w).toBeGreaterThan(0)
    expect(lm.body.h).toBeGreaterThan(0)
    expect(lm.leftLeg.y).toBeGreaterThan(lm.body.y)
    expect(lm.leftFoot.y).toBeGreaterThan(lm.leftLeg.y)
    expect(lm.leftEye.x).toBeGreaterThan(0)
    expect(lm.rightEye.x).toBeGreaterThan(lm.leftEye.x)
    expect(lm.mouth.w).toBeGreaterThan(0)
  })

  it("palette generation produces valid colors", () => {
    const rng = createRNG(67890)
    const palette = generatePalette(rng)
    expect(palette.skin.a).toBe(255)
    expect(palette.shirt.a).toBe(255)
    expect(palette.hair.a).toBe(255)
    expect(palette.pants.a).toBe(255)
    expect(palette.shoes.a).toBe(255)
    expect(palette.outline.a).toBe(255)
  })
})
