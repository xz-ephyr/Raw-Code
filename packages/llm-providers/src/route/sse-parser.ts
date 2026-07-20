export interface SSEMessage {
  readonly data: string
  readonly event?: string
  readonly id?: string
}

export interface SSEParser {
  push(chunk: Uint8Array): ReadonlyArray<SSEMessage>
  flush(): ReadonlyArray<SSEMessage>
}

export function createSSEParser(): SSEParser {
  let buffer = ""
  const decoder = new TextDecoder()

  function processBuffer(): ReadonlyArray<SSEMessage> {
    const events: Array<SSEMessage> = []
    const parts = buffer.split("\n\n")
    buffer = parts.pop() ?? ""

    for (const part of parts) {
      if (part.length === 0) continue
      const msg = parseEventBlock(part)
      if (msg) events.push(msg)
    }

    return events
  }

  return {
    push(chunk: Uint8Array): ReadonlyArray<SSEMessage> {
      buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n")
      return processBuffer()
    },

    flush(): ReadonlyArray<SSEMessage> {
      buffer += decoder.decode().replace(/\r\n/g, "\n")
      const remaining = processBuffer()
      buffer = ""
      return remaining
    },
  }
}

function parseEventBlock(block: string): SSEMessage | null {
  const lines = block.split("\n")
  let data: string | undefined
  let event: string | undefined
  let id: string | undefined

  for (const line of lines) {
    if (line.startsWith("data:")) {
      const rest = line[5] === " " ? line.slice(6) : line.slice(5)
      data = (data ?? "") + rest + "\n"
    } else if (line.startsWith("event:")) {
      event = line[6] === " " ? line.slice(7) : line.slice(6)
    } else if (line.startsWith("id:")) {
      id = line[3] === " " ? line.slice(4) : line.slice(3)
    } else if (line.startsWith("retry:")) {
      // retry field, not used
    } else if (line.startsWith(":")) {
      // comment/heartbeat, skip
    }
  }

  if (data === undefined) return null

  const trimmed = data.endsWith("\n") ? data.slice(0, -1) : data

  if (trimmed === "[DONE]") {
    return { event: "done", data: "[DONE]", id }
  }

  return { data: trimmed, event, id }
}
