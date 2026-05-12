import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import dotenv from 'dotenv';

const CONFIRM_PULL = 'PULL_HOSTED_TO_LOCAL';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

dotenv.config({ path: path.resolve(process.cwd(), '.env.sync') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const command = process.argv[2];
const args = new Set(process.argv.slice(3));

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const backupDir = () => path.resolve(process.cwd(), process.env.DB_BACKUP_DIR || 'backups');

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Copy .env.sync.example to .env.sync and fill it locally.`);
  }
  return value;
};

const parseDatabaseUrl = (value, name) => {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid Postgres connection URL.`);
  }
};

const assertPostgresUrl = (url, name) => {
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
    throw new Error(`${name} must start with postgresql:// or postgres://.`);
  }
};

const assertTool = (name) => {
  const result = spawnSync(name, ['--version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error(`${name} is required. Install PostgreSQL CLI tools first.`);
  }
};

const sameDatabase = (a, b) =>
  a.hostname === b.hostname &&
  a.port === b.port &&
  a.pathname === b.pathname &&
  a.username === b.username;

const assertLocalTarget = (url) => {
  if (args.has('--allow-non-local-target')) return;
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error('Refusing to restore into a non-local database. Pass --allow-non-local-target only if you are absolutely sure.');
  }
};

const run = (bin, binArgs, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(bin, binArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'inherit', 'inherit'],
      ...options
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${bin} exited with code ${code}`));
      }
    });
  });

const backupDatabase = async ({ url, label }) => {
  assertTool('pg_dump');
  const dir = backupDir();
  mkdirSync(dir, { recursive: true });

  const file = path.join(dir, `${timestamp()}-${label}.dump`);
  console.log(`Creating ${label} backup at ${path.relative(process.cwd(), file)}`);
  await run('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--file', file, url]);
  return file;
};

const restoreLocal = async ({ localUrl, dumpFile }) => {
  assertTool('pg_restore');
  console.log('Restoring hosted backup into local database...');
  await run('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--dbname', localUrl, dumpFile]);
};

const confirmPull = async () => {
  const inline = process.argv.includes('--confirm') ? process.argv[process.argv.indexOf('--confirm') + 1] : null;
  if (inline === CONFIRM_PULL) return;

  if (!process.stdin.isTTY) {
    throw new Error(`Non-interactive sync requires --confirm ${CONFIRM_PULL}.`);
  }

  const rl = createInterface({ input, output });
  const answer = await rl.question(`This will replace local data from hosted. Type ${CONFIRM_PULL} to continue: `);
  rl.close();

  if (answer !== CONFIRM_PULL) {
    throw new Error('Confirmation did not match. Aborting without changes.');
  }
};

const preflight = ({ needLocal, needHosted }) => {
  const localUrl = needLocal ? parseDatabaseUrl(requiredEnv('LOCAL_DATABASE_URL'), 'LOCAL_DATABASE_URL') : null;
  const hostedUrl = needHosted ? parseDatabaseUrl(requiredEnv('HOSTED_DATABASE_URL'), 'HOSTED_DATABASE_URL') : null;

  if (localUrl) assertPostgresUrl(localUrl, 'LOCAL_DATABASE_URL');
  if (hostedUrl) assertPostgresUrl(hostedUrl, 'HOSTED_DATABASE_URL');
  if (localUrl && hostedUrl && sameDatabase(localUrl, hostedUrl)) {
    throw new Error('LOCAL_DATABASE_URL and HOSTED_DATABASE_URL point to the same database.');
  }
  if (localUrl) assertLocalTarget(localUrl);

  return { localUrl: localUrl?.toString(), hostedUrl: hostedUrl?.toString() };
};

const backupLocal = async () => {
  const { localUrl } = preflight({ needLocal: true, needHosted: false });
  await backupDatabase({ url: localUrl, label: 'local' });
};

const backupHosted = async () => {
  const { hostedUrl } = preflight({ needLocal: false, needHosted: true });
  await backupDatabase({ url: hostedUrl, label: 'hosted' });
};

const pullHostedToLocal = async () => {
  const { localUrl, hostedUrl } = preflight({ needLocal: true, needHosted: true });
  await confirmPull();

  await backupDatabase({ url: localUrl, label: 'local-before-hosted-pull' });
  const hostedDump = await backupDatabase({ url: hostedUrl, label: 'hosted-source' });
  await restoreLocal({ localUrl, dumpFile: hostedDump });

  console.log('Regenerating Prisma Client...');
  await run('npm', ['run', 'prisma:generate']);
  console.log('Hosted-to-local sync complete.');
};

try {
  if (command === 'backup-local') {
    await backupLocal();
  } else if (command === 'backup-hosted') {
    await backupHosted();
  } else if (command === 'pull') {
    await pullHostedToLocal();
  } else {
    throw new Error('Usage: node scripts/db/sync.js <backup-local|backup-hosted|pull>');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
