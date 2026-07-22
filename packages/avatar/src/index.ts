/**
 * @doktor/avatar — procedural pixel portrait generator for agent avatars
 *
 * Usage:
 *   import { generateAvatar } from "@doktor/avatar"
 *   const imageData = generateAvatar("agent-general-explore")
 *   // imageData is an ImageData (Uint8ClampedArray RGBA, 64x64)
 *   // Use ctx.putImageData(imageData, 0, 0) to render to a canvas
 */

import { createRNG, hashString } from "./rng"
import { generateFaceParams, computeLandmarks, type AgentType } from "./face"
import { generatePalette } from "./palette"
import { renderAvatar, type PixelImage } from "./rasterizer"

export interface GenerateAvatarOptions {
  readonly agentType?: AgentType
}

export function generateAvatar(seed: string, options?: GenerateAvatarOptions): PixelImage {
  const rng = createRNG(hashString(seed))

  const p = generateFaceParams(rng, options?.agentType)
  const lm = computeLandmarks(p)
  const palette = generatePalette(rng, options?.agentType)

  return renderAvatar(p, lm, palette)
}

export { hashString } from "./rng"
export type { AgentType } from "./face"
export type { AvatarPalette } from "./palette"
export type { RGBA } from "./palette"
export type { PixelImage } from "./rasterizer"
export { generateFaceParams, computeLandmarks } from "./face"
export { generatePalette } from "./palette"
export { renderAvatar } from "./rasterizer"
