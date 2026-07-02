import type { Database } from '../../db'
import { createOrganizationsRepository } from './repository'
import type { Organization } from './schema'

export function createOrganizationsService(db: Database) {
  const repository = createOrganizationsRepository(db)

  return {
    async list(): Promise<Organization[]> {
      return repository.list()
    }
  }
}
