import { readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getTableName } from 'drizzle-orm'

export async function syncSchema(apiDir: string) {
  const modulesDir = join(apiDir, 'modules')
  
  const dirents = await readdir(modulesDir, { withFileTypes: true })
  const moduleNames = dirents.filter(d => d.isDirectory()).map(d => d.name).sort()
  
  const tableNames = new Map<string, string>()
  const exportNames = new Map<string, string>()

  let hasError = false

  for (const mod of moduleNames) {
    const schemaPath = join(modulesDir, mod, 'schema.ts')
    let fileExists = false
    try {
      const s = await stat(schemaPath)
      fileExists = s.isFile()
    } catch {
      continue
    }

    if (fileExists) {
      const schemaMod = await import(schemaPath)
      for (const [exportName, value] of Object.entries(schemaMod)) {
        let dbTableName: string | null = null
        try {
          dbTableName = getTableName(value as any)
        } catch {
          // Not a table
        }

        if (dbTableName) {
          if (tableNames.has(dbTableName)) {
            console.error(`Build Error: Duplicate table name '${dbTableName}' found in modules '${tableNames.get(dbTableName)}' and '${mod}'.`)
            hasError = true
          } else {
            tableNames.set(dbTableName, mod)
          }

          if (exportNames.has(exportName)) {
            console.error(`Build Error: Duplicate export name '${exportName}' found in modules '${exportNames.get(exportName)}' and '${mod}'.`)
            hasError = true
          } else {
            exportNames.set(exportName, mod)
          }
        }
      }
    }
  }

  let exportsContent = '// This file is auto-generated. Do not edit manually.\n'
  for (const mod of moduleNames) {
    const schemaPath = join(modulesDir, mod, 'schema.ts')
    try {
      const s = await stat(schemaPath)
      if (s.isFile()) {
        exportsContent += `export * from '../modules/${mod}/schema'\n`
      }
    } catch {
      continue
    }
  }

  await writeFile(join(apiDir, 'db', 'schema.ts'), exportsContent)

  if (hasError) {
    throw new Error('Duplicate table names found across schemas.')
  }
}

if (import.meta.main) {
  const apiDir = join(import.meta.dir, '..')
  syncSchema(apiDir).then(() => {
    console.log('Schema sync complete.')
  }).catch(e => {
    console.error(e.message)
    process.exit(1)
  })
}
