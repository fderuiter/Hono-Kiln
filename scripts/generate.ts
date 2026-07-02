import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { Project, SyntaxKind } from 'ts-morph'
import path from 'node:path'
import { text, confirm, intro, outro, isCancel, cancel } from '@clack/prompts'

type GenerateModuleResult = {
  modulePath: string
  routeName: string
}

const usage = `Usage:
  bun kiln generate module <name> [--worker] [--tenant]
  bun kiln remove module <name>
  bun kiln audit
`

function toIdentifierSegment(input: string) {
  return input
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase())
}

function toCamelCase(input: string) {
  const [first = '', ...rest] = toIdentifierSegment(input)
  return `${first}${rest.map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join('')}`
}

function toPascalCase(input: string) {
  return toIdentifierSegment(input)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('')
}

function normalizeModuleName(name: string) {
  return toIdentifierSegment(name).join('-')
}

async function exists(filePath: string) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

type ModuleMetadata = {
  moduleDescription: string
  primaryRouteSummary: string
  mainSchemaDescription: string
}

function getTemplateFiles(moduleName: string, meta: ModuleMetadata, isWorker: boolean = false, isTenant: boolean = false) {
  const camelName = toCamelCase(moduleName)
  const pascalName = toPascalCase(moduleName)
  const routeName = `${camelName}Routes`
  const schemaName = `${camelName}Schema`
  const repositoryFnName = `create${pascalName}Repository`
  const serviceFnName = `create${pascalName}Service`

  const schemaContent = isTenant 
    ? `import { z } from '@hono/zod-openapi'
import { integer, text } from 'drizzle-orm/sqlite-core'
import { createEntity } from '../../utils/factory'
import { organizations } from '../organizations/schema'

export const entityName = '${moduleName}' as const

export const ${camelName}Entity = createEntity('${moduleName}s', {
  id: {
    db: integer('id').primaryKey({ autoIncrement: true }),
    openapi: { description: '${pascalName} ID', example: 1 }
  },
  organizationId: {
    db: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    openapi: { description: 'Organization ID', example: 1 }
  },
  entity: {
    db: text('entity').notNull(),
    validation: z.string(),
    openapi: { description: '${meta.mainSchemaDescription}', example: '${moduleName}' }
  }
})

export const ${camelName}s = ${camelName}Entity.table
export const ${schemaName} = ${camelName}Entity.selectSchema.openapi('${pascalName}')
export type ${pascalName} = z.infer<typeof ${schemaName}>
`
    : `import { z } from '@hono/zod-openapi'

export const entityName = '${moduleName}' as const

export const ${schemaName} = z.object({
  entity: z.string().openapi({ description: '${meta.mainSchemaDescription}', example: '${moduleName}' }),
}).openapi('${pascalName}')

export type ${pascalName} = z.infer<typeof ${schemaName}>
`

  const repoContent = isTenant
    ? `import type { Database } from '../../db'
import { eq, and } from 'drizzle-orm'
import { ${camelName}s, ${schemaName}, type ${pascalName} } from './schema'
import { entityName } from './schema'

export function ${repositoryFnName}(db: Database) {
  return {
    async list(organizationId: number): Promise<${pascalName}[]> {
      const results = await db.select().from(${camelName}s).where(eq(${camelName}s.organizationId, organizationId))
      return results as ${pascalName}[]
    },
    async find(id: number, organizationId: number): Promise<${pascalName} | undefined> {
      const results = await db.select().from(${camelName}s).where(
        and(eq(${camelName}s.id, id), eq(${camelName}s.organizationId, organizationId))
      ).limit(1)
      return results[0] as ${pascalName} | undefined
    },
    async update(id: number, data: any, organizationId: number) {
      const results = await db.update(${camelName}s).set(data).where(
        and(eq(${camelName}s.id, id), eq(${camelName}s.organizationId, organizationId))
      ).returning()
      return results[0]
    }
  }
}
`
    : `import type { Database } from '../../db'
import { ${schemaName}, type ${pascalName} } from './schema'
import { entityName } from './schema'

export function ${repositoryFnName}(_db: Database) {
  return {
    list(): ${pascalName}[] {
      const rawData = [{ entity: entityName, internalField: 'hidden-value' }]
      return rawData.map(item => ${schemaName}.parse(item))
    },
    update(id: number, data: any) {
      return []
    }
  }
}
`

  const serviceContent = isTenant
    ? `import type { Database } from '../../db'
import { ${repositoryFnName} } from './repository'
import type { ${pascalName} } from './schema'

export function ${serviceFnName}(db: Database) {
  const repository = ${repositoryFnName}(db)

  return {
    async list(organizationId: number): Promise<${pascalName}[]> {
      return repository.list(organizationId)
    }
  }
}
`
    : `import type { Database } from '../../db'
import { ${repositoryFnName} } from './repository'
import type { ${pascalName} } from './schema'

export function ${serviceFnName}(db: Database) {
  const repository = ${repositoryFnName}(db)

  return {
    list(): ${pascalName}[] {
      return repository.list()
    }
  }
}
`

  const routesContent = `import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { HttpStatusCodes, InternalServerErrorSchema, UnauthorizedSchema, UnprocessableEntitySchema, ForbiddenSchema } from '@hono-kiln/shared'

import { ${serviceFnName} } from './service'
import { ${schemaName} } from './schema'
import type { AppEnv } from '../../env'
import { requirePermission } from '../../auth/guard'
${isWorker ? "import { inngest } from '../../inngest/client'\n" : ""}
export const ${routeName} = new OpenAPIHono<AppEnv>()

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['${pascalName}'],
  summary: '${meta.primaryRouteSummary}',
  description: '${meta.moduleDescription}',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(${schemaName}).openapi({ description: 'List of ${pascalName} objects' }),
          }).openapi('${pascalName}ListResponse'),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: UnauthorizedSchema,
        },
      },
    },
    [HttpStatusCodes.FORBIDDEN]: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: ForbiddenSchema,
        },
      },
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      description: 'Validation Error',
      content: {
        'application/json': {
          schema: UnprocessableEntitySchema,
        },
      },
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: InternalServerErrorSchema,
        },
      },
    },
  },
})

${routeName}.openapi(listRoute, requirePermission('${moduleName}:read')(async (c) => {
  const db = c.get('db')
  const service = ${serviceFnName}(db)
${isTenant ? `  const orgId = c.get('organizationId')
  if (!orgId) {
    return c.json({ error: 'Unauthorized' }, HttpStatusCodes.UNAUTHORIZED as any)
  }
  return c.json({ data: await service.list(orgId) }, HttpStatusCodes.OK as any)
` : `
  return c.json(
    {
      data: service.list(),
    },
    HttpStatusCodes.OK as any,
  )
`}}))
${isWorker ? `
const triggerRoute = createRoute({
  method: 'post',
  path: '/trigger',
  tags: ['${pascalName}'],
  summary: 'Trigger background worker',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Worker triggered',
      content: {
        'application/json': { schema: z.object({ message: z.string() }) },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      description: 'Unauthorized',
      content: {
        'application/json': { schema: UnauthorizedSchema },
      },
    },
    [HttpStatusCodes.FORBIDDEN]: {
      description: 'Forbidden',
      content: {
        'application/json': { schema: ForbiddenSchema },
      },
    },
  }
})

