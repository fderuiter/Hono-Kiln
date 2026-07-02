import type { Database } from '../../db'
import { eq, and } from 'drizzle-orm'
import { documentss, documentsSchema, type Documents } from './schema'
import { entityName } from './schema'

export function createDocumentsRepository(db: Database) {
  return {
    async list(organizationId: number): Promise<Documents[]> {
      const results = await db.select().from(documentss).where(eq(documentss.organizationId, organizationId))
      return results as Documents[]
    },
    async find(id: number, organizationId: number): Promise<Documents | undefined> {
      const results = await db.select().from(documentss).where(
        and(eq(documentss.id, id), eq(documentss.organizationId, organizationId))
      ).limit(1)
      return results[0] as Documents | undefined
    },
    async update(id: number, data: any, organizationId: number) {
      const results = await db.update(documentss).set(data).where(
        and(eq(documentss.id, id), eq(documentss.organizationId, organizationId))
      ).returning()
      return results[0]
    }
  }
}
