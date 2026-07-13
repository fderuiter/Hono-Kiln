import { sqliteTable } from 'drizzle-orm/sqlite-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { mysqlTable } from 'drizzle-orm/mysql-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from '@hono/zod-openapi';

import * as config from '../../../kiln.json';

const provider = config.provider || 'libsql';
const createTableFn: any = provider === 'postgresql' ? pgTable : provider === 'mysql' ? mysqlTable : sqliteTable;

type FieldDefinition<TBuilder = any> = {
  db: TBuilder;
  validation?: z.ZodTypeAny;
  openapi?: {
    description?: string;
    example?: any;
    [key: string]: any;
  };
};

export type EntityConfig = Record<string, FieldDefinition>;

export function createEntity<T extends string, C extends EntityConfig>(
  tableName: T,
  config: C
) {
  const columns = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value.db])
  ) as any;

  const table = createTableFn(tableName, columns);

  const selectRefinements: Record<string, any> = {};
  const insertRefinements: Record<string, any> = {};

  for (const [key, value] of Object.entries(config)) {
    if (value.validation || value.openapi) {
      const refine = (schemaBase: z.ZodTypeAny) => {
        let finalSchema = value.validation ?? schemaBase;
        if (value.openapi) {
          finalSchema = finalSchema.openapi(value.openapi);
        }
        return finalSchema;
      };

      selectRefinements[key] = refine;
      insertRefinements[key] = refine;
    }
  }

  const selectSchema = createSelectSchema(table as any, selectRefinements as any);
  const insertSchema = createInsertSchema(table as any, insertRefinements as any);

  return {
    table,
    selectSchema,
    insertSchema,
  };
}