${routeName}.openapi(triggerRoute, requirePermission('${moduleName}:write')(async (c) => {
  await inngest.send({ name: '${moduleName}/process', data: {} })
  return c.json({ message: 'Worker triggered successfully' }, HttpStatusCodes.OK as any)
}))
` : ''}`

  const testContent = isTenant
    ? `import { describe, expect, it } from 'bun:test'
import { HttpStatusCodes } from '@hono-kiln/shared'
import { createTestApp } from '@hono-kiln/testing'

import { ${routeName} } from './routes'

describe('${moduleName} routes', () => {
  it('returns unauthorized when no organization context', async () => {
    const app = createTestApp(${routeName})
    const response = await app.request('/')
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
  })
})
`
    : `import { describe, expect, it } from 'bun:test'
import { HttpStatusCodes } from '@hono-kiln/shared'
import { createTestApp } from '@hono-kiln/testing'

import { ${routeName} } from './routes'

describe('${moduleName} routes', () => {
  it('returns scaffolded payload', async () => {
    const app = createTestApp(${routeName})
    const response = await app.request('/')
    expect(response.status).toBe(HttpStatusCodes.OK)
    expect(await response.json()).toEqual({
      data: [{ entity: '${moduleName}' }],
    })
  })
})
`

  const files: Record<string, string> = {
    'schema.ts': schemaContent,
    'repository.ts': repoContent,
    'service.ts': serviceContent,
    'routes.ts': routesContent,
    'routes.test.ts': testContent
  }

  if (isWorker) {
    files['worker.ts'] = `import { inngest } from '../../inngest/client'

export const ${camelName}Worker = inngest.createFunction(
  { id: '${moduleName}-worker', event: '${moduleName}/process' },
  async ({ event, step }) => {
    await step.sleep('wait-a-moment', '1s')
    return { event, body: 'Task completed' }
  }
)
`
  }

  return {
    routeName,
    files
  }
}

