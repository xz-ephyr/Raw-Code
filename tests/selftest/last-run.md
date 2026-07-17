# Self-Test Scorecard

- **Version:** 0.1.0-dev
- **Timestamp:** 2026-07-17T21:31:06.999Z
- **Duration:** 24519ms

## Summary

| Status | Count |
|--------|------:|
| ✅ Pass | 0 |
| ❌ Fail | 10 |
| ⏭️  Skip | 0 |
| **Total** | **10** |

## teamwork-real-tasks

| Status | Count |
|--------|------:|
| ✅ Pass | 0 |
| ❌ Fail | 10 |
| ⏭️  Skip | 0 |
| **Total** | **10** |

### Failures

- **T1-single-factual** (0ms): [single] Single sub-agent: answer a factual question from knowledge threw: An unknown error occurred in Effect.tryPromise
- **T2-single-math** (0ms): [single] Single sub-agent: arithmetic reasoning
  output: 
  problems: missing facts: 408; too short (<1)
- **T3-parallel** (0ms): [parallel] Parallel agents: 3 independent factual questions, synthesized
  output: 
  problems: missing facts: 1969, au, shakespeare; too short (<20)
- **T4-parallel-conflict** (0ms): [parallel] Parallel agents: conflicting answers must both be preserved in synthesis
  output: 
  problems: missing facts: jupiter, saturn; too short (<8)
- **T5-compose-research-write** (0ms): [compose] Compose pipeline: researcher -> writer (output interpolation)
  output: 
  problems: missing facts: walk; too short (<40); writer output does not reflect researched health benefits
- **T6-compose-explore-writer** (0ms): [compose] Compose pipeline: explore -> writer producing titled article
  output: 
  problems: missing facts: solar, wind; too short (<15)
- **T7-single-classification** (0ms): [single] Single agent: structured classification task
  output: 
  problems: missing facts: positive; too short (<4)
- **T8-parallel-languages** (0ms): [parallel] Parallel agents: translate a word into two languages
  output: 
  problems: missing facts: gracias, merci; too short (<8)
- **T9-compose-summary** (0ms): [compose] Compose pipeline: 2 writer steps chained via interpolation
  output: 
  problems: missing facts: book; too short (<20)
- **T10-single-error-recover** (0ms): [single] Single agent: handles an impossible/contradictory instruction gracefully
  output: 
  problems: missing facts: cannot, impossible; too short (<20)
