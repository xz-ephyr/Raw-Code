import { Schema } from "effect"

export const optional = <S extends Schema.Schema<any, any, any>>(schema: S) =>
  Schema.optional(schema)

export const PositiveInt = Schema.Number.pipe(
  Schema.filter((n) => n > 0 && Number.isInteger(n), { message: () => "Must be a positive integer" }),
)
export const NonNegativeInt = Schema.Number.pipe(
  Schema.filter((n) => n >= 0 && Number.isInteger(n), { message: () => "Must be a non-negative integer" }),
)
