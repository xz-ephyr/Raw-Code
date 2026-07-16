import type { MigrationConfig } from "drizzle-orm/migrator"

export function migrate(db: any, config: MigrationConfig) {
  return import("drizzle-orm/migrator").then(({ readMigrationFiles }) => {
    const migrations = readMigrationFiles(config)
    for (const migration of migrations) {
      db.run(migration.sql)
    }
  })
}