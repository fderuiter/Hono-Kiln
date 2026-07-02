import type { Database } from '../../db'
import { createDocumentsRepository } from './repository'
import type { Documents } from './schema'

export function createDocumentsService(db: Database) {
  const repository = createDocumentsRepository(db)

  return {
    async list(organizationId: number): Promise<Documents[]> {
      return repository.list(organizationId)
    }
  }
}
