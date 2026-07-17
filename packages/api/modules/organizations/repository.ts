import type { Database } from '../../db'
import { organizations, OrganizationSchema, type Organization } from './schema'
import { createValidatedRepository } from '../../utils/repository'

export function createOrganizationsRepository(db: Database) {
  const repo = createValidatedRepository({
    db,
    queryKey: 'organizations',
    table: organizations,
    schema: OrganizationSchema
  })

  return {
    async list(): Promise<Organization[]> {
      return repo.findMany()
    },
  }
}