function findHonoApp(repoRoot: string) {
  const project = new Project()
  project.addSourceFilesAtPaths(path.join(repoRoot, 'packages/api/**/*.ts'))

  let mainApp: { filePath: string; varName: string; sourceFile: import('ts-morph').SourceFile; instanceEndLine: number } | null = null

  for (const sourceFile of project.getSourceFiles()) {
    const posixPath = sourceFile.getFilePath().replace(/\\/g, '/')
    if (posixPath.includes('/packages/api/modules/')) {
      continue
    }

    const newExprs = sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression)
    for (const newExpr of newExprs) {
      const text = newExpr.getExpression().getText()
      if (text === 'Hono' || text === 'OpenAPIHono') {
        const varDecl = newExpr.getFirstAncestorByKind(SyntaxKind.VariableDeclaration)
        if (varDecl) {
          const varName = varDecl.getName()
          const stmt = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement) || varDecl.getFirstAncestorByKind(SyntaxKind.ExpressionStatement)
          
          if (!mainApp || varName === 'coreApp') {
            mainApp = {
              filePath: sourceFile.getFilePath(),
              varName,
              sourceFile,
              instanceEndLine: stmt ? stmt.getEndLineNumber() : varDecl.getEndLineNumber()
            }
          }
          if (varName === 'coreApp') {
            break
          }
        }
      }
    }
    if (mainApp?.varName === 'coreApp') break
  }

  if (!mainApp) {
    throw new Error("Could not find a valid application instance to register the module against.")
  }

  return mainApp
}

export async function mountModule(moduleName: string, routeName: string, repoRoot: string, isWorker: boolean = false) {
  const { filePath: mountPath, varName, sourceFile } = findHonoApp(repoRoot)

  const targetRoutesDir = path.join(repoRoot, 'packages', 'api', 'modules', moduleName)
  const mountDir = path.dirname(mountPath)
  let relPath = path.relative(mountDir, targetRoutesDir).replace(/\\/g, '/')
  relPath = path.posix.join(relPath, 'routes')
  if (!relPath.startsWith('.')) {
    relPath = './' + relPath
  }

  const importLine = `import { ${routeName} } from '${relPath}'`
  const routeLine = `${varName}.route('/${moduleName}', ${routeName})`

  const appContent = await readFile(mountPath, 'utf8')
  let updatedContent = appContent
  let lines = updatedContent.split('\n')

  if (!updatedContent.includes(importLine)) {
    const importDecls = sourceFile.getImportDeclarations()
    let insertIndex = 0
    if (importDecls.length > 0) {
      insertIndex = importDecls[importDecls.length - 1].getEndLineNumber()
    }
    lines.splice(insertIndex, 0, importLine)
    updatedContent = lines.join('\n')
  }

  if (!updatedContent.includes(routeLine)) {
    lines = updatedContent.split('\n')
    
    sourceFile.replaceWithText(updatedContent)

    let lastRouteCallEndLine = -1
    const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    for (const callExpr of callExprs) {
      const propAccess = callExpr.getExpressionIfKind(SyntaxKind.PropertyAccessExpression)
      if (propAccess && propAccess.getName() === 'route' && propAccess.getExpression().getText() === varName) {
        const stmt = callExpr.getFirstAncestorByKind(SyntaxKind.ExpressionStatement)
        if (stmt) {
          lastRouteCallEndLine = Math.max(lastRouteCallEndLine, stmt.getEndLineNumber())
        }
      }
    }

    if (lastRouteCallEndLine !== -1) {
      lines.splice(lastRouteCallEndLine, 0, routeLine)
    } else {
      let newInstanceEndLine = -1
      const newNewExprs = sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression)
      for (const newExpr of newNewExprs) {
        const text = newExpr.getExpression().getText()
        if (text === 'Hono' || text === 'OpenAPIHono') {
          const varDecl = newExpr.getFirstAncestorByKind(SyntaxKind.VariableDeclaration)
          if (varDecl && varDecl.getName() === varName) {
             const stmt = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement) || varDecl.getFirstAncestorByKind(SyntaxKind.ExpressionStatement)
             newInstanceEndLine = stmt ? stmt.getEndLineNumber() : varDecl.getEndLineNumber()
          }
        }
      }

      if (newInstanceEndLine !== -1) {
        lines.splice(newInstanceEndLine, 0, routeLine)
      } else {
        const exportIndex = lines.findIndex((line) => line.trim().startsWith('export default '))
        lines.splice(exportIndex >= 0 ? exportIndex : lines.length, 0, routeLine)
      }
    }
    updatedContent = lines.join('\n')
  }

  if (updatedContent !== appContent) {
    if (isWorker) {
    const functionsPath = path.join(repoRoot, 'packages', 'api', 'inngest', 'functions.ts')
    let functionsContent = await readFile(functionsPath, 'utf8')
    const workerExportName = `${toCamelCase(moduleName)}Worker`
    const workerImportPath = `../modules/${moduleName}/worker`
    
    // Add import if not exists
    if (!functionsContent.includes(workerImportPath)) {
      functionsContent = `import { ${workerExportName} } from '${workerImportPath}'\n` + functionsContent
    }
    
    // Add to functions array
    functionsContent = functionsContent.replace(
      /export const functions:\s*any\[\]\s*=\s*\[(.*?)\]/s,
      (match, p1) => {
        const funcs = p1.split(',').map(f => f.trim()).filter(Boolean)
        if (!funcs.includes(workerExportName)) {
          funcs.push(workerExportName)
        }
        return `export const functions: any[] = [${funcs.join(', ')}]`
      }
    )
    
    await writeFile(functionsPath, functionsContent)
  }
  await writeFile(mountPath, updatedContent)
  }
}

