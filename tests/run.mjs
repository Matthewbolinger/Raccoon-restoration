#!/usr/bin/env node
/* Runner for the regression guards. Starts a static server, resolves
   playwright and (optionally) axe-core, runs every check, prints a summary.

   Usage:  node tests/run.mjs
   Exit code is non-zero if anything fails, so this is CI-ready.          */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/* ---- resolve playwright from wherever it lives ---- */
function resolvePlaywright() {
  const candidates = [
    'playwright',
    '/opt/node22/lib/node_modules/playwright',
    path.join(root, 'node_modules/playwright'),
  ];
  for (const c of candidates) {
    try { return require(c); } catch { /* keep looking */ }
  }
  return null;
}

function resolveAxe() {
  const candidates = [
    path.join(root, 'node_modules/axe-core/axe.min.js'),
    '/opt/node22/lib/node_modules/axe-core/axe.min.js',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  try { return require.resolve('axe-core/axe.min.js'); } catch { return null; }
}

const playwright = resolvePlaywright();
if (!playwright) {
  console.error('playwright not found. Install it, or run with a global playwright available.');
  process.exit(2);
}
const axePath = resolveAxe();
if (!axePath) console.warn('! axe-core not found — accessibility checks will be skipped.\n');

/* ---- static server ---- */
const PORT = 8899;
async function portAlive() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/index.html`);
    return res.ok;
  } catch { return false; }
}

let server = null;
// kill the child only — never the process group, which would take the caller with it
let stopped = false;
const stopServer = () => {
  if (stopped || !server) return;
  stopped = true;
  try { server.kill('SIGTERM'); } catch { /* already gone */ }
};

if (await portAlive()) {
  console.log(`Reusing the static server already on :${PORT}`);
} else {
  server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
  process.on('exit', stopServer);
  process.on('SIGINT', () => { stopServer(); process.exit(130); });
  for (let i = 0; i < 20 && !(await portAlive()); i++) await new Promise((r) => setTimeout(r, 250));
  if (!(await portAlive())) { console.error(`Could not start a server on :${PORT}`); process.exit(2); }
}

/* ---- run ---- */
const { makeTests } = await import('./site.spec.mjs');
const tests = makeTests({ chromium: playwright.chromium, axePath });
const browser = await playwright.chromium.launch({ headless: true });

let passed = 0;
const failures = [];
console.log(`Running ${tests.length} checks against http://127.0.0.1:${PORT}\n`);

for (const t of tests) {
  try {
    await t.fn(browser);
    passed++;
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failures.push({ name: t.name, message: err.message });
    console.log(`  ✗ ${t.name}\n      ${err.message.split('\n').join('\n      ')}`);
  }
}

await browser.close();
stopServer();

console.log(`\n${passed}/${tests.length} passed`);
if (failures.length) {
  console.log(`\n${failures.length} failing:`);
  for (const f of failures) console.log(`  - ${f.name}`);
  process.exit(1);
}
console.log('All regression guards green.');
process.exit(0);
