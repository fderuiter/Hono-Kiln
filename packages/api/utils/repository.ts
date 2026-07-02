import type { z } from 'zod';
import { eq, and, type SQL, getTableColumns } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Database } from '../db';

export interface RepositoryConfig<
  TQueryKey extends keyof Database['query'],
  TTable extends SQLiteTable,
  TSchema extends z.ZodTypeAny
> {
  db: Database;
  queryKey: TQueryKey;
  table: TTable;
  schema: TSchema;
  tenant?: {
    column: any; // Drizzle column used for tenant filtering
    id: number | string;
  };
}

export function createValidatedRepository<
  TQueryKey extends keyof Database['query'],
  TTable extends SQLiteTable,
  TSchema extends z.ZodTypeAny
>(config: RepositoryConfig<TQueryKey, TTable, TSchema>) {
  const { db, queryKey, table, schema, tenant } = config;

  // Cast the query API for generic usage since Drizzle's relational queries 
  // are strongly typed but hard to index dynamically
  const queryAPI = (db.query as any)[queryKey];

  function applyTenantFilter(where?: SQL): SQL | undefined {
    if (!tenant) return where;
    const tenantFilter = eq(tenant.column, tenant.id);
    if (!where) return tenantFilter;
    return and(tenantFilter, where);
  }

  return {
    async findFirst(options?: { where?: SQL; with?: any }): Promise<z.infer<TSchema> | undefined> {
      const finalWhere = applyTenantFilter(options?.where);
      const result = await queryAPI.findFirst({
        ...options,
        where: finalWhere,
      });
      if (!result) return undefined;
      return schema.parse(result);
    },

    async findMany(options?: { where?: SQL; with?: any }): Promise<z.infer<TSchema>[]> {
      const finalWhere = applyTenantFilter(options?.where);
      const results = await queryAPI.findMany({
        ...options,
        where: finalWhere,
      });
      return results.map((r: any) => schema.parse(r));
    },

    async insert(data: TTable['$inferInsert']): Promise<z.infer<TSchema>> {
      // Mutations usually expect full objects matching table structure. 
      // If tenant isolation is strict for mutations, we could override the tenant field here,
      // but developers typically supply complete data for inserts.
      const results = await db.insert(table).values(data).returning();
      return schema.parse(results[0]);
    },

    async update(where: SQL, data: Partial<TTable['$inferInsert']>): Promise<z.infer<TSchema>[]> {
      const finalWhere = applyTenantFilter(where);
      if (!finalWhere) throw new Error('Update requires a where clause');
      const results = await db.update(table).set(data).where(finalWhere).returning();
      return results.map((r: any) => schema.parse(r));
    },

    async delete(where: SQL): Promise<z.infer<TSchema>[]> {
      const finalWhere = applyTenantFilter(where);
      if (!finalWhere) throw new Error('Delete requires a where clause');
      const results = await db.delete(table).where(finalWhere).returning();
      return results.map((r: any) => schema.parse(r));
    },
  };
}