export function validatePrompt(value: string, genericPlaceholder: string, smartDefault: string): string | undefined {
  const finalValue = value.trim() || smartDefault;
  if (finalValue.toLowerCase() === genericPlaceholder.toLowerCase()) {
    const bell = process.env.AUDIBLE_BELL !== 'false' ? '\x07' : '';
    return `${bell}Input cannot be identical to the generic placeholder ("${genericPlaceholder}"). Please provide a meaningful description.`;
  }
  return undefined;
}

export async function promptWithValidation(
  questionText: string,
  genericPlaceholder: string,
  smartDefault: string
): Promise<string> {
  const answer = await text({
    message: `${questionText} [${smartDefault}]`,
    defaultValue: smartDefault,
    placeholder: smartDefault,
    validate(value) {
      return validatePrompt(value, genericPlaceholder, smartDefault);
    }
  });

  if (isCancel(answer)) {
    cancel('Operation cancelled');
    process.exit(1);
  }

  return (answer as string).trim() || smartDefault;
}

export async function generateModule(moduleInputName: string, repoRoot = process.cwd(), isWorker: boolean = false, isTenant: boolean = false): Promise<GenerateModuleResult> {
  const moduleName = normalizeModuleName(moduleInputName)

  if (!moduleName || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(moduleName)) {
    throw new Error('Module name must start with a letter and contain only letters, numbers, and hyphens')
  }

  const modulePath = path.join(repoRoot, 'packages', 'api', 'modules', moduleName)

  if (await exists(modulePath)) {
    throw new Error(`Module "${moduleName}" already exists`)
  }

  const genericModuleDesc = `The ${moduleName} module`
  const genericRouteSummary = `Respond with a list of ${moduleName}`
  const genericSchemaDesc = `The entity name`

  const defaultModuleDesc = `API endpoints for managing ${moduleName}s.`
  const defaultRouteSummary = `Retrieve a list of ${moduleName}s.`
  const defaultSchemaDesc = `Represents a single ${moduleName} record.`

  let meta: ModuleMetadata = {
    moduleDescription: defaultModuleDesc,
    primaryRouteSummary: defaultRouteSummary,
    mainSchemaDescription: defaultSchemaDesc,
  }

  const isTTY = process.stdout.isTTY && process.stdin.isTTY;
  const isCI = process.env.CI === 'true' || process.env.CI === '1';

  let promptedIsTenant = isTenant;

  if (isTTY && !isCI) {
    intro(`Gathering metadata for the new "${moduleName}" module...`);
    
    meta.moduleDescription = await promptWithValidation(
      'Module Description',
      genericModuleDesc,
      defaultModuleDesc
    );
    meta.primaryRouteSummary = await promptWithValidation(
      'Primary Route Summary',
      genericRouteSummary,
      defaultRouteSummary
    );
    meta.mainSchemaDescription = await promptWithValidation(
      'Main Schema Description',
      genericSchemaDesc,
      defaultSchemaDesc
    );

    if (!isTenant) {
      const tenantAnswer = await confirm({
        message: 'Should this module be multi-tenant (scoped to organizations)?',
        initialValue: true
      });
      if (isCancel(tenantAnswer)) {
        cancel('Operation cancelled');
        process.exit(1);
      }
      promptedIsTenant = tenantAnswer;
    }
    
    outro('Metadata gathered.');
  }

  const { files, routeName } = getTemplateFiles(moduleName, meta, isWorker, promptedIsTenant)
  await mkdir(modulePath, { recursive: true })

  await Promise.all(
    Object.entries(files).map(([fileName, content]) =>
      writeFile(path.join(modulePath, fileName), content),
    ),
  )

  await mountModule(moduleName, routeName, repoRoot, isWorker)

  const { spawnSync } = await import('node:child_process')
  const syncScript = path.resolve(import.meta.dirname, '../packages/api/scripts/sync-schema.ts')
  const apiPath = path.join(repoRoot, 'packages/api')
  if (process.env.NODE_ENV !== 'test') {
    const syncResult = spawnSync('bun', ['run', syncScript, apiPath], { stdio: 'inherit', cwd: repoRoot })
    if (syncResult.status !== 0) {
      throw new Error('Schema sync failed')
    }
  }

  return {
    modulePath,
    routeName,
  }
}

