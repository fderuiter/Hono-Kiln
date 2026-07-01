import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const drizzleDir = path.resolve(__dirname, '../drizzle');
const metaDir = path.join(drizzleDir, 'meta');
const journalPath = path.join(metaDir, '_journal.json');

async function squash() {
  let journal;
  try {
    const raw = await fs.readFile(journalPath, 'utf-8');
    journal = JSON.parse(raw);
  } catch (err) {
    console.log('No journal found. Exiting.');
    return;
  }

  if (!journal.entries || journal.entries.length <= 1) {
    console.log('0 or 1 migration found. Nothing to squash.');
    return;
  }

  console.log(`Found ${journal.entries.length} migrations to squash...`);

  // 1. Identify the last snapshot
  const entries = journal.entries;
  const lastEntry = entries[entries.length - 1];
  const lastSnapshotIdxStr = String(lastEntry.idx).padStart(4, '0');
  const lastSnapshotFile = path.join(metaDir, `${lastSnapshotIdxStr}_snapshot.json`);

  let lastSnapshot;
  try {
    const raw = await fs.readFile(lastSnapshotFile, 'utf-8');
    lastSnapshot = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read last snapshot: ${lastSnapshotFile}`);
    process.exit(1);
  }

  // Update prevId to root Drizzle ID
  lastSnapshot.prevId = "00000000-0000-0000-0000-000000000000";

  // 2. Concatenate all SQL files
  const sqlFiles = entries.map((e: any) => path.join(drizzleDir, `${e.tag}.sql`));
  const sqlContents = [];
  for (const file of sqlFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      if (content.trim()) {
        sqlContents.push(content.trim());
      }
    } catch (err) {
      console.warn(`Missing SQL file: ${file}`);
    }
  }

  const squashedSql = sqlContents.join('\n--> statement-breakpoint\n');
  
  // 3. Create new squashed entry
  const newTag = `0000_squashed`;
  const newEntry = {
    idx: 0,
    version: lastEntry.version,
    when: Date.now(),
    tag: newTag,
    breakpoints: true
  };

  journal.entries = [newEntry];

  // 4. Delete old files
  for (const file of sqlFiles) {
    await fs.unlink(file).catch(() => {});
  }
  for (const entry of entries) {
    const idxStr = String(entry.idx).padStart(4, '0');
    await fs.unlink(path.join(metaDir, `${idxStr}_snapshot.json`)).catch(() => {});
  }

  // 5. Write new files
  await fs.writeFile(path.join(drizzleDir, `${newTag}.sql`), squashedSql, 'utf-8');
  await fs.writeFile(path.join(metaDir, `0000_snapshot.json`), JSON.stringify(lastSnapshot, null, 2), 'utf-8');
  await fs.writeFile(journalPath, JSON.stringify(journal, null, 2), 'utf-8');

  console.log('Successfully squashed migrations into a single file.');
}

squash().catch(err => {
  console.error('Squash failed:', err);
  process.exit(1);
});
