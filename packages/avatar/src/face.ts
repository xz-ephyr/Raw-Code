import type { RNG } from "./rng"
import { lerp } from "./rng"
import type { Vec2 } from "./primitives"
import { vec2 } from "./primitives"

export type AgentType = "general" | "explore" | "writer" | "researcher" | "video" | string

export interface FaceParameters {
  readonly headW: number
  readonly headH: number
  readonly faceTopY: number
  readonly faceBottomY: number
  readonly cx: number
  readonly cy: number
  readonly jawW: number
  readonly jawAngularity: number
  readonly chin: number
  readonly eyeSize: number
  readonly eyeTilt: number
  readonly eyeSep: number
  readonly browH: number
  readonly browAngle: number
  readonly noseW: number
  readonly noseLen: number
  readonly noseBridge: number
  readonly mouthW: number
  readonly mouthThick: number
  readonly neckW: number
  readonly neckH: number
  readonly hasGlasses: boolean
}

export interface FaceLandmarks {
  readonly head: { cx: number; cy: number; rx: number; ry: number }
  readonly neck: { cx: number; topY: number; botY: number; rx: number }
  readonly jaw: { readonly points: readonly Vec2[] }
  readonly leftEye: { cx: number; cy: number; w: number; h: number }
  readonly rightEye: { cx: number; cy: number; w: number; h: number }
  readonly leftBrow: { cx: number; cy: number; w: number; h: number; angle: number }
  readonly rightBrow: { cx: number; cy: number; w: number; h: number; angle: number }
  readonly nose: { bridgeTop: Vec2; bridgeBot: Vec2; tip: Vec2; leftN: Vec2; rightN: Vec2; nw: number }
  readonly mouth: { cx: number; cy: number; halfW: number; upperH: number; lowerH: number }
  readonly hasGlasses: boolean
}

export function generateFaceParams(rng: RNG, agentType?: AgentType): FaceParameters {
  const size = 64

  // Base face — different head shapes per agent type
  let headW: number, headH: number, faceTopY: number

  switch (agentType) {
    case "explore":
      headW = size * 0.60
      headH = size * 0.80
      faceTopY = size * 0.04
      break
    case "writer":
      headW = size * 0.52
      headH = size * 0.76
      faceTopY = size * 0.06
      break
    case "researcher":
      headW = size * 0.50
      headH = size * 0.74
      faceTopY = size * 0.06
      break
    case "video":
      headW = size * 0.58
      headH = size * 0.78
      faceTopY = size * 0.04
      break
    default: // general
      headW = size * 0.55
      headH = size * 0.76
      faceTopY = size * 0.06
  }

  const cx = size / 2
  const cy = faceTopY + headH / 2

  // Randomize within agent range
  let jawW: number, jawAngularity: number, chin: number, eyeSize: number
  let eyeTilt: number, eyeSep: number, browH: number, browAngle: number
  let noseW: number, noseLen: number, noseBridge: number
  let mouthW: number, mouthThick: number
  let neckW: number, neckH: number
  let hasGlasses: boolean

  switch (agentType) {
    case "explore":
      jawW = 0.3 + rng() * 0.3
      jawAngularity = 0.1 + rng() * 0.2
      chin = 0.2 + rng() * 0.2
      eyeSize = 0.6 + rng() * 0.4
      eyeTilt = (rng() - 0.2) * 0.3
      eyeSep = 0.3 + rng() * 0.2
      browH = 0.6 + rng() * 0.4
      browAngle = 0.1 + rng() * 0.4
      noseW = 0.2 + rng() * 0.3
      noseLen = 0.2 + rng() * 0.2
      noseBridge = 0.1 + rng() * 0.2
      mouthW = 0.3 + rng() * 0.3
      mouthThick = 0.3 + rng() * 0.3
      neckW = 0.25
      neckH = 0.12
      hasGlasses = false
      break
    case "writer":
      jawW = 0.4 + rng() * 0.3
      jawAngularity = 0.3 + rng() * 0.4
      chin = 0.3 + rng() * 0.3
      eyeSize = 0.3 + rng() * 0.3
      eyeTilt = (rng() - 0.3) * 0.5
      eyeSep = 0.4 + rng() * 0.2
      browH = 0.3 + rng() * 0.3
      browAngle = 0.1 + rng() * 0.3
      noseW = 0.3 + rng() * 0.3
      noseLen = 0.5 + rng() * 0.3
      noseBridge = 0.3 + rng() * 0.3
      mouthW = 0.4 + rng() * 0.3
      mouthThick = 0.3 + rng() * 0.3
      neckW = 0.28
      neckH = 0.14
      hasGlasses = false
      break
    case "researcher":
      jawW = 0.4 + rng() * 0.2
      jawAngularity = 0.4 + rng() * 0.4
      chin = 0.4 + rng() * 0.3
      eyeSize = 0.2 + rng() * 0.2
      eyeTilt = (rng() - 0.4) * 0.4
      eyeSep = 0.3 + rng() * 0.2
      browH = 0.2 + rng() * 0.2
      browAngle = -0.2 + rng() * 0.2
      noseW = 0.4 + rng() * 0.3
      noseLen = 0.5 + rng() * 0.3
      noseBridge = 0.5 + rng() * 0.4
      mouthW = 0.3 + rng() * 0.3
      mouthThick = 0.2 + rng() * 0.2
      neckW = 0.27
      neckH = 0.13
      hasGlasses = rng() > 0.3
      break
    case "video":
      jawW = 0.4 + rng() * 0.3
      jawAngularity = 0.2 + rng() * 0.3
      chin = 0.3 + rng() * 0.3
      eyeSize = 0.5 + rng() * 0.3
      eyeTilt = (rng() - 0.2) * 0.4
      eyeSep = 0.4 + rng() * 0.2
      browH = 0.3 + rng() * 0.3
      browAngle = 0.0 + rng() * 0.3
      noseW = 0.4 + rng() * 0.3
      noseLen = 0.4 + rng() * 0.3
      noseBridge = 0.3 + rng() * 0.3
      mouthW = 0.6 + rng() * 0.3
      mouthThick = 0.4 + rng() * 0.4
      neckW = 0.30
      neckH = 0.14
      hasGlasses = false
      break
    default:
      jawW = 0.4 + rng() * 0.3
      jawAngularity = 0.3 + rng() * 0.3
      chin = 0.3 + rng() * 0.3
      eyeSize = 0.4 + rng() * 0.3
      eyeTilt = (rng() - 0.4) * 0.4
      eyeSep = 0.4 + rng() * 0.2
      browH = 0.3 + rng() * 0.3
      browAngle = (rng() - 0.3) * 0.4
      noseW = 0.3 + rng() * 0.3
      noseLen = 0.4 + rng() * 0.3
      noseBridge = 0.3 + rng() * 0.3
      mouthW = 0.4 + rng() * 0.3
      mouthThick = 0.3 + rng() * 0.3
      neckW = 0.28
      neckH = 0.13
      hasGlasses = false
  }

  const faceBottomY = faceTopY + headH

  return {
    headW, headH, faceTopY, faceBottomY, cx, cy,
    jawW, jawAngularity, chin, eyeSize, eyeTilt, eyeSep,
    browH, browAngle, noseW, noseLen, noseBridge,
    mouthW, mouthThick, neckW, neckH, hasGlasses,
  }
}

