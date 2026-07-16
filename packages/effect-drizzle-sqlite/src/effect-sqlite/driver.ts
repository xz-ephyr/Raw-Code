import { Effect } from "effect"
import { SqliteClient } from "@doktor/effect-sqlite-node"
import type { AnyRelations, EmptyRelations } from "drizzle-orm/relations"

export class EffectSQLiteDatabase<TRelations extends AnyRelations = EmptyRelations> {
  readonly client: SqliteClient
  constructor(client: SqliteClient) {
    this.client = client
  }
}

export const make = Effect.fn("SQLiteDrizzle.make")(function* <TRelations extends AnyRelations = EmptyRelations>() {
  const client = yield* SqliteClient
  return new EffectSQLiteDatabase<TRelations>(client)
})