import { sql } from 'drizzle-orm'
import type { Database } from '../../db'

export function createHealthRepository(db: Database) {
  return {
    async checkDatabase(): Promise<boolean> {
      try {
        await db.run(sql`SELECT 1`)
        return true
      } catch {
        return false
      }
    },
  }
}

export type HealthRepository = ReturnType<typeof createHealthRepository>
