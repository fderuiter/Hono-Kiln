import { z } from '@hono/zod-openapi'
import { integer, text } from '../../utils/db-types'
import { createEntity } from '../../utils/factory'
import { organizations } from '../organizations/schema'

export const entityName = 'documents' as const

export const documentsEntity = createEntity('documentss', {
  organizationId: {
    db: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    openapi: { description: 'Organization ID', example: 1 }
  },
  entity: {
    db: text('entity').notNull(),
    validation: z.string(),
    openapi: { description: 'Represents a single documents record.', example: 'documents' }
  }
})

export const documentss = documentsEntity.table
export const documentsSchema = documentsEntity.selectSchema.openapi('Documents')
export type Documents = z.infer<typeof documentsSchema>
