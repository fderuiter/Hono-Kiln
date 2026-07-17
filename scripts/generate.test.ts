import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { generateModule, mountModule, unmountModule, run, validatePrompt } from './generate'

const tempDirs: string[] = []

async function createRepoFixture() {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'kiln-generate-'))
  tempDirs.push(repoRoot)

  await mkdir(path.join(repoRoot, 'packages', 'api', 'modules'), { recursive: true })
  await mkdir(path.join(repoRoot, 'node_modules', '.bin'), { recursive: true })
  await writeFile(path.join(repoRoot, 'node_modules', '.bin', 'knip'), '#!/usr/bin/env node\nconsole.log("mock");\n', { mode: 0o755 })
  await writeFile(
    path.join(repoRoot, 'packages', 'api', 'registry.ts'),
    `import { OpenAPIHono } from '@hono/zod-openapi'

import { healthRoutes } from './modules/health/routes'
import { rootRoutes } from './modules/root/routes'

export const v1App = new OpenAPIHono()
  .route('/', rootRoutes)
  .route('/health', healthRoutes)

export type AppType = typeof v1App
`,
  )

  await writeFile(
    path.join(repoRoot, 'tsconfig.typedoc.json'),
    `{ "compilerOptions": { "strict": true } }`
  )

  return repoRoot
}

async function createMultilineImportFixture() {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'kiln-generate-'))
  tempDirs.push(repoRoot)

  await mkdir(path.join(repoRoot, 'packages', 'api', 'modules'), { recursive: true })
  await writeFile(
    path.join(repoRoot, 'packages', 'api', 'registry.ts'),
    `import {
  OpenAPIHono,
} from '@hono/zod-openapi'

export const v1App = new OpenAPIHono()
  .route('/health', healthRoutes)

export type AppType = typeof v1App
`,
  )

  return repoRoot
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((tempDir) => rm(tempDir, { recursive: true, force: true })),
  )
})

describe('generate module script', () => {
  it('creates scaffold files and mounts the generated route', async () => {
    const repoRoot = await createRepoFixture()

    await generateModule('users', repoRoot)

    const moduleRoot = path.join(repoRoot, 'packages', 'api', 'modules', 'users')
    expect(await readFile(path.join(moduleRoot, 'schema.ts'), 'utf8')).toContain('users')
    expect(await readFile(path.join(moduleRoot, 'repository.ts'), 'utf8')).toContain('createUsersRepository')
    expect(await readFile(path.join(moduleRoot, 'service.ts'), 'utf8')).toContain('createUsersService')
    expect(await readFile(path.join(moduleRoot, 'routes.ts'), 'utf8')).toContain('usersRoutes')
    expect(await readFile(path.join(moduleRoot, 'routes.test.ts'), 'utf8')).toContain(
      "describe('users routes'",
    )

    const appContent = await readFile(path.join(repoRoot, 'packages', 'api', 'registry.ts'), 'utf8')
    expect(appContent).toContain("import { usersRoutes } from './modules/users/routes'")
    expect(appContent).toContain(".route('/users', usersRoutes)")
  })

  it('does not duplicate mounts when called repeatedly', async () => {
    const repoRoot = await createRepoFixture()

    await mountModule('users', 'usersRoutes', repoRoot)
    await mountModule('users', 'usersRoutes', repoRoot)

    const appContent = await readFile(path.join(repoRoot, 'packages', 'api', 'registry.ts'), 'utf8')
    expect(
      appContent.match(/import \{ usersRoutes \} from '\.\/modules\/users\/routes'/g)?.length,
    ).toBe(1)
    expect(appContent.match(/\.route\('\/users', usersRoutes\)/g)?.length).toBe(1)
  })

  it('returns non-zero when cli args are invalid', async () => {
    expect(await run(['generate'], path.join(os.tmpdir(), 'repo'))).toBe(1)
  })

  it('rejects module names that do not start with a letter', async () => {
    const repoRoot = await createRepoFixture()
    await expect(generateModule('123-users', repoRoot)).rejects.toThrow(
      'Module name must start with a letter',
    )
  })

  it('inserts generated import after multiline imports', async () => {
    const repoRoot = await createMultilineImportFixture()

    await mountModule('users', 'usersRoutes', repoRoot)

    const appContent = await readFile(path.join(repoRoot, 'packages', 'api', 'registry.ts'), 'utf8')
    expect(appContent).toContain(`import {
  OpenAPIHono,
} from '@hono/zod-openapi'
import { usersRoutes } from './modules/users/routes'
`)
  })

  it('removes scaffold files and unmounts the generated route', async () => {
    const repoRoot = await createRepoFixture()
    await generateModule('users', repoRoot)
    
    // now we remove it
    await run(['remove', 'module', 'users'], repoRoot)

    const moduleRoot = path.join(repoRoot, 'packages', 'api', 'modules', 'users')
    let exists = true
    try {
      await stat(moduleRoot)
    } catch {
      exists = false
    }
    expect(exists).toBe(false)

    const appContent = await readFile(path.join(repoRoot, 'packages', 'api', 'registry.ts'), 'utf8')
    expect(appContent).not.toContain("import { usersRoutes }")
    expect(appContent).not.toContain(".route('/users'")
  })

  it('fails if removal target does not exist', async () => {
    const repoRoot = await createRepoFixture()
    expect(await run(['remove', 'module', 'ghost'], repoRoot)).toBe(1)
  })

  

})

