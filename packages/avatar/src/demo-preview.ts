import { generateAvatar } from "./index"
import * as zlib from "zlib"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const AGENTS = [
  { seed: "agent-alpha", agentType: undefined, label: "general" },
  { seed: "agent-beta", agentType: "explore", label: "explore" },
  { seed: "agent-gamma", agentType: "writer", label: "writer" },
  { seed: "agent-delta", agentType: "researcher", label: "researcher" },
  { seed: "agent-epsilon", agentType: "video", label: "video" },
]

for (const agent of AGENTS) {
  const img = generateAvatar(agent.seed, { agentType: agent.agentType })
  const png = encodePNG(img.width, img.height, Buffer.from(img.data))
  const outPath = path.resolve(__dirname, `../preview-${agent.label}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`Wrote ${outPath} (${png.length} bytes)`)

  // Stats
  let opaque = 0, total = 0, sum = 0
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] > 0) { opaque++; sum += img.data[i]; total++ }
  }
  console.log(`  pixels: ${opaque}/${64*64} opaque, avg luminance: ${total > 0 ? (sum/total).toFixed(1) : 'N/A'}`)
}

function encodePNG(width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const ihdrChunk = makeChunk("IHDR", ihdr)

  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4)
    raw[rowOffset] = 0
    for (let x = 0; x < width; x++) {
      const srcOff = (y * width + x) * 4
      const dstOff = rowOffset + 1 + x * 4
      raw[dstOff] = rgba[srcOff]
      raw[dstOff + 1] = rgba[srcOff + 1]
      raw[dstOff + 2] = rgba[srcOff + 2]
      raw[dstOff + 3] = rgba[srcOff + 3]
    }
  }
  const deflated = zlib.deflateSync(raw)
  const idatChunk = makeChunk("IDAT", deflated)
  const iendChunk = makeChunk("IEND", Buffer.alloc(0))
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const typeB = Buffer.from(type, "ascii")
  const crcData = Buffer.concat([typeB, data])
  const crcV = crc32(crcData)
  const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crcV)
  return Buffer.concat([len, typeB, data, crcB])
}

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}
