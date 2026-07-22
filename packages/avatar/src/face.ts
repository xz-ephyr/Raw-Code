import type { RNG } from "./rng"
import { pick } from "./rng"

export type AgentType = "general" | "explore" | "writer" | "researcher" | "video" | string

export interface FaceParameters {
  readonly headW: number
  readonly headH: number
  readonly cx: number
  readonly faceTopY: number
  readonly eyeY: number
  readonly eyeSep: number
  readonly eyeSize: number
  readonly noseLen: number
  readonly mouthH: number
  readonly mouthW: number
  readonly mouthY: number
  readonly browH: number
  readonly neckH: number
  readonly neckW: number
  readonly hairStyle: "short" | "spiky" | "long" | "buzz" | "side"
  readonly hairVolume: number
  readonly hasHat: boolean
  readonly hasGlasses: boolean
  readonly bodyW: number
  readonly bodyH: number
  readonly shoulderW: number
  readonly armLen: number
  readonly legLen: number
  readonly footH: number
  readonly build: "slim" | "medium" | "wide"
}

export interface AvatarLandmarks {
  readonly head: { x: number; y: number; w: number; h: number }
  readonly neck: { x: number; y: number; w: number; h: number }
  readonly body: { x: number; y: number; w: number; h: number }
  readonly leftArm: { x: number; y: number; w: number; h: number }
  readonly rightArm: { x: number; y: number; w: number; h: number }
  readonly leftLeg: { x: number; y: number; w: number; h: number }
  readonly rightLeg: { x: number; y: number; w: number; h: number }
  readonly leftFoot: { x: number; y: number; w: number; h: number }
  readonly rightFoot: { x: number; y: number; w: number; h: number }
  readonly leftEye: { x: number; y: number }
  readonly rightEye: { x: number; y: number }
  readonly mouth: { x: number; y: number; w: number }
  readonly nose: { x: number; y: number }
  readonly hairTop: { x: number; y: number; w: number; h: number }
  readonly hat: { x: number; y: number; w: number; h: number } | null
  readonly glasses: boolean
}

function rngRange(rng: RNG, min: number, max: number): number {
  return min + rng() * (max - min)
}

export function generateFaceParams(rng: RNG, agentType?: AgentType): FaceParameters {
  const size = 64

  const headW = rngRange(rng, 16, 22)
  const headH = rngRange(rng, 18, 24)
  const cx = size / 2
  const faceTopY = rngRange(rng, 2, 6)

  const build = pick(rng, agentType === "writer" ? ["slim"] : agentType === "explore" ? ["medium", "wide"] : ["slim", "medium", "wide"]) as "slim" | "medium" | "wide"
  const bodyW = build === "slim" ? rngRange(rng, 14, 16) : build === "wide" ? rngRange(rng, 20, 24) : rngRange(rng, 16, 20)
  const shoulderW = bodyW + (build === "wide" ? 6 : 4)
  const bodyH = rngRange(rng, 14, 18)

  const hairStyle = (() => {
    if (agentType === "explore") return pick(rng, ["spiky", "short", "side"] as const)
    if (agentType === "writer") return pick(rng, ["short", "side", "long"] as const)
    if (agentType === "video") return pick(rng, ["long", "spiky", "side"] as const)
    if (agentType === "researcher") return pick(rng, ["short", "buzz", "side"] as const)
    return pick(rng, ["short", "spiky", "long", "buzz", "side"] as const)
  })()

  return {
    headW, headH, cx, faceTopY,
    eyeY: faceTopY + headH * 0.48,
    eyeSep: rngRange(rng, 4, 7),
    eyeSize: rngRange(rng, 1, 2.5),
    noseLen: rngRange(rng, 3, 6),
    mouthH: faceTopY + headH * 0.78,
    mouthW: rngRange(rng, 3, 6),
    mouthY: faceTopY + headH * 0.78,
    browH: rngRange(rng, 2, 4),
    neckH: 3,
    neckW: Math.round(bodyW * 0.55),
    hairStyle,
    hairVolume: rngRange(rng, 1, 4),
    hasHat: agentType === "explore" ? rng() > 0.4 : false,
    hasGlasses: agentType === "researcher" ? rng() > 0.3 : rng() > 0.75,
    bodyW, bodyH, shoulderW, armLen: rngRange(rng, 8, 12),
    legLen: rngRange(rng, 9, 13),
    footH: 4,
    build,
  }
}

export function computeLandmarks(p: FaceParameters): AvatarLandmarks {
  const size = 64

  const headX = Math.round(p.cx - p.headW / 2)
  const headY = Math.round(p.faceTopY)
  const headB = { x: headX, y: headY, w: p.headW, h: p.headH }

  const neckTop = headY + p.headH
  const neckX = Math.round(p.cx - p.neckW / 2)
  const neckB = { x: neckX, y: neckTop, w: p.neckW, h: p.neckH }

  const bodyTop = neckTop + p.neckH
  const bodyX = Math.round(p.cx - p.bodyW / 2)
  const bodyB = { x: bodyX, y: bodyTop, w: p.bodyW, h: p.bodyH }

  const armY = bodyTop + 2
  const armH = p.bodyH - 2
  const lArm = { x: bodyX - Math.round(p.shoulderW / 2 - p.bodyW / 2) - 2, y: armY, w: 3, h: armH }
  const rArm = { x: bodyX + p.bodyW - 1, y: armY, w: 3, h: armH }

  const legTop = bodyTop + p.bodyH
  const legW = Math.round(p.bodyW * 0.38)
  const legXGap = Math.round(p.bodyW * 0.08)
  const lLegX = bodyX + legXGap
  const rLegX = bodyX + p.bodyW - legXGap - legW
  const lLeg = { x: lLegX, y: legTop, w: legW, h: p.legLen }
  const rLeg = { x: rLegX, y: legTop, w: legW, h: p.legLen }

  const footTop = legTop + p.legLen
  const footW = legW + 2
  const lFoot = { x: lLegX - 1, y: footTop, w: footW, h: p.footH }
  const rFoot = { x: rLegX - 1, y: footTop, w: footW, h: p.footH }

  const eyeY = Math.round(p.eyeY)
  const lEyeX = Math.round(p.cx - p.eyeSep / 2 - p.eyeSize / 2)
  const rEyeX = Math.round(p.cx + p.eyeSep / 2 - p.eyeSize / 2)

  const mouthY = Math.round(p.mouthY)

  const hairTop = Math.max(0, headY - Math.round(3 + p.hairVolume))
  const hairW = p.headW + (p.hairStyle === "long" ? 4 : p.hairStyle === "spiky" ? 2 : 0)
  const hairX = Math.round(headX - (hairW - p.headW) / 2)
  const hairH = headY - hairTop + Math.round(p.headH * 0.3)

  const hat = p.hasHat ? {
    x: hairX - 2,
    y: hairTop - 4,
    w: hairW + 4,
    h: 6,
  } : null

  return {
    head: headB,
    neck: neckB,
    body: bodyB,
    leftArm: lArm,
    rightArm: rArm,
    leftLeg: lLeg,
    rightLeg: rLeg,
    leftFoot: lFoot,
    rightFoot: rFoot,
    leftEye: { x: lEyeX, y: eyeY },
    rightEye: { x: rEyeX, y: eyeY },
    mouth: { x: p.cx - Math.round(p.mouthW / 2), y: mouthY, w: p.mouthW },
    nose: { x: p.cx, y: Math.round(eyeY + p.noseLen) },
    hairTop: { x: hairX, y: hairTop, w: hairW, h: hairH },
    hat,
    glasses: p.hasGlasses,
  }
}