export async function unmountModule(moduleName: string, repoRoot: string) {
  const { filePath: mountPath, sourceFile, varName } = findHonoApp(repoRoot)

  const importDecls = sourceFile.getImportDeclarations().filter(decl => {
    const val = decl.getModuleSpecifierValue()
    return val.endsWith(`modules/${moduleName}/routes`) || val.endsWith(`modules/${moduleName}/routes.ts`)
  })

  if (importDecls.length !== 1) {
    throw new Error(`Could not uniquely identify import statement for module "${moduleName}".`)
  }

  const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
  const toRemove: any[] = []
  for (const callExpr of callExprs) {
    const propAccess = callExpr.getExpressionIfKind(SyntaxKind.PropertyAccessExpression)
    if (propAccess && propAccess.getName() === 'route' && propAccess.getExpression().getText() === varName) {
      const args = callExpr.getArguments()
      if (args.length >= 2 && args[0].getKind() === SyntaxKind.StringLiteral) {
        if (args[0].getText() === `'/${moduleName}'` || args[0].getText() === `"/${moduleName}"`) {
          const stmt = callExpr.getFirstAncestorByKind(SyntaxKind.ExpressionStatement)
          if (stmt) {
            toRemove.push(stmt)
          }
        }
      }
    }
  }

  if (toRemove.length !== 1) {
    throw new Error(`Could not uniquely identify route registration for module "${moduleName}".`)
  }

  const importStart = importDecls[0].getStartLineNumber()
  const importEnd = importDecls[0].getEndLineNumber()
  
  const routeStart = toRemove[0].getStartLineNumber()
  const routeEnd = toRemove[0].getEndLineNumber()

  const rawContent = await readFile(mountPath, 'utf8')
  const lines = rawContent.split('\n')

  const ranges = [
    { start: importStart - 1, end: importEnd - 1 },
    { start: routeStart - 1, end: routeEnd - 1 }
  ].sort((a, b) => b.start - a.start)

  for (const range of ranges) {
    lines.splice(range.start, range.end - range.start + 1)
  }

  await writeFile(mountPath, lines.join('\n'))
}

