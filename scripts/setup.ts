import { execSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { text, confirm, intro, outro, isCancel, cancel, spinner, note, select } from '@clack/prompts';
import { checkDatabaseConnectivity } from '../packages/api/db/check';
import { pruneDatabaseDependencies } from './prune';

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


  const provider = await select({
    message: 'Choose Database Provider',
    options: [
      { value: 'libsql', label: 'LibSQL (SQLite / Turso)' },
      { value: 'postgresql', label: 'PostgreSQL' },
      { value: 'mysql', label: 'MySQL' },
    ],
  });
  if (isCancel(provider)) {
    cancel('Operation cancelled');
    process.exit(1);
  }
  
  await fs.writeFile(path.join(process.cwd(), 'kiln.json'), JSON.stringify({ provider }, null, 2), 'utf8');


  const architecture = await select({
    message: 'Choose Architecture',
    options: [
      { value: 'multi', label: 'Multi-Tenant (SaaS)', hint: 'Includes organizations and documents' },
      { value: 'single', label: 'Single-Tenant', hint: 'Clean slate without multi-tenant boilerplate' },
    ],
  });
  if (isCancel(architecture)) {
    cancel('Operation cancelled');
    process.exit(1);
  }

  let envChoice = 'full';
  let pgMysqlUrl = '';

  if (provider === 'libsql') {
    const envRes = await select({
      message: 'Choose Environment',
      options: [
        { value: 'lite', label: 'Lite (Local)', hint: 'SQLite file, no Docker needed' },
        { value: 'full', label: 'Full (Docker)', hint: 'Production-parity environment' },
        { value: 'cloud', label: 'Cloud (Zero-Touch)', hint: 'Turso, Cloudflare, and GitHub Actions' },
      ],
    });
    if (isCancel(envRes)) {
      cancel('Operation cancelled');
      process.exit(1);
    }
    envChoice = envRes;
  } else {
    const urlRes = await text({
      message: `Enter your ${provider === 'postgresql' ? 'PostgreSQL' : 'MySQL'} connection string:`,
      placeholder: provider === 'postgresql' ? 'postgresql://user:password@localhost:5432/db' : 'mysql://user:password@localhost:3306/db',
    });
    if (isCancel(urlRes)) {
      cancel('Operation cancelled');
      process.exit(1);
    }
    pgMysqlUrl = (urlRes as string).trim();
    envChoice = 'full'; // use full flow but without docker if they have a remote string?
    // Wait, let's just write this to .env temporarily so checkDatabaseConnectivity works!
    await fs.writeFile(path.join(process.cwd(), 'packages/api/.env'), `DATABASE_URL=${pgMysqlUrl}\nNODE_ENV=development\n`, 'utf8');
    
    const s = spinner();
    s.start('Validating connection string...');
    const dbStatus = await checkDatabaseConnectivity();
    if (!dbStatus.success) {
      s.stop('Connection failed.');
      cancel('Could not connect to the database: ' + dbStatus.error);
      process.exit(1);
    }
    s.stop('Connection successful.');
  }

  const isLite = envChoice === 'lite';
  const isCloud = envChoice === 'cloud';


  let cloudflareAccountId = '';
  let cloudflareApiToken = '';

  if (isLite) {
    note('Warning: Certain features like external integrations may be limited in Lite mode.', 'Environment Notice');
  }

  // Verify dependencies
  if (!isLite && !isCloud) {
    try {
      execSync('docker -v', { stdio: 'ignore' });
    } catch {
      cancel('Error: Docker is not installed or not in PATH.');
      process.exit(1);
    }
  }
  try {
    execSync('bun -v', { stdio: 'ignore' });
  } catch {
    cancel('Error: Bun is not installed or not in PATH.');
    process.exit(1);
  }

  if (isCloud) {
    try {
      execSync('turso --version', { stdio: 'ignore' });
    } catch {
      cancel('Error: Turso CLI is not installed. Please install it.');
      process.exit(1);
    }
    try {
      execSync('gh --version', { stdio: 'ignore' });
    } catch {
      cancel('Error: GitHub CLI (gh) is not installed. Please install it.');
      process.exit(1);
    }
    try {
      execSync('bun x wrangler --version', { stdio: 'ignore' });
    } catch {
      cancel('Error: Cloudflare Wrangler CLI is not available. Please ensure bun is properly installed.');
      process.exit(1);
    }
    
    const sAuth = spinner();
    sAuth.start('Checking Turso authorization...');
    try {
      const tursoStatus = execSync('turso auth token', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (!tursoStatus.trim()) {
        throw new Error('Not logged in');
      }
      sAuth.stop('Turso is authorized.');
    } catch {
      sAuth.stop('Turso authorization required.');
      note('You will be redirected to your browser to log in to Turso.', 'Authorization');
      execSync('turso auth login', { stdio: 'inherit' });
    }

    sAuth.start('Checking GitHub authorization...');
    try {
      execSync('gh auth status', { stdio: 'ignore' });
      sAuth.stop('GitHub is authorized.');
    } catch {
      sAuth.stop('GitHub authorization required.');
      note('You will be prompted to log in to GitHub.', 'Authorization');
      execSync('gh auth login -p https -w', { stdio: 'inherit' });
    }

    sAuth.start('Checking Cloudflare authorization...');
    let whoamiOutput = '';
    try {
      whoamiOutput = execSync('bun x wrangler whoami', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (e) {
      // ignore
    }
    
    if (whoamiOutput.includes('You are not authenticated') || whoamiOutput.includes('Please run `wrangler login`') || !whoamiOutput.trim()) {
      sAuth.stop('Cloudflare authorization required.');
      note('You will be redirected to your browser to log in to Cloudflare.', 'Authorization');
      execSync('bun x wrangler login', { stdio: 'inherit' });
      try {
        whoamiOutput = execSync('bun x wrangler whoami', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      } catch (e) {
        // ignore
      }
    } else {
      sAuth.stop('Cloudflare is authorized.');
    }

    const accountMatches = [...whoamiOutput.matchAll(/[a-fA-F0-9]{32}/g)].map(m => m[0]);
    if (accountMatches.length > 0) {
      cloudflareAccountId = accountMatches[0];
    } else {
      const pId = await text({
        message: 'Could not automatically determine Cloudflare Account ID. Please enter it manually:',
      });
      if (isCancel(pId)) {
        cancel('Operation cancelled');
        process.exit(1);
      }
      cloudflareAccountId = (pId as string).trim();
    }

    const pToken = await text({
      message: 'Enter your Cloudflare API Token for CI/CD deployments (requires Edit Workers permissions):',
    });
    if (isCancel(pToken)) {
      cancel('Operation cancelled');
      process.exit(1);
    }
    cloudflareApiToken = (pToken as string).trim();
  }

  let hasGit = true;
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    hasGit = false;
    note('Git is not installed or not in PATH. Git operations will be skipped.', 'Warning');
  }

  const rootDir = process.cwd();

  const startServices = await confirm({
    message: 'Start database and run migrations?',
    initialValue: true,
  });
  if (isCancel(startServices)) {
    cancel('Operation cancelled');
    process.exit(1);
  }

  if (startServices && !isLite && !isCloud) {
    const sDocker = spinner();
    sDocker.start('Starting Docker services...');
    try {
      if (provider === 'libsql') execSync('docker compose up -d', { cwd: rootDir, stdio: 'inherit' });
      sDocker.message('Waiting for service to become healthy...');
      let isReady = false;
      for (let i = 0; i < 30; i++) {
        const dbStatus = await checkDatabaseConnectivity();
        if (dbStatus.success) {
          isReady = true;
          break;
        }
        await new Promise((res) => setTimeout(res, 1000));
      }
      if (!isReady) {
        sDocker.stop('Service failed to become ready.');
        cancel('Database failed to become healthy within 30 seconds.');
        process.exit(1);
      }
      sDocker.stop('Started Docker services.');
    } catch (e) {
      sDocker.stop('Failed to start Docker services.');
      cancel('Could not start Docker services. This might be due to environment limitations.\n' + (e instanceof Error ? e.message : ''));
      process.exit(1);
    }
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
    message: 'Package Scope',
    hint: 'without @',
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

  // Prune unused database dependencies and configurations
  s.start('Pruning unused database dependencies and configurations...');
  try {
    await pruneDatabaseDependencies(provider as string, path.join(rootDir, 'packages/api'));
    s.stop('Pruned unused database dependencies and configurations.');
  } catch (error) {
    s.stop('Failed to prune database dependencies.');
    cancel('Could not prune database dependencies: ' + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }

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

    const registryTsPath = path.join(rootDir, 'packages/api/registry.ts');
    if (await fileExists(registryTsPath)) {
      const registryTs = await fs.readFile(registryTsPath, 'utf8');
      let newRegistryTs = registryTs
        .split('\n')
        .filter(line => !line.includes('rootRoutes') && !line.includes('/modules/root/routes'))
        .join('\n');
      await fs.writeFile(registryTsPath, newRegistryTs, 'utf8');
    }

    const indexTestTsPath = path.join(rootDir, 'packages/api/index.test.ts');
    if (await fileExists(indexTestTsPath)) {
        let indexTestTs = await fs.readFile(indexTestTsPath, 'utf8');
        
        // Remove the exact block by splitting lines
        const lines = indexTestTs.split('\n');
        let inBlock = false;
        const newLines = lines.filter(line => {
          if (line.includes("it('returns welcome payload for /v1/', async () => {")) {
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

    const schemaTsPath = path.join(rootDir, 'packages/api/db/schema.ts');
    if (await fileExists(schemaTsPath)) {
      const schemaTs = await fs.readFile(schemaTsPath, 'utf8');
      let newSchemaTs = schemaTs
        .split('\n')
        .filter(line => !line.includes('/modules/root/schema'))
        .join('\n');
      await fs.writeFile(schemaTsPath, newSchemaTs, 'utf8');
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

  if (isCloud && hasGit) {
    s.start('Pushing to GitHub repository...');
    try {
      const remotes = execSync('git remote -v', { cwd: rootDir, encoding: 'utf-8' });
      if (!remotes.includes('origin')) {
        execSync(`gh repo create ${projectName} --private --source=. --push`, { cwd: rootDir, stdio: 'ignore' });
      } else {
        execSync('git push -u origin main', { cwd: rootDir, stdio: 'ignore' });
      }
      s.stop('Pushed code to GitHub repository.');
    } catch {
      s.stop('Skipped automatic GitHub push.');
      note('Ensure your repository is pushed to GitHub before secrets can be synced.', 'Notice');
    }
  }

  // Write .env if necessary
  const envPath = path.join(rootDir, 'packages/api/.env');
  if (isLite) {
    const envContent = `DATABASE_URL=file:local.db\nDATABASE_AUTH_TOKEN=\nNODE_ENV=development\n`;
    await fs.writeFile(envPath, envContent, 'utf8');
  } else if (isCloud) {
    s.start('Provisioning remote Turso database...');
    const dbName = `${projectName}-db`;
    let dbUrlOutput = '';
    let dbTokenOutput = '';
    try {
      const dbs = execSync('turso db list', { encoding: 'utf-8' });
      if (!dbs.includes(dbName)) {
        execSync(`turso db create ${dbName}`, { stdio: 'ignore' });
      }
      dbUrlOutput = execSync(`turso db show ${dbName} --url`, { encoding: 'utf-8' }).trim();
      dbTokenOutput = execSync(`turso db tokens create ${dbName}`, { encoding: 'utf-8' }).trim();
      s.stop('Provisioned Turso database.');
      
      const envContent = `DATABASE_URL=${dbUrlOutput}\nDATABASE_AUTH_TOKEN=${dbTokenOutput}\nNODE_ENV=production\n`;
      await fs.writeFile(envPath, envContent, 'utf8');
    } catch (e) {
      s.stop('Failed to provision cloud resources.');
      cancel('Cloud provisioning failed. Remediation: Check your network connection and ensure Turso organization limits are not exceeded.\n' + (e instanceof Error ? e.message : ''));
      process.exit(1);
    }
    
    s.start('Syncing secrets to GitHub...');
    try {
      execSync(`gh secret set DATABASE_URL --body "${dbUrlOutput}"`, { stdio: 'ignore' });
      execSync(`gh secret set DATABASE_AUTH_TOKEN --body "${dbTokenOutput}"`, { stdio: 'ignore' });
      if (cloudflareAccountId) {
        execSync(`gh secret set CLOUDFLARE_ACCOUNT_ID --body "${cloudflareAccountId}"`, { stdio: 'ignore' });
      }
      if (cloudflareApiToken) {
        execSync(`gh secret set CLOUDFLARE_API_TOKEN --body "${cloudflareApiToken}"`, { stdio: 'ignore' });
      }
      s.stop('Synced secrets to GitHub Repository Secrets.');
    } catch (e) {
      s.stop('Failed to sync GitHub secrets.');
      cancel('Failed to set GitHub secrets. Remediation: Check if the repository exists on GitHub and gh is authorized.\n' + (e instanceof Error ? e.message : ''));
      process.exit(1);
    }
  }

  // Start DB and Migrations
  if (provider !== 'libsql') {
    await fs.rm(path.join(rootDir, 'packages/api/drizzle'), { recursive: true, force: true }).catch(() => {});
    execSync('bun run --filter @' + packageScope + '/api db:migrate', { cwd: rootDir, stdio: 'ignore' });
  }
  if (startServices) {
    if (isCloud) {
      s.start('Running migrations to remote database...');
      try {
        execSync(`bun run --filter @${packageScope}/api db:squash`, { cwd: rootDir, stdio: 'inherit' });
        execSync(`bun run --filter @${packageScope}/api db:push`, { cwd: rootDir, stdio: 'inherit' });
        execSync(`bun run --filter @${packageScope}/api db:seed`, { cwd: rootDir, stdio: 'inherit' });
        s.stop('Ran migrations to remote database.');
      } catch (e) {
        s.stop('Failed to run migrations.');
        cancel('Could not run DB migrations to remote database.\n' + (e instanceof Error ? e.message : ''));
      }

      s.start('Triggering production deployment workflow...');
      try {
        execSync('gh workflow run deploy-production.yml --ref main', { stdio: 'ignore' });
        s.stop('Triggered production deployment workflow.');
      } catch {
        s.stop('Failed to trigger deployment.');
        note('Workflow could not be triggered. Ensure deploy-production.yml exists on the remote main branch.', 'Warning');
      }
    } else 
    if (isLite) {
      s.start('Running migrations for local SQLite...');
      try {
        execSync(`bun run --filter @${packageScope}/api db:squash`, { cwd: rootDir, stdio: 'inherit' });
        execSync(`bun run --filter @${packageScope}/api db:push`, { cwd: rootDir, stdio: 'inherit' });
        execSync(`bun run --filter @${packageScope}/api db:seed`, { cwd: rootDir, stdio: 'inherit' });
        s.stop('Ran migrations successfully.');
      } catch (e) {
        s.stop('Failed to run migrations.');
        cancel('Could not run DB migrations. This might be due to environment limitations.\n' + (e instanceof Error ? e.message : ''));
      }
    } else {
      s.start('Running migrations...');
      try {
        execSync(`bun run --filter @${packageScope}/api db:squash`, { cwd: rootDir, stdio: 'inherit' });
        execSync(`bun run --filter @${packageScope}/api db:push`, { cwd: rootDir, stdio: 'inherit' });
        execSync(`bun run --filter @${packageScope}/api db:seed`, { cwd: rootDir, stdio: 'inherit' });
        s.stop('Ran migrations.');
      } catch (e) {
        s.stop('Failed to run migrations.');
        cancel('Could not run DB migrations. This might be due to environment limitations.\n' + (e instanceof Error ? e.message : ''));
      }
    }
  }

  outro('✨ Project setup complete! Run `bun run dev` to start developing.');
}

main().catch(console.error);
