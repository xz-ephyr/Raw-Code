import type { SqliteClient } from "@doktor/effect-sqlite-node"

export interface EffectSQLiteQueryEffectHKT {
  readonly _A: never
  readonly _E: Error
  readonly _R: never
}

export type EffectSQLiteRunResult = readonly never[]

export class EffectSQLiteSession {
  constructor(readonly client: SqliteClient) {}
}
