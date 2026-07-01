import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { Project, SyntaxKind } from 'ts-morph'
import path from 'node:path'
import { text, intro, outro, isCancel, cancel } from '@clack/prompts'

type GenerateModuleResult = {
  modulePath: string
  routeName: string
}

const usage = `Usage:
  bun kiln generate module <name>
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

function getTemplateFiles(moduleName: string, meta: ModuleMetadata) {
  const camelName = toCamelCase(moduleName)
  const pascalName = toPascalCase(moduleName)
  const routeName = `${camelName}Routes`
  const schemaName = `${camelName}Schema`
  const repositoryFnName = `create${pascalName}Repository`
  const serviceFnName = `create${pascalName}Service`

  return {
    routeName,
    files: {
      'schema.ts': `import { z } from '@hono/zod-openapi'

export const entityName = '${moduleName}' as const

export const ${schemaName} = z.object({
  entity: z.string().openapi({ description: '${meta.mainSchemaDescription}', example: '${moduleName}' }),
}).openapi('${pascalName}')

export type ${pascalName} = z.infer<typeof ${schemaName}>
`,
      'repository.ts': `import type { Database } from '../../db'
import { ${schemaName}, type ${pascalName} } from './schema'
import { entityName } from './schema'

export function ${repositoryFnName}(_db: Database) {
  return {
    list(): ${pascalName}[] {
      const rawData = [{ entity: entityName, internalField: 'hidden-value' }]
      return rawData.map(item => ${schemaName}.parse(item))
    },
  }
}
`,
      'service.ts': `import type { Database } from '../../db'
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
`,
      'routes.ts': `import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { HttpStatusCodes, InternalServerErrorSchema, UnauthorizedSchema, UnprocessableEntitySchema } from '@hono-kiln/shared'

import { ${serviceFnName} } from './service'
import { ${schemaName} } from './schema'

export const ${routeName} = new OpenAPIHono()

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

${routeName}.openapi(listRoute, (c) => {
  const db = c.get('db')
  const service = ${serviceFnName}(db)

  return c.json(
    {
      data: service.list(),
    },
    HttpStatusCodes.OK,
  )
})
`,
      'routes.test.ts': `import { describe, expect, it } from 'bun:test'
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
`,
    },
  }
}

export async function mountModule(moduleName: string, routeName: string, repoRoot: string) {
  const indexPath = path.join(repoRoot, 'packages', 'api', 'index.ts')
  const appPath = path.join(repoRoot, 'packages', 'api', 'app.ts')
  const mountPath =
    (await exists(indexPath)) && (await readFile(indexPath, 'utf8')).includes('app.route(')
      ? indexPath
      : appPath
  const importLine = `import { ${routeName} } from './modules/${moduleName}/routes'`
  const routeLine = `app.route('/${moduleName}', ${routeName})`

  const appContent = await readFile(mountPath, 'utf8')
  let updatedContent = appContent

  if (!updatedContent.includes(importLine)) {
    const lines = updatedContent.split('\n')
    const importInsertIndex = findImportInsertIndex(lines)
    lines.splice(importInsertIndex, 0, importLine)
    updatedContent = lines.join('\n')
  }

  if (!updatedContent.includes(routeLine)) {
    const lines = updatedContent.split('\n')
    const lastRouteIndex = lines.reduce(
      (index, line, currentIndex) =>
        line.trim().startsWith('app.route(') ? currentIndex : index,
      -1,
    )
    if (lastRouteIndex >= 0) {
      lines.splice(lastRouteIndex + 1, 0, routeLine)
    } else {
      const exportIndex = lines.findIndex((line) => line.trim().startsWith('export default '))
      lines.splice(exportIndex >= 0 ? exportIndex : lines.length, 0, routeLine)
    }
    updatedContent = lines.join('\n')
  }

  if (updatedContent !== appContent) {
    await writeFile(mountPath, updatedContent)
  }
}

function findImportInsertIndex(lines: string[]) {
  let lastImportLine = -1
  let inImportStatement = false

  for (let index = 0; index < lines.length; index++) {
    const trimmedLine = lines[index].trim()

    if (trimmedLine.startsWith('import ')) {
      lastImportLine = index
      inImportStatement = true
    } else if (inImportStatement) {
      if (trimmedLine !== '') {
        lastImportLine = index
      }
    } else if (lastImportLine >= 0 && trimmedLine !== '') {
      break
    }

    if (inImportStatement && isImportStatementTerminator(trimmedLine)) {
      inImportStatement = false
    }
  }

  return lastImportLine + 1
}

function isImportStatementTerminator(trimmedLine: string) {
  return (
    /^import\s+.+\s+from\s+['"].+['"];?$/.test(trimmedLine) ||
    /^}\s+from\s+['"].+['"];?$/.test(trimmedLine) ||
    /^import\s+['"].+['"];?$/.test(trimmedLine)
  )
}


async function promptWithValidation(
  questionText: string,
  genericPlaceholder: string,
  smartDefault: string
): Promise<string> {
  const answer = await text({
    message: `${questionText} [${smartDefault}]`,
    defaultValue: smartDefault,
    placeholder: smartDefault,
    validate(value) {
      const finalValue = value.trim() || smartDefault;
      if (finalValue.toLowerCase() === genericPlaceholder.toLowerCase()) {
        return `\x07Input cannot be identical to the generic placeholder ("${genericPlaceholder}"). Please provide a meaningful description.`;
      }
    }
  });

  if (isCancel(answer)) {
    cancel('Operation cancelled');
    process.exit(1);
  }

  return (answer as string).trim() || smartDefault;
}

export async function generateModule(moduleInputName: string, repoRoot = process.cwd()): Promise<GenerateModuleResult> {
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
    
    outro('Metadata gathered.');
  }

  const { files, routeName } = getTemplateFiles(moduleName, meta)
  await mkdir(modulePath, { recursive: true })

  await Promise.all(
    Object.entries(files).map(([fileName, content]) =>
      writeFile(path.join(modulePath, fileName), content),
    ),
  )

  await mountModule(moduleName, routeName, repoRoot)

  return {
    modulePath,
    routeName,
  }
}


export async function unmountModule(moduleName: string, repoRoot: string) {
  const indexPath = path.join(repoRoot, 'packages', 'api', 'index.ts')
  const appPath = path.join(repoRoot, 'packages', 'api', 'app.ts')
  let mountPath = ''

  if (await exists(indexPath)) {
    const content = await readFile(indexPath, 'utf8')
    if (content.includes('app.route(')) {
      mountPath = indexPath
    }
  }
  if (!mountPath) {
    mountPath = appPath
  }

  const project = new Project()
  const sourceFile = project.addSourceFileAtPath(mountPath)

  const importDecls = sourceFile.getImportDeclarations().filter(decl => {
    return decl.getModuleSpecifierValue() === `./modules/${moduleName}/routes`
  })

  if (importDecls.length !== 1) {
    throw new Error(`Could not uniquely identify import statement for module "${moduleName}".`)
  }

  const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
  const toRemove: any[] = []
  for (const callExpr of callExprs) {
    const propAccess = callExpr.getExpressionIfKind(SyntaxKind.PropertyAccessExpression)
    if (propAccess && propAccess.getName() === 'route') {
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
  const [action, type, name] = argv

  if (action === 'audit') {
    const { spawnSync } = await import('node:child_process')
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
    const { modulePath } = await generateModule(name, repoRoot)
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