export function computeLandmarks(p: FaceParameters): FaceLandmarks {
  const { headW, headH, faceTopY, cx, neckW, neckH, hasGlasses } = p
  const cy = faceTopY + headH / 2
  const head = { cx, cy, rx: headW / 2, ry: headH / 2 }

  // Neck
  const neckTopY = faceTopY + headH - 4
  const neckBotY = Math.min(64, faceTopY + headH + headH * neckH)
  const neckRx = headW * neckW

  // Jaw
  const chinY = faceTopY + headH * 0.92
  const chinX = cx
  const jawLX = cx - headW * (0.35 + p.jawW * 0.15)
  const jawRX = cx + headW * (0.35 + p.jawW * 0.15)
  const jCtrlY = faceTopY + headH * 0.7
  const cOff = p.chin * headH * 0.05
  const ang = p.jawAngularity * 0.3
  const jaw = {
    points: [
      vec2(jawLX, faceTopY + headH * 0.45),
      vec2(jawLX - ang * 3, faceTopY + headH * 0.55),
      vec2(jawLX - ang * 2, jCtrlY),
      vec2(lerp(jawLX, chinX, 0.5) - ang * 2, chinY - cOff * 1.5),
      vec2(chinX, chinY + cOff),
      vec2(lerp(chinX, jawRX, 0.5) + ang * 2, chinY - cOff * 1.5),
      vec2(jawRX + ang * 2, jCtrlY),
      vec2(jawRX + ang * 3, faceTopY + headH * 0.55),
      vec2(jawRX, faceTopY + headH * 0.45),
    ],
  }

  // Eyes
  const eyeY = faceTopY + headH * 0.50
  const eyeW = headW * 0.22 * (0.6 + p.eyeSize * 0.4)
  const eyeH = eyeW * 0.45
  const eyeSp = eyeW * (1.0 + p.eyeSep * 0.4)
  const lEyeCx = cx - eyeSp / 2 - eyeW / 2
  const rEyeCx = cx + eyeSp / 2 + eyeW / 2

  // Brows
  const browW = eyeW * 1.2
  const browH = eyeH * 0.6
  const browY = eyeY - eyeH * 0.7 - browH * p.browH

  // Nose
  const noseBaseY = faceTopY + headH * 0.66
  const noseW2 = headW * 0.18 * (0.6 + p.noseW * 0.4)

  // Mouth
  const mouthY = faceTopY + headH * 0.78
  const mouthHalfW = (rEyeCx + eyeW / 2 - lEyeCx - eyeW / 2) * 1.25 * (0.7 + p.mouthW * 0.3)

  return {
    head,
    neck: { cx, topY: neckTopY, botY: neckBotY, rx: neckRx },
    jaw,
    leftEye: { cx: lEyeCx, cy: eyeY, w: eyeW, h: eyeH },
    rightEye: { cx: rEyeCx, cy: eyeY, w: eyeW, h: eyeH },
    leftBrow: { cx: lEyeCx, cy: browY, w: browW, h: browH, angle: p.browAngle },
    rightBrow: { cx: rEyeCx, cy: browY, w: browW, h: browH, angle: p.browAngle },
    nose: {
      bridgeTop: vec2(cx, eyeY + eyeH * 0.3 - p.noseBridge * headH * 0.08),
      bridgeBot: vec2(cx, noseBaseY - headH * 0.05),
      tip: vec2(cx, noseBaseY),
      leftN: vec2(cx - noseW2 / 2, noseBaseY + headH * 0.01),
      rightN: vec2(cx + noseW2 / 2, noseBaseY + headH * 0.01),
      nw: noseW2 * 0.4,
    },
    mouth: {
      cx, cy: mouthY, halfW: mouthHalfW,
      upperH: 2 + p.mouthThick * 3,
      lowerH: 2 + p.mouthThick * 2,
    },
    hasGlasses,
  }
}
