import { Schema } from "effect"

export const ProviderMetadata = Schema.Record({ key: Schema.String, value: Schema.Record({ key: Schema.String, value: Schema.Unknown }) })
export type ProviderMetadata = Schema.Schema.Type<typeof ProviderMetadata>

export interface ToolTextContent extends Schema.Schema.Type<typeof ToolTextContent> {}
export const ToolTextContent = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
})

export interface ToolFileContent extends Schema.Schema.Type<typeof ToolFileContent> {}
export const ToolFileContent = Schema.Struct({
  type: Schema.Literal("file"),
  uri: Schema.String,
  mime: Schema.String,
  name: Schema.optional(Schema.String),
})

export const ToolContent = Schema.Union(ToolTextContent, ToolFileContent)
export type ToolContent = Schema.Schema.Type<typeof ToolContent>
