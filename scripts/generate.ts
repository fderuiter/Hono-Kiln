import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { Project } from 'ts-morph'
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

Environment Variables:
  AUDIBLE_BELL   Set to 'false' to silence the auditory alert when matching generic placeholders during generation.
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

async function processTemplate(templateName: string, data: Record<string, any>): Promise<string> {
  const templatePath = path.join(import.meta.dirname, 'templates', templateName);
  let content = await readFile(templatePath, 'utf8');
  
  content = content.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/endif\}\}/g, (match, condition, block) => {
    return data[condition] ? block : '';
  });
  
  content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in data ? data[key] : match;
  });
  
  return content;
}

async function getTemplateFiles(moduleName: string, meta: ModuleMetadata, isWorker: boolean = false, isTenant: boolean = false) {
  const camelName = toCamelCase(moduleName)
  const pascalName = toPascalCase(moduleName)
  const routeName = `${camelName}Routes`
  const schemaName = `${camelName}Schema`
  const repositoryFnName = `create${pascalName}Repository`
  const serviceFnName = `create${pascalName}Service`

  const templateData = {
    moduleName,
    camelName,
    pascalName,
    routeName,
    schemaName,
    repositoryFnName,
    serviceFnName,
    isWorker,
    isTenant,
    notTenant: !isTenant,
    ...meta
  };

  const schemaContent = await processTemplate(isTenant ? 'schema.tenant.ts.template' : 'schema.ts.template', templateData);
  const repoContent = await processTemplate(isTenant ? 'repository.tenant.ts.template' : 'repository.ts.template', templateData);
  const serviceContent = await processTemplate(isTenant ? 'service.tenant.ts.template' : 'service.ts.template', templateData);
  const routesContent = await processTemplate('routes.ts.template', templateData);
  const testContent = await processTemplate('routes.test.ts.template', templateData);

  const files: Record<string, string> = {
    'schema.ts': schemaContent,
    'repository.ts': repoContent,
    'service.ts': serviceContent,
    'routes.ts': routesContent,
    'routes.test.ts': testContent
  }

  if (isWorker) {
    files['worker.ts'] = await processTemplate('worker.ts.template', templateData);
  }

  return {
    routeName,
    files
  }
}

function findRegistry(repoRoot: string) {
  const project = new Project()
  const filePath = path.join(repoRoot, 'packages/api/registry.ts')
  project.addSourceFileAtPath(filePath)
  const sourceFile = project.getSourceFile(filePath)

  if (!sourceFile) {
    throw new Error("Could not find registry.ts")
  }

  return { filePath, sourceFile }
}

export async function mountModule(moduleName: string, routeName: string, repoRoot: string, isWorker: boolean = false) {
  const { filePath: mountPath, sourceFile } = findRegistry(repoRoot)

  const targetRoutesDir = path.join(repoRoot, 'packages', 'api', 'modules', moduleName)
  const mountDir = path.dirname(mountPath)
  let relPath = path.relative(mountDir, targetRoutesDir).replace(/\\/g, '/')
  relPath = path.posix.join(relPath, 'routes')
  if (!relPath.startsWith('.')) {
    relPath = './' + relPath
  }

  const importLine = `import { ${routeName} } from '${relPath}'`
  const routeLine = `.route('/${moduleName}', ${routeName})`

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
    
    const varDecl = sourceFile.getVariableDeclaration('v1App')
    if (varDecl) {
      const init = varDecl.getInitializer()
      if (init) {
        const endLine = init.getEndLineNumber()
        lines.splice(endLine, 0, `  ${routeLine}`)
      }
    }
    updatedContent = lines.join('\n')
  }

  if (updatedContent !== appContent) {
    await writeFile(mountPath, updatedContent)
  }

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
    message: questionText,
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
        message: 'Should this module be multi-tenant?',
        hint: 'scoped to organizations',
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

  const { files, routeName } = await getTemplateFiles(moduleName, meta, isWorker, promptedIsTenant)
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
  const mountPath = path.join(repoRoot, 'packages/api/registry.ts')
  const rawContent = await readFile(mountPath, 'utf8')
  const lines = rawContent.split('\n')

  const importIdx = lines.findIndex(l => l.includes(`modules/${moduleName}/routes`))
  if (importIdx !== -1) {
    lines.splice(importIdx, 1)
  }

  const routeIdx = lines.findIndex(l => l.includes(`.route('/${moduleName}'`))
  if (routeIdx !== -1) {
    lines.splice(routeIdx, 1)
  }

  await writeFile(mountPath, lines.join('\n'))

  const functionsPath = path.join(repoRoot, 'packages/api/inngest/functions.ts')
  if (await exists(functionsPath)) {
    let functionsContent = await readFile(functionsPath, 'utf8')
    const workerExportName = `${toCamelCase(moduleName)}Worker`
    const workerImportPath = `../modules/${moduleName}/worker`

    const importRegex = new RegExp(`import\\s+\\{\\s*${workerExportName}\\s*\\}\\s+from\\s+'${workerImportPath}'\\n?`, 'g')
    functionsContent = functionsContent.replace(importRegex, '')

    functionsContent = functionsContent.replace(
      /export const functions:\s*any\[\]\s*=\s*\[(.*?)\]/s,
      (match, p1) => {
        const funcs = p1.split(',').map(f => f.trim()).filter(f => Boolean(f) && f !== workerExportName)
        return `export const functions: any[] = [${funcs.join(', ')}]`
      }
    )
    await writeFile(functionsPath, functionsContent)
  }
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

    const packages = ['api', 'sdk', 'shared', 'testing']
    
    for (const pkg of packages) {
      const pkgPath = path.join(repoRoot, 'packages', pkg)
      
      const auditResult = spawnSync('bun', ['run', 'audit'], { stdio: 'inherit', cwd: pkgPath })
      if (auditResult.status !== 0) {
        console.error(`Audit failed: knip error in packages/${pkg}.`)
        return auditResult.status ?? 1
      }
      
      const tscResult = spawnSync('bun', ['run', 'typecheck'], { stdio: 'inherit', cwd: pkgPath })
      if (tscResult.status !== 0) {
        console.error(`Audit failed: type validation error in packages/${pkg}.`)
        return tscResult.status ?? 1
      }
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