describe('Robust AST Registration', () => {
  it('mounts and unmounts properly when Hono instance variable is renamed', async () => {
    const repoRoot = await createRepoFixture()
    const appPath = path.join(repoRoot, 'packages', 'api', 'registry.ts')
    let content = await readFile(appPath, 'utf8')
    content = content.replace(/const app = new Hono\(\)/g, 'const apiServer = new Hono()')
    content = content.replace(/\.route/g, 'apiServer.route')
    content = content.replace(/export default app/g, 'export default apiServer')
    await writeFile(appPath, content)

    await mountModule('billing', 'billingRoutes', repoRoot)
    content = await readFile(appPath, 'utf8')
    expect(content).toContain("import { billingRoutes } from './modules/billing/routes'")
    expect(content).toContain(".route('/billing', billingRoutes)")

    await unmountModule('billing', repoRoot)
    content = await readFile(appPath, 'utf8')
    expect(content).not.toContain('billingRoutes')
  })
})

describe('Prompt Validation', () => {
  const originalEnv = process.env.AUDIBLE_BELL

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AUDIBLE_BELL
    } else {
      process.env.AUDIBLE_BELL = originalEnv
    }
  })

  it('returns undefined if input is valid', () => {
    expect(validatePrompt('custom desc', 'generic', 'default')).toBeUndefined()
  })

  it('returns error with auditory bell by default if input matches generic placeholder', () => {
    delete process.env.AUDIBLE_BELL
    const error = validatePrompt('generic', 'generic', 'default')
    expect(error).toContain('\x07')
    expect(error).toContain('Input cannot be identical to the generic placeholder')
  })

  it('returns error without auditory bell if AUDIBLE_BELL is false', () => {
    process.env.AUDIBLE_BELL = 'false'
    const error = validatePrompt('generic', 'generic', 'default')
    expect(error).not.toContain('\x07')
    expect(error).toContain('Input cannot be identical to the generic placeholder')
  })
})


import * as prompts from '@clack/prompts'
import * as childProcess from 'node:child_process'

