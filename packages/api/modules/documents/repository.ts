import type { Database } from '../../db'
import { eq } from 'drizzle-orm'
import { documentss, documentsSchema, type Documents } from './schema'
import { createValidatedRepository } from '../../utils/repository'

export function createDocumentsRepository(db: Database) {
  const getRepo = (organizationId: number) => createValidatedRepository({
    db,
    queryKey: 'documentss',
    table: documentss,
    schema: documentsSchema,
    tenant: {
      column: documentss.organizationId,
      id: organizationId
    }
  })

  return {
    async list(organizationId: number): Promise<Documents[]> {
      const repo = getRepo(organizationId)
      return repo.findMany()
    },
    async find(id: number, organizationId: number): Promise<Documents | undefined> {
      const repo = getRepo(organizationId)
      return repo.findFirst({ where: eq(documentss.id, id) })
    },
    async update(id: number, data: any, organizationId: number) {
      const repo = getRepo(organizationId)
      const results = await repo.update(eq(documentss.id, id), data)
      return results[0]
    }
  }
}
