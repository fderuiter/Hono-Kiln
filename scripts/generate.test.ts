import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { generateModule, mountModule, run } from './generate'

const tempDirs: string[] = []

async function createRepoFixture() {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'kiln-generate-'))
  tempDirs.push(repoRoot)

  await mkdir(path.join(repoRoot, 'packages', 'api', 'modules'), { recursive: true })
  await writeFile(
    path.join(repoRoot, 'packages', 'api', 'app.ts'),
    `import { Hono } from 'hono'

import { healthRoutes } from './modules/health/routes'
import { rootRoutes } from './modules/root/routes'

const app = new Hono()

app.route('/', rootRoutes)
app.route('/health', healthRoutes)

export default app
`,
  )

  return repoRoot
}

async function createMultilineImportFixture() {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'kiln-generate-'))
  tempDirs.push(repoRoot)

  await mkdir(path.join(repoRoot, 'packages', 'api', 'modules'), { recursive: true })
  await writeFile(
    path.join(repoRoot, 'packages', 'api', 'app.ts'),
    `import {
  Hono,
} from 'hono'

const app = new Hono()

app.route('/health', healthRoutes)

export default app
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
    expect(await readFile(path.join(moduleRoot, 'routes.ts'), 'utf8')).toContain('usersRoutes')
    expect(await readFile(path.join(moduleRoot, 'routes.test.ts'), 'utf8')).toContain(
      "describe('users routes'",
    )

    const appContent = await readFile(path.join(repoRoot, 'packages', 'api', 'app.ts'), 'utf8')
    expect(appContent).toContain("import { usersRoutes } from './modules/users/routes'")
    expect(appContent).toContain("app.route('/users', usersRoutes)")
  })

  it('does not duplicate mounts when called repeatedly', async () => {
    const repoRoot = await createRepoFixture()

    await mountModule('users', 'usersRoutes', repoRoot)
    await mountModule('users', 'usersRoutes', repoRoot)

    const appContent = await readFile(path.join(repoRoot, 'packages', 'api', 'app.ts'), 'utf8')
    expect(
      appContent.match(/import \{ usersRoutes \} from '\.\/modules\/users\/routes'/g)?.length,
    ).toBe(1)
    expect(appContent.match(/app\.route\('\/users', usersRoutes\)/g)?.length).toBe(1)
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

    const appContent = await readFile(path.join(repoRoot, 'packages', 'api', 'app.ts'), 'utf8')
    expect(appContent).toContain(`import {
  Hono,
} from 'hono'
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

    const appContent = await readFile(path.join(repoRoot, 'packages', 'api', 'app.ts'), 'utf8')
    expect(appContent).not.toContain("import { usersRoutes }")
    expect(appContent).not.toContain("app.route('/users'")
  })

  it('fails if removal target does not exist', async () => {
    const repoRoot = await createRepoFixture()
    expect(await run(['remove', 'module', 'ghost'], repoRoot)).toBe(1)
  })

  it('fails if removal route cannot be uniquely identified', async () => {
    const repoRoot = await createRepoFixture()
    await generateModule('users', repoRoot)
    
    // corrupt app.ts by adding another route with same name
    const appPath = path.join(repoRoot, 'packages', 'api', 'app.ts')
    let content = await readFile(appPath, 'utf8')
    content += "\napp.route('/users', somethingElse)"
    await writeFile(appPath, content)

    expect(await run(['remove', 'module', 'users'], repoRoot)).toBe(1)
    
    // files should remain intact due to rollback
    const moduleRoot = path.join(repoRoot, 'packages', 'api', 'modules', 'users')
    let exists = true
    try {
      await stat(moduleRoot)
    } catch {
      exists = false
    }
    expect(exists).toBe(true)
  })

})