describe('CLI Output Snapshots', () => {
  function cleanAnsi(str: string) {
    return str
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\/tmp\/kiln-generate-[a-zA-Z0-9]+/g, '/tmp/kiln-generate-<ID>')
  }

  async function captureCliOutput(args: string[], cwd: string, mockedInputs: Record<string, string> = {}) {
    let output = ''
    const origWrite = process.stdout.write
    const origLog = console.log
    const origError = console.error

    const capture = (chunk: string | Uint8Array) => {
      output += chunk.toString()
      return true
    }
    process.stdout.write = capture as any
    console.log = (...a) => { output += a.join(' ') + '\n' }
    console.error = (...a) => { output += a.join(' ') + '\n' }

    const origIsTTY = process.stdout.isTTY
    const origStdinIsTTY = process.stdin.isTTY
    const origCI = process.env.CI
    const origEnvBell = process.env.AUDIBLE_BELL

    // Default to simulating an interactive terminal
    if (mockedInputs.CI === 'true') {
      process.stdout.isTTY = false
      process.stdin.isTTY = false
      process.env.CI = 'true'
    } else {
      process.stdout.isTTY = true
      process.stdin.isTTY = true
      process.env.CI = 'false'
    }
    
    process.env.AUDIBLE_BELL = 'true'

    const introSpy = spyOn(prompts, 'intro').mockImplementation((msg) => {
      process.stdout.write(`[intro] ${msg}\n`)
    })
    const outroSpy = spyOn(prompts, 'outro').mockImplementation((msg) => {
      process.stdout.write(`[outro] ${msg}\n`)
    })
    const textSpy = spyOn(prompts, 'text').mockImplementation(async (opts: any) => {
      process.stdout.write(`[text] ${opts.message}\n`)
      
      const key = Object.keys(mockedInputs).find(k => opts.message.includes(k))
      let input = key ? mockedInputs[key] : (opts.defaultValue ?? '')
      
      if (opts.validate) {
        const err = opts.validate(input)
        if (err) {
          process.stdout.write(`[error] ${err}\n`)
          input = opts.defaultValue ?? ''
        }
      }
      return input
    })
    const confirmSpy = spyOn(prompts, 'confirm').mockImplementation(async (opts: any) => {
      process.stdout.write(`[confirm] ${opts.message}\n`)
      const key = Object.keys(mockedInputs).find(k => opts.message.includes(k))
      return key ? (mockedInputs[key] === 'true') : (opts.initialValue ?? true)
    })
    const cancelSpy = spyOn(prompts, 'cancel').mockImplementation((msg) => {
      process.stdout.write(`[cancel] ${msg}\n`)
    })
    const isCancelSpy = spyOn(prompts, 'isCancel').mockImplementation(() => false)

    const spawnSyncSpy = spyOn(childProcess, 'spawnSync').mockImplementation((cmd, args) => {
      const normalizedArgs = (args as string[]).map(a => a.replace(cwd, '<REPO_ROOT>').replace(process.cwd(), '<APP_ROOT>'))
      console.log(`[spawn] ${cmd} ${normalizedArgs.join(' ')}`)
      return { status: 0 } as any
    })

    try {
      await run(args, cwd)
    } catch (err: any) {
      output += `\n[exception] ${err.message}\n`
    } finally {
      process.stdout.write = origWrite
      console.log = origLog
      console.error = origError
      process.stdout.isTTY = origIsTTY
      process.stdin.isTTY = origStdinIsTTY
      if (origCI === undefined) delete process.env.CI; else process.env.CI = origCI;
      if (origEnvBell === undefined) delete process.env.AUDIBLE_BELL; else process.env.AUDIBLE_BELL = origEnvBell;
      
      introSpy.mockRestore()
      outroSpy.mockRestore()
      textSpy.mockRestore()
      confirmSpy.mockRestore()
      cancelSpy.mockRestore()
      isCancelSpy.mockRestore()
      spawnSyncSpy.mockRestore()
    }

    return cleanAnsi(output)
  }

  it('snapshots output for generate command with interactive prompts', async () => {
    const repoRoot = await createRepoFixture()
    const output = await captureCliOutput(['generate', 'module', 'posts'], repoRoot)
    expect(output).toMatchSnapshot()
    expect(output).toContain('[text] Module Description')
    expect(output).toContain('[text] Primary Route Summary')
    expect(output).toContain('[text] Main Schema Description')
  })

  it('snapshots output for remove command', async () => {
    const repoRoot = await createRepoFixture()
    await run(['generate', 'module', 'posts'], repoRoot)
    const output = await captureCliOutput(['remove', 'module', 'posts'], repoRoot)
    expect(output).toMatchSnapshot()
    expect(output).toContain('[outro] Removed module posts')
  })

  it('snapshots output for audit command', async () => {
    const repoRoot = await createRepoFixture()
    const output = await captureCliOutput(['audit'], repoRoot)
    expect(output).toMatchSnapshot()
    expect(output).toContain('[spawn] bun run <APP_ROOT>/packages/api/scripts/sync-schema.ts <REPO_ROOT>/packages/api')
  })

  it('fails validation when input matches generic placeholder and produces auditory bell', async () => {
    const repoRoot = await createRepoFixture()
    // Providing 'The posts module' which matches the generic placeholder exactly
    const output = await captureCliOutput(['generate', 'module', 'posts'], repoRoot, {
      'Module Description': 'The posts module'
    })
    expect(output).toContain('\x07')
    expect(output).toContain('[error]')
    expect(output).toMatchSnapshot()
  })

  it('bypasses interactive prompts in CI environment', async () => {
    const repoRoot = await createRepoFixture()
    const output = await captureCliOutput(['generate', 'module', 'posts'], repoRoot, { CI: 'true' })
    expect(output).not.toContain('[text]')
    expect(output).not.toContain('[intro]')
    expect(output).toMatchSnapshot()
  })
})
