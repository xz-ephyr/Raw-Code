import { Schema } from "effect"
import { JsonSchema, ModelID, ProviderID } from "./ids"

export const mergeJsonRecords = (
  ...items: ReadonlyArray<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined => {
  const defined = items.filter((item): item is Record<string, unknown> => item !== undefined)
  if (defined.length === 0) return undefined
  if (defined.length === 1 && Object.values(defined[0]).every((value) => value !== undefined)) return defined[0]
  const result: Record<string, unknown> = {}
  for (const item of defined) {
    for (const [key, value] of Object.entries(item)) {
      if (value === undefined) continue
      result[key] = value
    }
  }
  return Object.keys(result).length === 0 ? undefined : result
}

const mergeStringRecords = (
  ...items: ReadonlyArray<Record<string, string> | undefined>
): Record<string, string> | undefined => {
  const defined = items.filter((item): item is Record<string, string> => item !== undefined)
  if (defined.length === 0) return undefined
  if (defined.length === 1) return defined[0]
  const result: Record<string, string> = {}
  for (const item of defined) {
    for (const [key, value] of Object.entries(item)) {
      if (value !== undefined) result[key] = value
    }
  }
  return Object.keys(result).length === 0 ? undefined : result
}

export const ProviderOptions = Schema.Record({ key: Schema.String, value: Schema.Record({ key: Schema.String, value: Schema.Unknown }) })
export type ProviderOptions = Schema.Schema.Type<typeof ProviderOptions>

export const mergeProviderOptions = (
  ...items: ReadonlyArray<ProviderOptions | undefined>
): ProviderOptions | undefined => {
  const result: Record<string, Record<string, unknown>> = {}
  for (const item of items) {
    if (!item) continue
    for (const [provider, options] of Object.entries(item)) {
      const merged = mergeJsonRecords(result[provider], options)
      if (merged) result[provider] = merged
    }
  }
  return Object.keys(result).length === 0 ? undefined : result
}

export class HttpOptions extends Schema.Class<HttpOptions>("LLM.HttpOptions")({
  body: Schema.optional(JsonSchema),
  headers: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  query: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
}) {}

export const makeHttpOptions = (input: HttpOptions | ConstructorParameters<typeof HttpOptions>[0]) =>
  input instanceof HttpOptions ? input : new HttpOptions(input)

export const mergeHttpOptions = (...items: ReadonlyArray<HttpOptions | undefined>): HttpOptions | undefined => {
  const body = mergeJsonRecords(...items.map((item) => item?.body))
  const headers = mergeStringRecords(...items.map((item) => item?.headers))
  const query = mergeStringRecords(...items.map((item) => item?.query))
  if (!body && !headers && !query) return undefined
  return new HttpOptions({ body, headers, query })
}

export class GenerationOptions extends Schema.Class<GenerationOptions>("LLM.GenerationOptions")({
  maxTokens: Schema.optional(Schema.Number),
  temperature: Schema.optional(Schema.Number),
  topP: Schema.optional(Schema.Number),
  topK: Schema.optional(Schema.Number),
  frequencyPenalty: Schema.optional(Schema.Number),
  presencePenalty: Schema.optional(Schema.Number),
  seed: Schema.optional(Schema.Number),
  stop: Schema.optional(Schema.Array(Schema.String)),
}) {}

export const makeGenerationOptions = (input: GenerationOptions | ConstructorParameters<typeof GenerationOptions>[0] = {}) =>
  input instanceof GenerationOptions ? input : new GenerationOptions(input)

export type GenerationOptionsFields = {
  readonly maxTokens?: number
  readonly temperature?: number
  readonly topP?: number
  readonly topK?: number
  readonly frequencyPenalty?: number
  readonly presencePenalty?: number
  readonly seed?: number
  readonly stop?: ReadonlyArray<string>
}

export type GenerationOptionsInput = GenerationOptions | GenerationOptionsFields

const latestGeneration = <Key extends keyof GenerationOptionsFields>(
  items: ReadonlyArray<GenerationOptionsInput | undefined>,
  key: Key,
) => items.findLast((item) => item?.[key] !== undefined)?.[key]

export const mergeGenerationOptions = (...items: ReadonlyArray<GenerationOptionsInput | undefined>) => {
  const result = new GenerationOptions({
    maxTokens: latestGeneration(items, "maxTokens"),
    temperature: latestGeneration(items, "temperature"),
    topP: latestGeneration(items, "topP"),
    topK: latestGeneration(items, "topK"),
    frequencyPenalty: latestGeneration(items, "frequencyPenalty"),
    presencePenalty: latestGeneration(items, "presencePenalty"),
    seed: latestGeneration(items, "seed"),
    stop: latestGeneration(items, "stop"),
  })
  return Object.values(result).some((value) => value !== undefined) ? result : undefined
}

export class ModelLimits extends Schema.Class<ModelLimits>("LLM.ModelLimits")({
  context: Schema.optional(Schema.Number),
  output: Schema.optional(Schema.Number),
}) {}

export const makeModelLimits = (input: ModelLimits | ConstructorParameters<typeof ModelLimits>[0] | undefined) =>
  input instanceof ModelLimits ? input : new ModelLimits(input ?? {})

export class ModelDefaults extends Schema.Class<ModelDefaults>("LLM.ModelDefaults")({
  limits: Schema.optional(ModelLimits),
  generation: Schema.optional(GenerationOptions),
  providerOptions: Schema.optional(ProviderOptions),
  http: Schema.optional(HttpOptions),
}) {}

export type ModelDefaultsInput =
  | ModelDefaults
  | {
      readonly limits?: ModelLimits | ConstructorParameters<typeof ModelLimits>[0]
      readonly generation?: GenerationOptions | ConstructorParameters<typeof GenerationOptions>[0]
      readonly providerOptions?: ProviderOptions
      readonly http?: HttpOptions | ConstructorParameters<typeof HttpOptions>[0]
    }

export const makeModelDefaults = (input: ModelDefaultsInput) => {
  if (input instanceof ModelDefaults) return input
  return new ModelDefaults({
    limits: input.limits === undefined ? undefined : makeModelLimits(input.limits as any),
    generation: input.generation === undefined ? undefined : makeGenerationOptions(input.generation as any),
    providerOptions: input.providerOptions,
    http: input.http === undefined ? undefined : makeHttpOptions(input.http as any),
  })
}

export class Model {
  readonly id: ModelID
  readonly provider: ProviderID
  readonly route: any
  readonly defaults?: ModelDefaults

  constructor(input: Model.ConstructorInput) {
    this.id = input.id
    this.provider = input.provider
    this.route = input.route
    this.defaults = input.defaults
  }

  static make(input: Model.Input) {
    return new Model({
      id: ModelID.make(input.id) as any,
      provider: ProviderID.make(input.provider) as any,
      route: input.route,
      defaults: input.defaults === undefined ? undefined : makeModelDefaults(input.defaults as any),
    })
  }

  static input(model: Model): Model.ConstructorInput {
    return {
      id: model.id,
      provider: model.provider,
      route: model.route,
      defaults: model.defaults,
    }
  }

  static update(model: Model, patch: Partial<Model.Input>) {
    if (Object.keys(patch).length === 0) return model
    return Model.make({
      ...Model.input(model),
      ...patch,
    })
  }
}

export namespace Model {
  export type ConstructorInput = {
    readonly id: ModelID
    readonly provider: ProviderID
    readonly route: any
    readonly defaults?: ModelDefaults
  }

  export type Input = Omit<ConstructorInput, "id" | "provider" | "defaults"> & {
    readonly id: string | ModelID
    readonly provider: string | ProviderID
    readonly defaults?: ModelDefaultsInput
  }
}

export type ModelInput = Model.Input

export const ModelSchema = Schema.declare((value): value is Model => value instanceof Model, { expected: "LLM.Model" })

export class CacheHint extends Schema.Class<CacheHint>("LLM.CacheHint")({
  type: Schema.Literal("ephemeral", "persistent"),
  ttlSeconds: Schema.optional(Schema.Number),
}) {}

export const CachePolicyObject = Schema.Struct({
  tools: Schema.optional(Schema.Boolean),
  system: Schema.optional(Schema.Boolean),
  messages: Schema.optional(
    Schema.Union(
      Schema.Literal("latest-user-message"),
      Schema.Literal("latest-assistant"),
      Schema.Struct({ tail: Schema.Number }),
    ),
  ),
  ttlSeconds: Schema.optional(Schema.Number),
})
export type CachePolicyObject = Schema.Schema.Type<typeof CachePolicyObject>

export const CachePolicy = Schema.Union(Schema.Literal("auto"), Schema.Literal("none"), CachePolicyObject)
export type CachePolicy = Schema.Schema.Type<typeof CachePolicy>