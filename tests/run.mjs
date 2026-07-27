#!/usr/bin/env node
/* Runner for the regression guards. Starts a static server, resolves
   playwright and axe-core, runs every check, prints a summary.

   Usage:  node tests/run.mjs
   Exit code is non-zero if anything fails, so this is CI-ready.          */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
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
if (!axePath) {
  console.error('axe-core not found. Install it; accessibility checks are required.');
  process.exit(2);
}

/* ---- static server ---- */
async function reservePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise((resolve) => probe.close(resolve));
  if (!port) throw new Error('Could not reserve a local test port.');
  return port;
}

const PORT = await reservePort();
const TEST_BASE = `http://127.0.0.1:${PORT}`;
process.env.TEST_BASE = TEST_BASE;

async function serverReady() {
  try {
    const res = await fetch(`${TEST_BASE}/index.html`);
    const body = await res.text();
    return res.ok && body.includes('<title>Raccoon Restoration');
  } catch { return false; }
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: root,
  stdio: 'ignore',
});
// kill the child only — never the process group, which would take the caller with it
let stopped = false;
const stopServer = () => {
  if (stopped) return;
  stopped = true;
  try { server.kill('SIGTERM'); } catch { /* already gone */ }
};

process.on('exit', stopServer);
process.on('SIGINT', () => { stopServer(); process.exit(130); });
for (let i = 0; i < 20 && !(await serverReady()); i++) {
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!(await serverReady())) {
  stopServer();
  console.error(`Could not start this repository's server on :${PORT}`);
  process.exit(2);
}

/* ---- run ---- */
const { makeTests } = await import('./site.spec.mjs');
const { makeCrossBrowserTests } = await import('./cross-browser.spec.mjs');
const suites = [
  {
    label: 'Chromium',
    engine: playwright.chromium,
    tests: makeTests({ chromium: playwright.chromium, axePath }),
  },
  {
    label: 'Firefox',
    engine: playwright.firefox,
    tests: makeCrossBrowserTests({ browserName: 'Firefox', axePath }),
  },
  {
    label: 'WebKit',
    engine: playwright.webkit,
    tests: makeCrossBrowserTests({ browserName: 'WebKit', axePath }),
  },
];

let passed = 0;
const failures = [];
const total = suites.reduce((sum, suite) => sum + suite.tests.length, 0);
console.log(`Running ${total} checks against ${TEST_BASE}\n`);

for (const suite of suites) {
  let browser;
  try {
    browser = await suite.engine.launch({ headless: true });
  } catch (err) {
    for (const t of suite.tests) {
      failures.push({ name: t.name, message: `${suite.label} unavailable: ${err.message}` });
      console.log(`  ✗ ${t.name}\n      ${suite.label} unavailable: ${err.message.split('\n')[0]}`);
    }
    continue;
  }

  for (const t of suite.tests) {
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
}

stopServer();

console.log(`\n${passed}/${total} passed`);
if (failures.length) {
  console.log(`\n${failures.length} failing:`);
  for (const f of failures) console.log(`  - ${f.name}`);
  process.exit(1);
}
console.log('All regression guards green.');
process.exit(0);
