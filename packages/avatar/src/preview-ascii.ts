import { generateAvatar } from "./index"

const AGENTS = [
  { seed: "agent-alpha", agentType: undefined, label: "general" },
  { seed: "agent-beta", agentType: "explore", label: "explore" },
  { seed: "agent-gamma", agentType: "writer", label: "writer" },
  { seed: "agent-delta", agentType: "researcher", label: "researcher" },
  { seed: "agent-epsilon", agentType: "video", label: "video" },
]

for (const agent of AGENTS) {
  const img = generateAvatar(agent.seed, { agentType: agent.agentType })
  console.log(`\n=== ${agent.label.toUpperCase()} ===`)
  for (let y = 0; y < 64; y += 3) {
    let row = ""
    for (let x = 0; x < 64; x += 2) {
      const idx = (y * 64 + x) * 4
      const a = img.data[idx + 3]
      if (a < 128) { row += " "; continue }
      const r = img.data[idx], g = img.data[idx + 1], b = img.data[idx + 2]
      const bright = r * 0.299 + g * 0.587 + b * 0.114
      if (bright < 60) row += "@"
      else if (bright < 110) row += "#"
      else if (bright < 170) row += "x"
      else row += "."
    }
    if (row.trim()) console.log(row)
  }
  let opaque = 0, rAcc = 0, gAcc = 0, bAcc = 0
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] > 0) { opaque++; rAcc += img.data[i]; gAcc += img.data[i + 1]; bAcc += img.data[i + 2] }
  }
  console.log(`  ${opaque}px  avg(${Math.round(rAcc/opaque)},${Math.round(gAcc/opaque)},${Math.round(bAcc/opaque)})`)
}
