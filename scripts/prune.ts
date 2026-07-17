import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function pruneDatabaseDependencies(provider: string, apiDir: string) {
  // 1. Package.json
  const pkgPath = path.join(apiDir, 'package.json');
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
  
  if (provider === 'libsql') {
    delete pkg.dependencies['postgres'];
    delete pkg.dependencies['mysql2'];
  } else if (provider === 'postgresql') {
    delete pkg.dependencies['@libsql/client'];
    delete pkg.dependencies['mysql2'];
  } else if (provider === 'mysql') {
    delete pkg.dependencies['@libsql/client'];
    delete pkg.dependencies['postgres'];
  }
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // 2. db/index.ts
  const dbIndexPath = path.join(apiDir, 'db', 'index.ts');
  let dbIndexContent = '';
  if (provider === 'postgresql') {
    dbIndexContent = `import { drizzle as drizzlePg, type PgDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export function createDatabase(url: string, authToken?: string): Database {
  const client = postgres(url)
  return drizzlePg(client, { schema }) as any
}

export type Database = PgDatabase<any, typeof schema, any>
`;
  } else if (provider === 'mysql') {
    dbIndexContent = `import { drizzle as drizzleMysql, type MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

export function createDatabase(url: string, authToken?: string): Database {
  const pool = mysql.createPool(url)
  return drizzleMysql(pool, { schema, mode: 'default' }) as any
}

export type Database = MySql2Database<any, any, typeof schema, any>
`;
  } else {
    dbIndexContent = `import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

export function createDatabase(url: string, authToken?: string): Database {
  if (url === ':memory:') {
    const client = createClient({ url });
    return drizzleLibsql(client, { schema }) as any;
  }

  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  })
  return drizzleLibsql(client, { schema }) as any
}

export type Database = LibSQLDatabase<typeof schema>
`;
  }
  await fs.writeFile(dbIndexPath, dbIndexContent);

  // 3. utils/db-types.ts
  const dbTypesPath = path.join(apiDir, 'utils', 'db-types.ts');
  let dbTypesContent = '';
  if (provider === 'postgresql') {
    dbTypesContent = `import { integer as pgInt, text as pgText, pgTable, primaryKey as pgPK } from 'drizzle-orm/pg-core'

export const integer: any = pgInt
export const text: any = pgText
export const createTable: any = pgTable
export const primaryKey: any = pgPK
`;
  } else if (provider === 'mysql') {
    dbTypesContent = `import { int as mysqlInt, text as mysqlText, mysqlTable, primaryKey as mysqlPK } from 'drizzle-orm/mysql-core'

export const integer: any = mysqlInt
export const text: any = mysqlText
export const createTable: any = mysqlTable
export const primaryKey: any = mysqlPK
`;
  } else {
    dbTypesContent = `import { integer as sqliteInt, text as sqliteText, sqliteTable, primaryKey as sqlitePK } from 'drizzle-orm/sqlite-core'

export const integer: any = sqliteInt
export const text: any = sqliteText
export const createTable: any = sqliteTable
export const primaryKey: any = sqlitePK
`;
  }
  await fs.writeFile(dbTypesPath, dbTypesContent);

  // 4. utils/factory.ts
  const factoryPath = path.join(apiDir, 'utils', 'factory.ts');
  let factoryContent = await fs.readFile(factoryPath, 'utf8');
  factoryContent = factoryContent.replace(/import\s+\*\s+as\s+config\s+from\s+'\.\.\/\.\.\/\.\.\/kiln\.json';\s*/, "");
  
  if (provider === 'postgresql') {
    factoryContent = factoryContent.replace(/import\s+{\s*sqliteTable,\s*integer\s+as\s+sqliteInt\s*}\s*from\s+'drizzle-orm\/sqlite-core';\s*/, "");
    factoryContent = factoryContent.replace(/import\s+{\s*mysqlTable,\s*serial\s+as\s+mysqlSerial\s*}\s*from\s+'drizzle-orm\/mysql-core';\s*/, "");
    factoryContent = factoryContent.replace(/const\s+provider\s*=\s*config\.provider\s*\|\|\s*'libsql';\s*/, "");
    factoryContent = factoryContent.replace(/const\s+createTableFn:\s*any\s*=\s*provider\s*===\s*'postgresql'\s*\?\s*pgTable\s*:\s*provider\s*===\s*'mysql'\s*\?\s*mysqlTable\s*:\s*sqliteTable;\s*/, "const createTableFn: any = pgTable;\n\n");
    
    const oldBlock = `  let injectedIdColumn;
  if (!hasPrimaryKey) {
    if (provider === 'postgresql') {
      injectedIdColumn = pgSerial('id').primaryKey();
    } else if (provider === 'mysql') {
      injectedIdColumn = mysqlSerial('id').primaryKey();
    } else {
      injectedIdColumn = sqliteInt('id').primaryKey({ autoIncrement: true });
    }
  }`;
    const newBlock = `  let injectedIdColumn;
  if (!hasPrimaryKey) {
    injectedIdColumn = pgSerial('id').primaryKey();
  }`;
    factoryContent = factoryContent.replace(oldBlock, newBlock);
  } else if (provider === 'mysql') {
    factoryContent = factoryContent.replace(/import\s+{\s*sqliteTable,\s*integer\s+as\s+sqliteInt\s*}\s*from\s+'drizzle-orm\/sqlite-core';\s*/, "");
    factoryContent = factoryContent.replace(/import\s+{\s*pgTable,\s*serial\s+as\s+pgSerial\s*}\s*from\s+'drizzle-orm\/pg-core';\s*/, "");
    factoryContent = factoryContent.replace(/const\s+provider\s*=\s*config\.provider\s*\|\|\s*'libsql';\s*/, "");
    factoryContent = factoryContent.replace(/const\s+createTableFn:\s*any\s*=\s*provider\s*===\s*'postgresql'\s*\?\s*pgTable\s*:\s*provider\s*===\s*'mysql'\s*\?\s*mysqlTable\s*:\s*sqliteTable;\s*/, "const createTableFn: any = mysqlTable;\n\n");
    
    const oldBlock = `  let injectedIdColumn;
  if (!hasPrimaryKey) {
    if (provider === 'postgresql') {
      injectedIdColumn = pgSerial('id').primaryKey();
    } else if (provider === 'mysql') {
      injectedIdColumn = mysqlSerial('id').primaryKey();
    } else {
      injectedIdColumn = sqliteInt('id').primaryKey({ autoIncrement: true });
    }
  }`;
    const newBlock = `  let injectedIdColumn;
  if (!hasPrimaryKey) {
    injectedIdColumn = mysqlSerial('id').primaryKey();
  }`;
    factoryContent = factoryContent.replace(oldBlock, newBlock);
  } else {
    factoryContent = factoryContent.replace(/import\s+{\s*pgTable,\s*serial\s+as\s+pgSerial\s*}\s*from\s+'drizzle-orm\/pg-core';\s*/, "");
    factoryContent = factoryContent.replace(/import\s+{\s*mysqlTable,\s*serial\s+as\s+mysqlSerial\s*}\s*from\s+'drizzle-orm\/mysql-core';\s*/, "");
    factoryContent = factoryContent.replace(/const\s+provider\s*=\s*config\.provider\s*\|\|\s*'libsql';\s*/, "");
    factoryContent = factoryContent.replace(/const\s+createTableFn:\s*any\s*=\s*provider\s*===\s*'postgresql'\s*\?\s*pgTable\s*:\s*provider\s*===\s*'mysql'\s*\?\s*mysqlTable\s*:\s*sqliteTable;\s*/, "const createTableFn: any = sqliteTable;\n\n");
    
    const oldBlock = `  let injectedIdColumn;
  if (!hasPrimaryKey) {
    if (provider === 'postgresql') {
      injectedIdColumn = pgSerial('id').primaryKey();
    } else if (provider === 'mysql') {
      injectedIdColumn = mysqlSerial('id').primaryKey();
    } else {
      injectedIdColumn = sqliteInt('id').primaryKey({ autoIncrement: true });
    }
  }`;
    const newBlock = `  let injectedIdColumn;
  if (!hasPrimaryKey) {
    injectedIdColumn = sqliteInt('id').primaryKey({ autoIncrement: true });
  }`;
    factoryContent = factoryContent.replace(oldBlock, newBlock);
  }
  await fs.writeFile(factoryPath, factoryContent);

  // 5. drizzle.config.ts
  const drizzleConfigPath = path.join(apiDir, 'drizzle.config.ts');
  let drizzleConfigContent = await fs.readFile(drizzleConfigPath, 'utf8');
  drizzleConfigContent = drizzleConfigContent.replace("import config from '../../kiln.json'\n", "");
  drizzleConfigContent = drizzleConfigContent.replace("const provider = config.provider || 'libsql'\n", "");
  const targetDialectString = "const dialect = provider === 'postgresql' ? 'postgresql' : provider === 'mysql' ? 'mysql' : 'turso'\n";
  const newDialectString = provider === 'postgresql' 
    ? "const dialect = 'postgresql'\n" 
    : provider === 'mysql' 
      ? "const dialect = 'mysql'\n" 
      : "const dialect = 'turso'\n";
  drizzleConfigContent = drizzleConfigContent.replace(targetDialectString, newDialectString);
  await fs.writeFile(drizzleConfigPath, drizzleConfigContent);

  // 6. preflight.ts
  const preflightPath = path.join(apiDir, 'preflight.ts');
  let preflightContent = await fs.readFile(preflightPath, 'utf8');
  preflightContent = preflightContent.replace("import config from '../../kiln.json'\n", "");
  preflightContent = preflightContent.replace("const provider = config.provider || 'libsql'\n  ", "");
  if (provider === 'libsql') {
    preflightContent = preflightContent.replace("const shouldSkipDocker = provider !== 'libsql' || isRemoteService(dbUrl)", "const shouldSkipDocker = isRemoteService(dbUrl)");
  } else {
    preflightContent = preflightContent.replace("const shouldSkipDocker = provider !== 'libsql' || isRemoteService(dbUrl)", "const shouldSkipDocker = true");
  }
  await fs.writeFile(preflightPath, preflightContent);
}
