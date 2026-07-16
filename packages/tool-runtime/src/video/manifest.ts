import { Schema } from 'effect';

export const TrimOp = Schema.Struct({
  type: Schema.Literal('trim'),
  source: Schema.String,
  start: Schema.String,
  end: Schema.optional(Schema.String),
  duration: Schema.optional(Schema.String),
});

export const ScaleOp = Schema.Struct({
  type: Schema.Literal('scale'),
  width: Schema.Number,
  height: Schema.optional(Schema.Number),
});

export const CropOp = Schema.Struct({
  type: Schema.Literal('crop'),
  width: Schema.Number,
  height: Schema.Number,
  x: Schema.Number,
  y: Schema.Number,
});

export const SpeedOp = Schema.Struct({
  type: Schema.Literal('speed'),
  factor: Schema.Number,
});

export const OverlayOp = Schema.Struct({
  type: Schema.Literal('overlay'),
  source: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  scale: Schema.optional(Schema.Number),
});

export const DrawTextOp = Schema.Struct({
  type: Schema.Literal('drawtext'),
  text: Schema.String,
  fontSize: Schema.optional(Schema.Number),
  font: Schema.optional(Schema.String),
  color: Schema.optional(Schema.String),
  x: Schema.optional(Schema.String),
  y: Schema.optional(Schema.String),
  duration: Schema.optional(Schema.Number),
});

export const ColorOp = Schema.Struct({
  type: Schema.Literal('color'),
  brightness: Schema.optional(Schema.Number),
  contrast: Schema.optional(Schema.Number),
  saturation: Schema.optional(Schema.Number),
  gamma: Schema.optional(Schema.Number),
});

export const ConcatOp = Schema.Struct({
  type: Schema.Literal('concat'),
  sources: Schema.Array(Schema.String),
  reencode: Schema.optional(Schema.Boolean),
});

export const AudioMixOp = Schema.Struct({
  type: Schema.Literal('audiomix'),
  source: Schema.String,
  volume: Schema.optional(Schema.Number),
  fadeIn: Schema.optional(Schema.Number),
  fadeOut: Schema.optional(Schema.Number),
});

export const NormalizeAudioOp = Schema.Struct({
  type: Schema.Literal('normalizeaudio'),
  targetLUFS: Schema.optional(Schema.Number),
});

export const SubtitlesOp = Schema.Struct({
  type: Schema.Literal('subtitles'),
  source: Schema.String,
  file: Schema.String,
});

export const GifOp = Schema.Struct({
  type: Schema.Literal('gif'),
  source: Schema.String,
  width: Schema.optional(Schema.Number),
  fps: Schema.optional(Schema.Number),
  maxDuration: Schema.optional(Schema.Number),
});

export const ThumbnailOp = Schema.Struct({
  type: Schema.Literal('thumbnail'),
  source: Schema.String,
  at: Schema.String,
  width: Schema.optional(Schema.Number),
  outputName: Schema.optional(Schema.String),
});

export const PreviewOp = Schema.Struct({
  type: Schema.Literal('preview'),
  source: Schema.String,
  duration: Schema.optional(Schema.Number),
  start: Schema.optional(Schema.String),
  width: Schema.optional(Schema.Number),
  crf: Schema.optional(Schema.Number),
});

export const EditOperation = Schema.Union(
  TrimOp, ScaleOp, CropOp, SpeedOp, OverlayOp, DrawTextOp,
  ColorOp, ConcatOp, AudioMixOp, NormalizeAudioOp, SubtitlesOp,
  GifOp, ThumbnailOp, PreviewOp,
);

export const OutputConfig = Schema.Struct({
  filename: Schema.String,
  codec: Schema.optional(Schema.String),
  crf: Schema.optional(Schema.Number),
  resolution: Schema.optional(Schema.String),
  fps: Schema.optional(Schema.Number),
  format: Schema.optional(Schema.Enums({ mp4: 'mp4', webm: 'webm', mov: 'mov', gif: 'gif' })),
});

export const CleanupConfig = Schema.Struct({
  deleteIntermediateFiles: Schema.optional(Schema.Boolean),
  deleteSourceAfter: Schema.optional(Schema.Boolean),
  maxAgeDays: Schema.optional(Schema.Number),
});

export const EditManifest = Schema.Struct({
  version: Schema.Number,
  output: OutputConfig,
  operations: Schema.Array(EditOperation),
  cleanup: Schema.optional(CleanupConfig),
});

export type TrimOpT = Schema.Schema.Type<typeof TrimOp>;
export type ScaleOpT = Schema.Schema.Type<typeof ScaleOp>;
export type CropOpT = Schema.Schema.Type<typeof CropOp>;
export type SpeedOpT = Schema.Schema.Type<typeof SpeedOp>;
export type OverlayOpT = Schema.Schema.Type<typeof OverlayOp>;
export type DrawTextOpT = Schema.Schema.Type<typeof DrawTextOp>;
export type ColorOpT = Schema.Schema.Type<typeof ColorOp>;
export type ConcatOpT = Schema.Schema.Type<typeof ConcatOp>;
export type AudioMixOpT = Schema.Schema.Type<typeof AudioMixOp>;
export type NormalizeAudioOpT = Schema.Schema.Type<typeof NormalizeAudioOp>;
export type SubtitlesOpT = Schema.Schema.Type<typeof SubtitlesOp>;
export type GifOpT = Schema.Schema.Type<typeof GifOp>;
export type ThumbnailOpT = Schema.Schema.Type<typeof ThumbnailOp>;
export type PreviewOpT = Schema.Schema.Type<typeof PreviewOp>;
export type EditOperationT = Schema.Schema.Type<typeof EditOperation>;
export type OutputConfigT = Schema.Schema.Type<typeof OutputConfig>;
export type CleanupConfigT = Schema.Schema.Type<typeof CleanupConfig>;
export type EditManifestT = Schema.Schema.Type<typeof EditManifest>;
