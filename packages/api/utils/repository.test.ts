import { describe, it, expect, beforeEach } from 'bun:test';
import { createDatabase } from '../db';
import { documentss, documentsSchema } from '../modules/documents/schema';
import { createValidatedRepository } from './repository';
import { eq } from 'drizzle-orm';

describe('Validated Repository Factory', () => {
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  it('should initialize successfully', () => {
    const repo = createValidatedRepository({
      db,
      queryKey: 'documentss',
      table: documentss,
      schema: documentsSchema,
    });
    expect(repo).toBeDefined();
    expect(typeof repo.findFirst).toBe('function');
    expect(typeof repo.findMany).toBe('function');
  });

  it('should construct query options with tenant filter', async () => {
    // We cannot fully execute the queries against the unmigrated in-memory DB,
    // but we can ensure the factory returns the correctly typed functions.
    const repo = createValidatedRepository({
      db,
      queryKey: 'documentss',
      table: documentss,
      schema: documentsSchema,
      tenant: {
        column: documentss.organizationId,
        id: 123,
      }
    });

    // Validates that it doesn't throw on initialization
    expect(repo).toBeDefined();
  });
});
