import { test, expect } from 'bun:test'
import { integer, text } from 'drizzle-orm/sqlite-core'
import { createEntity } from './factory'
import { z } from '@hono/zod-openapi'
import { getOpenApiMetadata } from '@asteasolutions/zod-to-openapi'

test('createEntity', () => {
  const userEntity = createEntity('users', {
    id: {
      db: integer('id').primaryKey({ autoIncrement: true }),
      openapi: { description: 'User ID', example: 1 }
    },
    email: {
      db: text('email').notNull(),
      validation: z.string().email(),
      openapi: { description: 'User email', example: 'test@example.com' }
    }
  });

  expect(userEntity.table).toBeDefined();
  
  const parsed = userEntity.selectSchema.parse({ id: 1, email: 'test@example.com' });
  expect(parsed.email).toBe('test@example.com');
  
  const openapiMeta = getOpenApiMetadata(userEntity.selectSchema.shape.email);
  expect(openapiMeta).toBeDefined();
  expect(openapiMeta?.description).toBe('User email');
});

test('createEntity without validation', () => {
  const userEntity = createEntity('users2', {
    id: {
      db: integer('id').primaryKey({ autoIncrement: true }),
      openapi: { description: 'User ID', example: 1 }
    }
  });

  const openapiMeta = getOpenApiMetadata(userEntity.selectSchema.shape.id);
  expect(openapiMeta?.description).toBe('User ID');
});
