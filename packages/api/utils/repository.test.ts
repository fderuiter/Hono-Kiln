import { describe, it, expect, beforeEach } from 'bun:test';
import { createDatabase } from '../db';
import { createValidatedRepository } from './repository';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createSelectSchema } from 'drizzle-zod';

const mockTable = sqliteTable('mock_table', {
  id: integer('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  name: text('name').notNull(),
});
const mockSchema = createSelectSchema(mockTable);

describe('Validated Repository Factory', () => {
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  it('should initialize successfully', () => {
    const repo = createValidatedRepository({
      db,
      queryKey: 'mockTable' as any,
      table: mockTable,
      schema: mockSchema,
    });
    expect(repo).toBeDefined();
    expect(typeof repo.findFirst).toBe('function');
    expect(typeof repo.findMany).toBe('function');
  });

  it('should construct query options with tenant filter', async () => {
    const repo = createValidatedRepository({
      db,
      queryKey: 'mockTable' as any,
      table: mockTable,
      schema: mockSchema,
      tenant: {
        column: mockTable.tenantId,
        id: 123,
      }
    });

    expect(repo).toBeDefined();
  });
});
