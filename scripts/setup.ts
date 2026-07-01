import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { text, confirm, intro, outro, isCancel, cancel, spinner, note } from '@clack/prompts';

async function fileExists(filePath: string) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getFiles(dir: string, fileList: string[] = []) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'bun.lock') continue;
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await getFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function main() {
  intro('🔥 Zero-Config Interactive Bootstrapper 🔥');

  // Verify dependencies
  try {
    execSync('docker -v', { stdio: 'ignore' });
  } catch {
    cancel('Error: Docker is not installed or not in PATH.');
    process.exit(1);
  }
  try {
    execSync('bun -v', { stdio: 'ignore' });
  } catch {
    cancel('Error: Bun is not installed or not in PATH.');
    process.exit(1);
  }

  let hasGit = true;
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    hasGit = false;
    note('Git is not installed or not in PATH. Git operations will be skipped.', 'Warning');
  }

  // Interactive Prompts
  const pName = await text({
    message: 'Project Name',
    placeholder: 'my-project',
    defaultValue: 'my-project',
  });
  if (isCancel(pName)) {
    cancel('Operation cancelled');
    process.exit(1);
  }
  const projectName = (pName as string).trim() || 'my-project';

  const pScope = await text({
    message: 'Package Scope (without @)',
    placeholder: 'my-project',
    defaultValue: 'my-project',
  });
  if (isCancel(pScope)) {
    cancel('Operation cancelled');
    process.exit(1);
  }
  let packageScope = (pScope as string).trim() || 'my-project';
  if (packageScope.startsWith('@')) {
    packageScope = packageScope.slice(1);
  }

  note('Impact: Removes the example root module and its references to provide a clean slate.', 'Help');
  const removeBoilerplate = await confirm({
    message: 'Remove boilerplate example modules?',
    initialValue: true,
  });
  if (isCancel(removeBoilerplate)) {
    cancel('Operation cancelled');
    process.exit(1);
  }

  let purgeGit = false;
  if (hasGit) {
    note('Impact: Deletes the existing .git directory and initializes a fresh repository with a new initial commit.', 'Help');
    const pg = await confirm({
      message: 'Purge git history and initialize fresh repository?',
      initialValue: true,
    });
    if (isCancel(pg)) {
      cancel('Operation cancelled');
      process.exit(1);
    }
    purgeGit = pg as boolean;
  }

  const startServices = await confirm({
    message: 'Start database and run migrations?',
    initialValue: true,
  });
  if (isCancel(startServices)) {
    cancel('Operation cancelled');
    process.exit(1);
  }
  
  const rootDir = process.cwd();

  // Replace Project Name and Scope
  const s = spinner();
  s.start('Updating project name and package scope...');
  const files = await getFiles(rootDir);
  for (const file of files) {
    if (file === __filename || file.endsWith('scripts/setup.ts') || file.endsWith('scripts/bootstrap.ts')) continue;
    
    const content = await fs.readFile(file, 'utf8');
    let newContent = content.replace(/@hono-kiln/g, `@${packageScope}`);
    newContent = newContent.replace(/hono-kiln/g, projectName);
    newContent = newContent.replace(/Hono Kiln/g, projectName);
    
    if (content !== newContent) {
      await fs.writeFile(file, newContent, 'utf8');
    }
  }
  s.stop('Updated project name and package scope.');

  // Run bun install to update workspace symlinks
  s.start('Running bun install to update workspace symlinks...');
  execSync('bun install', { cwd: rootDir, stdio: 'ignore' });
  s.stop('Ran bun install.');

  // Remove Boilerplate (Root Module)
  if (removeBoilerplate) {
    s.start('Removing boilerplate modules...');
    const rootModulePath = path.join(rootDir, 'packages/api/modules/root');
    if (await fileExists(rootModulePath)) {
      await fs.rm(rootModulePath, { recursive: true, force: true });
    }

    const appTsPath = path.join(rootDir, 'packages/api/app.ts');
    if (await fileExists(appTsPath)) {
      const appTs = await fs.readFile(appTsPath, 'utf8');
      let newAppTs = appTs
        .split('\n')
        .filter(line => !line.includes('rootRoutes') && !line.includes('/modules/root/routes'))
        .join('\n');
      await fs.writeFile(appTsPath, newAppTs, 'utf8');
    }

    const indexTestTsPath = path.join(rootDir, 'packages/api/index.test.ts');
    if (await fileExists(indexTestTsPath)) {
        let indexTestTs = await fs.readFile(indexTestTsPath, 'utf8');
        
        // Remove the exact block by splitting lines
        const lines = indexTestTs.split('\n');
        let inBlock = false;
        const newLines = lines.filter(line => {
          if (line.includes("it('returns welcome payload for /', async () => {")) {
            inBlock = true;
            return false;
          }
          if (inBlock && line.trim() === '})') {
            inBlock = false;
            return false;
          }
          if (inBlock) {
            return false;
          }
          return true;
        });

        let newContent = newLines.join('\n').replace(/\n{3,}/g, '\n\n');
        await fs.writeFile(indexTestTsPath, newContent, 'utf8');
    }
    s.stop('Removed boilerplate modules.');
  }

  // Purge Git
  if (purgeGit) {
    s.start('Purging git history...');
    const gitDir = path.join(rootDir, '.git');
    if (await fileExists(gitDir)) {
      await fs.rm(gitDir, { recursive: true, force: true });
      execSync('git init', { cwd: rootDir, stdio: 'ignore' });
      execSync('git add .', { cwd: rootDir, stdio: 'ignore' });
      try {
        execSync('git commit -m "Initial commit"', { cwd: rootDir, stdio: 'ignore' });
      } catch {
        execSync('git config user.email "bot@example.com" && git config user.name "Bot" && git commit -m "Initial commit"', { cwd: rootDir, stdio: 'ignore' });
      }
    }
    s.stop('Purged git history.');
  }

  // Start DB and Migrations
  if (startServices) {
    s.start('Starting Docker services and running migrations...');
    try {
      execSync('docker compose up -d', { cwd: rootDir, stdio: 'inherit' });
      
      // Wait a bit for db to be ready
      execSync('sleep 2');

      execSync(`bun run --filter @${packageScope}/api db:push`, { cwd: rootDir, stdio: 'inherit' });
      execSync(`bun run --filter @${packageScope}/api db:seed`, { cwd: rootDir, stdio: 'inherit' });
      s.stop('Started Docker services and ran migrations.');
    } catch (e) {
      s.stop('Failed to start Docker services or run migrations.');
      cancel('Could not run DB migrations or start Docker services. This might be due to environment limitations.\n' + (e instanceof Error ? e.message : ''));
    }
  }

  outro('✨ Project setup complete! Run `bun run dev` to start developing.');
}

main().catch(console.error);
