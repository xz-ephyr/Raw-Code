import { Context, Effect, Layer, Scope } from "effect"
import Database from "better-sqlite3"

export interface SqliteClient {
  readonly run: (sql: string, params?: ReadonlyArray<unknown>) => Effect.Effect<void>
  readonly query: (sql: string, params?: ReadonlyArray<unknown>) => Effect.Effect<Array<Record<string, unknown>>>
  readonly get: (sql: string, params?: ReadonlyArray<unknown>) => Effect.Effect<Record<string, unknown> | undefined>
  readonly close: Effect.Effect<void>
}

export const SqliteClient = Context.GenericTag<SqliteClient>("@doktor/effect-sqlite-node/SqliteClient")

export interface SqliteClientConfig {
  readonly filename: string
  readonly readonly?: boolean
}

export const make = (config: SqliteClientConfig): Effect.Effect<SqliteClient, never, Scope.Scope> =>
  Effect.gen(function* () {
    const db = new Database(config.filename, { readonly: config.readonly })
    db.pragma("journal_mode = WAL")
    yield* Effect.addFinalizer(() => Effect.sync(() => db.close()))

    const client: SqliteClient = {
      run: (sql, params) =>
        Effect.try({ try: () => { db.prepare(sql).run(...(params ?? [])); return undefined as void }, catch: (e) => e as Error }),
      query: (sql, params) =>
        Effect.try({ try: () => db.prepare(sql).all(...(params ?? [])) as Array<Record<string, unknown>>, catch: (e) => e as Error }),
      get: (sql, params) =>
        Effect.try({ try: () => db.prepare(sql).get(...(params ?? [])) as Record<string, unknown> | undefined, catch: (e) => e as Error }),
      close: Effect.sync(() => db.close()),
    }
    return client
  })

export const layer = (config: SqliteClientConfig): Layer.Layer<SqliteClient, never, Scope.Scope> =>
  Layer.scope(SqliteClient, make(config))