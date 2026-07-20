import { generateAvatar } from "./index"

for (const agent of ["general", "explore", "writer", "researcher", "video"]) {
  const img = generateAvatar("agent-" + agent, { agentType: agent === "general" ? undefined : agent })

  let opaque = 0
  let totalR = 0, totalG = 0, totalB = 0, totalP = 0
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] > 0) {
      opaque++
      totalR += img.data[i]
      totalG += img.data[i + 1]
      totalB += img.data[i + 2]
      totalP++
    }
  }
  const avgR = (totalR / totalP).toFixed(0)
  const avgG = (totalG / totalP).toFixed(0)
  const avgB = (totalB / totalP).toFixed(0)
  console.log(`${agent}: ${opaque} opaque pixels of ${64*64} total, avg (R=${avgR} G=${avgG} B=${avgB})`)
}
