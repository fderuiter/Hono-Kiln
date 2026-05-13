import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

type GenerateModuleResult = {
  modulePath: string
  routeName: string
}

const usage = 'Usage: bun kiln generate module <name>'

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

function getTemplateFiles(moduleName: string) {
  const camelName = toCamelCase(moduleName)
  const pascalName = toPascalCase(moduleName)
  const routeName = `${camelName}Routes`
  const schemaName = `${camelName}Schema`
  const repositoryFnName = `list${pascalName}`

  return {
    routeName,
    files: {
      'schema.ts': `import { z } from 'zod'

export const entityName = '${moduleName}' as const

export const ${schemaName} = z.object({
  entity: z.string(),
})

export type ${pascalName} = z.infer<typeof ${schemaName}>
`,
      'repository.ts': `import type { ${pascalName} } from './schema'
import { entityName } from './schema'

export function ${repositoryFnName}(): ${pascalName}[] {
  return [{ entity: entityName }]
}
`,
      'routes.ts': `import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import { ${repositoryFnName} } from './repository'
import { ${schemaName} } from './schema'

export const ${routeName} = new OpenAPIHono()

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['${pascalName}'],
  responses: {
    200: {
      description: 'Respond with a list of ${moduleName}',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(${schemaName}),
          }),
        },
      },
    },
  },
})

${routeName}.openapi(listRoute, (c) => {
  return c.json(
    {
      data: ${repositoryFnName}(),
    },
    200,
  )
})
`,
      'routes.test.ts': `import { describe, expect, it } from 'bun:test'

import { ${routeName} } from './routes'

describe('${moduleName} routes', () => {
  it('returns scaffolded payload', async () => {
    const response = await ${routeName}.request('/')
    expect(response.status).toBe(200)
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

export async function generateModule(moduleInputName: string, repoRoot = process.cwd()): Promise<GenerateModuleResult> {
  const moduleName = normalizeModuleName(moduleInputName)

  if (!moduleName || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(moduleName)) {
    throw new Error('Module name must start with a letter and contain only letters, numbers, and hyphens')
  }

  const modulePath = path.join(repoRoot, 'packages', 'api', 'modules', moduleName)

  if (await exists(modulePath)) {
    throw new Error(`Module "${moduleName}" already exists`)
  }

  const { files, routeName } = getTemplateFiles(moduleName)
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

export async function run(argv: string[], repoRoot = process.cwd()) {
  const [action, type, name] = argv

  if (action !== 'generate' || type !== 'module' || !name) {
    console.error(usage)
    return 1
  }

  try {
    const { modulePath } = await generateModule(name, repoRoot)
    console.log(`Generated module at ${modulePath}`)
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(message)
    return 1
  }
}

if (import.meta.main) {
  process.exit(await run(Bun.argv.slice(2)))
}