export async function removeModule(moduleInputName: string, repoRoot = process.cwd()) {
  const moduleName = normalizeModuleName(moduleInputName)

  if (!moduleName || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(moduleName)) {
    throw new Error('Module name must start with a letter and contain only letters, numbers, and hyphens')
  }

  const modulePath = path.join(repoRoot, 'packages', 'api', 'modules', moduleName)

  if (!(await exists(modulePath))) {
    throw new Error(`Module "${moduleName}" does not exist`)
  }

  await unmountModule(moduleName, repoRoot)
  
  await rm(modulePath, { recursive: true, force: true })

  const { spawnSync } = await import('node:child_process')
  const syncScript = path.resolve(import.meta.dirname, '../packages/api/scripts/sync-schema.ts')
  const apiPath = path.join(repoRoot, 'packages/api')
  if (process.env.NODE_ENV !== 'test') {
    const syncResult = spawnSync('bun', ['run', syncScript, apiPath], { stdio: 'inherit', cwd: repoRoot })
    if (syncResult.status !== 0) {
      throw new Error('Schema sync failed')
    }
  }
}

export async function checkDocumentation(repoRoot: string): Promise<boolean> {
  const project = new Project({
    tsConfigFilePath: path.join(repoRoot, 'tsconfig.typedoc.json'),
  })

  let allDocumented = true

  const entryPoints = [
    'packages/api/index.ts',
    'packages/api/app.ts',
    'packages/shared/index.ts',
    'packages/testing/index.ts',
  ]

  for (const entryPoint of entryPoints) {
    const sourceFile = project.getSourceFile(path.join(repoRoot, entryPoint))
    if (!sourceFile) continue

    const exportedDecls = sourceFile.getExportedDeclarations()
    for (const [name, decls] of exportedDecls) {
      for (const decl of decls) {
        // Find if the declaration has a JSDoc comment.
        let hasJSDoc = false

        if ('getJsDocs' in decl && typeof decl.getJsDocs === 'function') {
          const jsdocs = decl.getJsDocs()
          if (jsdocs.length > 0) hasJSDoc = true
        }

        if (!hasJSDoc) {
          let current = decl.getParent()
          while (current) {
            if ('getJsDocs' in current && typeof current.getJsDocs === 'function') {
              const currentJsDocs = (current.getJsDocs as () => any[])()
              if (currentJsDocs.length > 0) {
                hasJSDoc = true
                break
              }
            }
            current = current.getParent()
          }
        }

        if (!hasJSDoc) {
          console.error(`Missing JSDoc documentation for export '${name}' in ${entryPoint}`)
          allDocumented = false
        }
      }
    }
  }

  return allDocumented
}

export async function run(argv: string[], repoRoot = process.cwd()) {
  const isWorker = argv.includes('--worker')
  const isTenant = argv.includes('--tenant')
  argv = argv.filter(a => a !== '--worker' && a !== '--tenant')
  const [action, type, name] = argv

  if (action === 'audit') {
    const { spawnSync } = await import('node:child_process')
    
    const syncScript = path.resolve(import.meta.dirname, '../packages/api/scripts/sync-schema.ts')
    const apiPath = path.join(repoRoot, 'packages/api')
    const syncResult = spawnSync('bun', ['run', syncScript, apiPath], { stdio: 'inherit', cwd: repoRoot })
    if (syncResult.status !== 0) {
      console.error('Audit failed: Schema sync error.')
      return syncResult.status ?? 1
    }

    const knipResult = spawnSync('bun', ['run', 'knip'], { stdio: 'inherit', cwd: repoRoot })
    if (knipResult.status !== 0) {
      return knipResult.status ?? 1
    }
    
    const docsPassed = await checkDocumentation(repoRoot)
    if (!docsPassed) {
      console.error('Audit failed: Missing documentation.')
      return 1
    }

    const typedocResult = spawnSync('bun', ['run', 'docs'], { stdio: 'inherit', cwd: repoRoot })
    if (typedocResult.status !== 0) {
      console.error('Audit failed: typedoc error.')
      return typedocResult.status ?? 1
    }
    outro('Audit passed successfully.')
    return 0
  }

  if (action === 'remove' && type === 'module' && name) {
    try {
      await removeModule(name, repoRoot)
      outro(`Removed module ${name}`)
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      cancel(message)
      return 1
    }
  }

  if (action !== 'generate' || type !== 'module' || !name) {
    cancel(usage)
    return 1
  }

  try {
    const { modulePath } = await generateModule(name, repoRoot, isWorker, isTenant)
    outro(`Generated module at ${modulePath}`)
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    cancel(message)
    return 1
  }
}

if (import.meta.main) {
  process.exit(await run(Bun.argv.slice(2)))
}
