import { useState, useCallback, useRef } from 'react'
import { ChatStreamService } from '@/services/ChatStreamService'
import { DEFAULT_AGENT_TASKS, type AgentTask } from '@tests/selftest/agent-tasks'

type TaskStatus = 'idle' | 'running' | 'pass' | 'fail'

interface TaskResult {
  task: AgentTask
  status: TaskStatus
  response: string
  toolCalls: string[]
  error?: string
  durationMs: number
}

function createInitialResults(): TaskResult[] {
  return DEFAULT_AGENT_TASKS.map((task) => ({
    task,
    status: 'idle' as TaskStatus,
    response: '',
    toolCalls: [],
    durationMs: 0,
  }))
}

function checkTask(task: AgentTask, response: string, toolCalls: string[]): { pass: boolean; details: string[] } {
  const details: string[] = []
  const content = response.trim()
  const hasSubagentCall = toolCalls.includes('subagent_run')
  const expected = task.expected

  if (expected.minLength && content.length < expected.minLength) {
    details.push(`Response too short: ${content.length} chars (expected >= ${expected.minLength})`)
  }

  if (expected.delegatesSubagent && !hasSubagentCall) {
    details.push(`Expected subagent_run call but none found`)
  }
  if (expected.directResponse && hasSubagentCall) {
    details.push(`Expected direct response but subagent_run was called`)
  }

  if (expected.mustContain) {
    for (const kw of expected.mustContain) {
      if (!content.toLowerCase().includes(kw.toLowerCase())) {
        details.push(`Expected content to contain "${kw}"`)
      }
    }
  }
  if (expected.mustNotContain) {
    for (const kw of expected.mustNotContain) {
      if (content.toLowerCase().includes(kw.toLowerCase())) {
        details.push(`Content unexpectedly contains "${kw}"`)
      }
    }
  }

  return { pass: details.length === 0, details }
}

async function runTask(task: AgentTask, onProgress: (msg: string) => void): Promise<{ response: string; toolCalls: string[]; durationMs: number }> {
  const sessionId = `test-agent-${task.id}-${Date.now()}`
  const start = Date.now()

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ChatStreamService.stop(sessionId)
      reject(new Error('Timeout after 120s'))
    }, 120_000)

    let fullResponse = ''
    const toolCallNames: string[] = []

    ChatStreamService.start(
      {
        sessionId,
        messages: [{ id: '1', role: 'user' as const, content: task.prompt, createdAt: Date.now() }],
        modelName: 'auto',
        modeId: 'default',
      },
      {
        onMessage: (msg, _partial) => {
          if (msg.content) {
            onProgress(msg.content)
            fullResponse = msg.content
          }
          if (msg.toolInvocations) {
            for (const ti of msg.toolInvocations) {
              if (!toolCallNames.includes(ti.toolName)) {
                toolCallNames.push(ti.toolName)
              }
            }
          }
        },
        onFinish: () => {
          clearTimeout(timeout)
          ChatStreamService.stop(sessionId)
          resolve({ response: fullResponse, toolCalls: toolCallNames, durationMs: Date.now() - start })
        },
        onError: (err) => {
          clearTimeout(timeout)
          ChatStreamService.stop(sessionId)
          reject(err)
        },
      },
    )
  })
}

