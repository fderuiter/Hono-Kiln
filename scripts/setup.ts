import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

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
  console.log('🔥 Zero-Config Interactive Bootstrapper 🔥');

  // Verify dependencies
  try {
    execSync('docker -v', { stdio: 'ignore' });
  } catch {
    console.error('Error: Docker is not installed or not in PATH.');
    process.exit(1);
  }
  try {
    execSync('bun -v', { stdio: 'ignore' });
  } catch {
    console.error('Error: Bun is not installed or not in PATH.');
    process.exit(1);
  }

  // Interactive Prompts
  const projectNameInput = await rl.question('Project Name [my-project]: ');
  const projectName = projectNameInput.trim() || 'my-project';

  let packageScopeInput = await rl.question('Package Scope (without @) [my-project]: ');
  let packageScope = packageScopeInput.trim() || 'my-project';
  if (packageScope.startsWith('@')) {
    packageScope = packageScope.slice(1);
  }

  const removeBoilerplateInput = await rl.question('Remove boilerplate example modules? (Y/n): ');
  const removeBoilerplate = removeBoilerplateInput.trim().toLowerCase() !== 'n';

  const purgeGitInput = await rl.question('Purge git history and initialize fresh repository? (Y/n): ');
  const purgeGit = purgeGitInput.trim().toLowerCase() !== 'n';

  const startServicesInput = await rl.question('Start database and run migrations? (Y/n): ');
  const startServices = startServicesInput.trim().toLowerCase() !== 'n';

  rl.close();
  
  const rootDir = process.cwd();

  // Replace Project Name and Scope
  console.log('\n📦 Updating project name and package scope...');
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

  // Run bun install to update workspace symlinks
  console.log('🔄 Running bun install to update workspace symlinks...');
  execSync('bun install', { cwd: rootDir, stdio: 'ignore' });

  // Remove Boilerplate (Root Module)
  if (removeBoilerplate) {
    console.log('🧹 Removing boilerplate modules...');
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
  }

  // Purge Git
  if (purgeGit) {
    console.log('🗑️ Purging git history...');
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
  }

  // Start DB and Migrations
  if (startServices) {
    console.log('🐳 Starting Docker services and running migrations...');
    try {
      execSync('docker compose up -d', { cwd: rootDir, stdio: 'inherit' });
      
      // Wait a bit for db to be ready
      execSync('sleep 2');

      execSync(`bun run --filter @${packageScope}/api db:push`, { cwd: rootDir, stdio: 'inherit' });
      execSync(`bun run --filter @${packageScope}/api db:seed`, { cwd: rootDir, stdio: 'inherit' });
    } catch (e) {
      console.log('Could not run DB migrations or start Docker services. This might be due to environment limitations.', e instanceof Error ? e.message : '');
    }
  }

  console.log('\n✨ Project setup complete! Run `bun run dev` to start developing.');
}

main().catch(console.error);
