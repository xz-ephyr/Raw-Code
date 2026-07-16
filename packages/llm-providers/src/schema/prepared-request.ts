import { Schema } from "effect"
import { RouteID, ProtocolID } from "./ids"
import { ModelSchema } from "./options"

export class PreparedRequest extends Schema.Class<PreparedRequest>("LLM.PreparedRequest")({
  id: Schema.String,
  route: RouteID,
  protocol: ProtocolID,
  model: ModelSchema,
  body: Schema.Unknown,
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
}) {}

export type PreparedRequestOf<Body> = Omit<PreparedRequest, "body"> & {
  readonly body: Body
}