export function AgentTaskTestRunner() {
  const [results, setResults] = useState<TaskResult[]>(createInitialResults)
  const [running, setRunning] = useState(false)
  const overallRef = useRef({ total: 0, passed: 0, failed: 0 })

  const runAll = useCallback(async () => {
    setRunning(true)
    overallRef.current = { total: 0, passed: 0, failed: 0 }

    for (let i = 0; i < DEFAULT_AGENT_TASKS.length; i++) {
      const task = DEFAULT_AGENT_TASKS[i]

      setResults((prev) => {
        const next = [...prev]
        next[i] = { ...next[i], status: 'running', response: '', toolCalls: [], error: undefined }
        return next
      })

      try {
        const { response, toolCalls, durationMs } = await runTask(task, (msg) => {
          setResults((prev) => {
            const next = [...prev]
            next[i] = { ...next[i], response: msg }
            return next
          })
        })

        const check = checkTask(task, response, toolCalls)
        const status = check.pass ? 'pass' : 'fail'

        setResults((prev) => {
          const next = [...prev]
          next[i] = {
            ...next[i],
            status,
            response,
            toolCalls,
            durationMs,
            error: check.details.length > 0 ? check.details.join('; ') : undefined,
          }
          return next
        })

        overallRef.current.total++
        if (check.pass) overallRef.current.passed++
        else overallRef.current.failed++
      } catch (e: any) {
        setResults((prev) => {
          const next = [...prev]
          next[i] = {
            ...next[i],
            status: 'fail',
            error: e.message ?? String(e),
            durationMs: 0,
          }
          return next
        })
        overallRef.current.total++
        overallRef.current.failed++
      }
    }

    setRunning(false)
  }, [])

  const reset = useCallback(() => {
    setResults(createInitialResults())
    overallRef.current = { total: 0, passed: 0, failed: 0 }
  }, [])

  const total = DEFAULT_AGENT_TASKS.length
  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  const running_count = results.filter((r) => r.status === 'running').length

  return (
    <div style={{ padding: '24px', fontFamily: 'monospace', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
        Default Agent Mode — Real Test Suite
      </h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        Runs {total} real LLM calls through ChatStreamService to verify default mode persona behavior.
        Requires at least one API key configured in Settings.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          onClick={runAll}
          disabled={running}
          style={{
            padding: '8px 24px',
            background: running ? '#999' : '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: running ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {running ? `Running (${running_count}/${total})...` : '▶ Run All Tests'}
        </button>
        <button
          onClick={reset}
          disabled={running}
          style={{
            padding: '8px 16px',
            background: '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      {!running && (passed + failed > 0) && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontWeight: 600,
            background: failed === 0 ? '#d4edda' : '#f8d7da',
            color: failed === 0 ? '#155724' : '#721c24',
          }}
        >
          {failed === 0 ? `✅ All ${passed}/${total} tests passed` : `❌ ${failed}/${total} tests failed`}
        </div>
      )}

      {results.map((r, i) => (
        <div
          key={r.task.id}
          style={{
            border: '1px solid',
            borderColor: r.status === 'pass' ? '#c3e6cb' : r.status === 'fail' ? '#f5c6cb' : r.status === 'running' ? '#ffeeba' : '#dee2e6',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            background: r.status === 'running' ? '#fffef0' : '#fff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <strong style={{ color: '#333' }}>
              {i + 1}. {r.task.name}
            </strong>
            <span
              style={{
                fontSize: '0.8rem',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 600,
                background:
                  r.status === 'pass' ? '#d4edda' : r.status === 'fail' ? '#f8d7da' : r.status === 'running' ? '#fff3cd' : '#e9ecef',
                color:
                  r.status === 'pass' ? '#155724' : r.status === 'fail' ? '#721c24' : r.status === 'running' ? '#856404' : '#6c757d',
              }}
            >
              {r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : r.status === 'running' ? '...' : 'IDLE'} {r.durationMs > 0 ? `(${(r.durationMs / 1000).toFixed(1)}s)` : ''}
            </span>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>
            Prompt: <em>{r.task.prompt}</em>
          </div>

          {r.error && (
            <div style={{ fontSize: '0.8rem', color: '#721c24', background: '#f8d7da', padding: '6px 8px', borderRadius: '4px', marginTop: '4px' }}>
              {r.error}
            </div>
          )}

          {r.response && (
            <div
              style={{
                fontSize: '0.8rem',
                color: '#333',
                background: '#f8f9fa',
                padding: '8px',
                borderRadius: '4px',
                marginTop: '4px',
                maxHeight: '150px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {r.response.length > 300 ? `${r.response.slice(0, 300)}...` : r.response}
            </div>
          )}

          {r.toolCalls.length > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#856404', marginTop: '4px' }}>
              Tool calls: {r.toolCalls.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
