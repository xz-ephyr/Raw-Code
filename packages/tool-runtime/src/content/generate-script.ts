import { Effect, Schema } from 'effect';
import { make } from '../tool/make';
import { putToolOutput } from '../store';
import { emit } from '../events';
import type { ToolExecuteContext } from '../types';

const inputSchema = Schema.Struct({
  source: Schema.String,
  format: Schema.Enums({ talkingHead: 'talking-head', voiceover: 'voiceover', interview: 'interview', tutorial: 'tutorial' }),
  duration: Schema.Number,
  tone: Schema.optional(Schema.String),
});

const outputSchema = Schema.Struct({
  scriptId: Schema.String,
  scenes: Schema.Array(
    Schema.Struct({
      sceneNumber: Schema.Number,
      narration: Schema.String,
      visualDescription: Schema.String,
      duration: Schema.Number,
    }),
  ),
  totalDuration: Schema.Number,
});

function generateScenes(source: string, format: string, duration: number, tone: string | undefined): Array<{
  sceneNumber: number; narration: string; visualDescription: string; duration: number;
}> {
  const sceneCount = Math.max(3, Math.ceil(duration / 30));
  const secPerScene = Math.floor(duration / sceneCount);
  const sourceLines = source.split('\n').filter(l => l.trim());
  const scenes: Array<{ sceneNumber: number; narration: string; visualDescription: string; duration: number }> = [];

  for (let i = 0; i < sceneCount; i++) {
    const sourceLine = sourceLines[i] || `Content section ${i + 1}`;
    const narration = `${tone ? `[${tone}] ` : ''}${sourceLine.substring(0, 200)}`;
    const visualDesc = format === 'talking-head'
      ? `Speaker on camera, discussing: "${sourceLine.substring(0, 60)}..."`
      : format === 'voiceover'
        ? `B-roll footage illustrating: "${sourceLine.substring(0, 60)}..."`
        : format === 'interview'
          ? `Interview setting, discussing: "${sourceLine.substring(0, 60)}..."`
          : `Screen recording demonstrating: "${sourceLine.substring(0, 60)}..."`;

    scenes.push({
      sceneNumber: i + 1,
      narration,
      visualDescription: visualDesc,
      duration: i === sceneCount - 1 ? duration - (secPerScene * (sceneCount - 1)) : secPerScene,
    });
  }

  return scenes;
}

export const generateScriptTool = make({
  description: 'Generate a video script from an article, topic, or brief.',
  input: inputSchema,
  output: outputSchema,
  inputJsonSchema: {
    type: 'object',
    properties: {
      source: { type: 'string', description: 'Source text, article, or brief to base the script on' },
      format: { type: 'string', enum: ['talking-head', 'voiceover', 'interview', 'tutorial'], description: 'Video format/style' },
      duration: { type: 'number', description: 'Target duration in seconds' },
      tone: { type: 'string', description: 'Desired tone (e.g. professional, casual, dramatic)' },
    },
    required: ['source', 'format', 'duration'],
  },
  execute: (input, context: ToolExecuteContext) =>
    Effect.gen(function* () {
      yield* Effect.log(`Generating ${input.format} script from source`);

      const scriptId = crypto.randomUUID();
      const scenes = generateScenes(input.source, input.format, input.duration, input.tone);
      const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
      const output = { scriptId, scenes, totalDuration };

      putToolOutput(context.sessionID, context.toolCallID, 'generate_script', input, output);
      emit({
        type: 'tool_call_end',
        sessionID: context.sessionID,
        agentID: context.agentID,
        timestamp: Date.now(),
        payload: { toolName: 'generate_script', toolCallID: context.toolCallID, scriptId, sceneCount: scenes.length },
      });

      return output;
    }),
});
