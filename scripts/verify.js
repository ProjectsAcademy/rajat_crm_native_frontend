// `npm run verify` — the checks every task must pass before it is reported
// done (docs/shared/DOCUMENTATION_PROTOCOL.md). It checks BOTH repositories,
// so run it once, from either one, after committing:
//
//   npm run verify              everything, including the backend API tests
//   npm run verify -- --quick   skip the API tests (while still working)
//
// Changes are measured against origin/dev_01 (override: VERIFY_BASE=<ref>).
// Exit code 0 = passed, 1 = failed (reasons listed at the end), 2 = the two
// repositories are not side by side.
//
// This file is identical in both repositories; the check below enforces it.
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const BACKEND = 'rajat_crm_node_backend';
const FRONTEND = 'rajat_crm_native_frontend';
const HERE = path.resolve(__dirname, '..');
const PARENT = path.dirname(HERE);
const BE = path.join(PARENT, BACKEND);
const FE = path.join(PARENT, FRONTEND);
const BASE_REF = process.env.VERIFY_BASE || 'origin/dev_01';
const QUICK = process.argv.includes('--quick');

const failures = [];
const warnings = [];
const say = (tag, msg) => console.log(`  ${tag.padEnd(5)} ${msg}`);
const ok = (msg) => say('ok', msg);
const fail = (msg) => { failures.push(msg); say('FAIL', msg); };
const warn = (msg) => { warnings.push(msg); say('warn', msg); };
const section = (title) => console.log(`\n${title}`);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}`, stdout: (r.stdout || '').trim() };
}
const git = (repo, args) => run('git', ['-C', repo, ...args]);
const readText = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const list = (items, max = 8) => items.slice(0, max).join(', ') + (items.length > max ? `, ... (${items.length} in all)` : '');

if (![BACKEND, FRONTEND].includes(path.basename(HERE))) {
  console.error(`Run this from ${BACKEND} or ${FRONTEND}.`);
  process.exit(2);
}
for (const dir of [BE, FE]) {
  if (!fs.existsSync(path.join(dir, '.git'))) {
    console.error(`${path.basename(dir)} not found next to ${path.basename(HERE)} (expected ${dir}).`);
    process.exit(2);
  }
}

// ─── 1. Git state and what changed ───────────────────────────────────────────

section(`Git (changes measured against ${BASE_REF})`);
const repos = {};
for (const [name, dir] of [[BACKEND, BE], [FRONTEND, FE]]) {
  const branch = git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout;
  if (branch === 'main') fail(`${name}: on branch main — never work on main`);
  else ok(`${name}: branch ${branch}`);

  const dirty = run('git', ['-C', dir, 'status', '--porcelain']).out.split('\n').filter(Boolean);
  if (dirty.length) {
    fail(`${name}: not committed — commit what belongs to the task, delete leftovers (helper scripts, temp files): ${list(dirty.map((l) => l.slice(3)))}`);
  }
  if (git(dir, ['ls-files', '--error-unmatch', '.env']).status === 0) fail(`${name}: .env is tracked by git — it holds secrets`);

  const base = git(dir, ['merge-base', 'HEAD', BASE_REF]);
  if (base.status !== 0) {
    warn(`${name}: ${BASE_REF} not found (run git fetch) — change checks skipped`);
    continue;
  }
  const changed = [
    ...git(dir, ['diff', '--name-only', base.stdout]).stdout.split('\n'),
    ...git(dir, ['ls-files', '--others', '--exclude-standard']).stdout.split('\n'),
  ].filter(Boolean);
  const commits = git(dir, ['log', '--format=%h %s', `${base.stdout}..HEAD`]).stdout.split('\n').filter(Boolean);
  repos[name] = { dir, base: base.stdout, changed: [...new Set(changed)], commits };
  say('info', `${name}: ${commits.length} commit(s), ${repos[name].changed.length} file(s) changed`);
}

// ─── 2. Documentation was updated ────────────────────────────────────────────

section('Documentation');
const isDoc = (f) => f.startsWith('docs/') || /^[^/]+\.md$/.test(f);
for (const [name, r] of Object.entries(repos)) {
  const code = r.changed.filter((f) => !isDoc(f));
  if (code.length === 0) continue;
  const docs = r.changed.filter(isDoc);
  const written = docs.filter((f) => f !== 'docs/shared/CODE_MAP.md'); // generated, not written
  if (!docs.includes('docs/shared/WORK_LOG.md')) {
    fail(`${name}: code changed (${list(code, 4)}) but docs/shared/WORK_LOG.md has no new entry`);
  } else if (written.length === 1) {
    warn(`${name}: WORK_LOG.md is the only doc changed — check FEATURES.md, KNOWN_ISSUES_AND_PENDING.md and the reference doc are not stale now (DOCUMENTATION_PROTOCOL.md §3)`);
  } else {
    ok(`${name}: docs updated (${list(docs, 4)})`);
  }
}
if (repos[BACKEND]?.changed.some((f) => f.startsWith('src/routes/')) && repos[FRONTEND] && !repos[FRONTEND].changed.includes('services/api.ts')) {
  warn('backend routes changed but frontend services/api.ts did not — fine only if no request/response shape changed');
}

function compareTrees(a, b, rel = '') {
  const diffs = [];
  const names = new Set([
    ...(fs.existsSync(path.join(a, rel)) ? fs.readdirSync(path.join(a, rel)) : []),
    ...(fs.existsSync(path.join(b, rel)) ? fs.readdirSync(path.join(b, rel)) : []),
  ]);
  for (const n of [...names].sort()) {
    const r = path.join(rel, n);
    const pa = path.join(a, r);
    const pb = path.join(b, r);
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) diffs.push(`${r} (only in one repo)`);
    else if (fs.statSync(pa).isDirectory()) diffs.push(...compareTrees(a, b, r));
    else if (readText(pa) !== readText(pb)) diffs.push(r);
  }
  return diffs;
}
const sharedDiffs = compareTrees(path.join(BE, 'docs/shared'), path.join(FE, 'docs/shared'));
if (sharedDiffs.length) fail(`docs/shared differs between the repos: ${list(sharedDiffs)} — copy the edited files to the other repo`);
else ok('docs/shared is identical in both repos');

for (const script of ['scripts/verify.js', 'scripts/code-map.js']) {
  const copies = [BE, FE].map((d) => path.join(d, script));
  if (!copies.every((f) => fs.existsSync(f)) || readText(copies[0]) !== readText(copies[1])) {
    fail(`${script} differs between the repos — keep both copies identical`);
  }
}

const map = run(process.execPath, [path.join(HERE, 'scripts/code-map.js'), '--check']);
if (map.status === 0) ok('docs/shared/CODE_MAP.md matches the code');
else fail('docs/shared/CODE_MAP.md is out of date — run `npm run map` and commit the result in both repos');

// ─── 3. Rules on the added lines and commit messages ─────────────────────────

section('Project rules on the changes');
const DEVANAGARI = /[\u0900-\u097F]/;
const NON_LOCAL_DB_URL = /postgres(?:ql)?:\/\/[^\s:@'"`]+:[^\s@'"`]+@(?!localhost|127\.0\.0\.1)/;
const META_TOKEN = /\bEAA[A-Za-z0-9]{30,}/;

function addedLines(r) {
  const lines = [];
  let file = null;
  let lineNo = 0;
  for (const l of git(r.dir, ['diff', '-U0', '--no-color', r.base]).stdout.split('\n')) {
    if (l.startsWith('+++ ')) { file = l === '+++ /dev/null' ? null : l.slice(6); continue; }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(l);
    if (hunk) { lineNo = parseInt(hunk[1], 10); continue; }
    if (file && l.startsWith('+')) lines.push({ file, line: lineNo++, text: l.slice(1) });
  }
  // Untracked files count as wholly added.
  for (const f of git(r.dir, ['ls-files', '--others', '--exclude-standard']).stdout.split('\n').filter(Boolean)) {
    const full = path.join(r.dir, f);
    if (fs.statSync(full).size > 1024 * 1024) continue;
    readText(full).split('\n').forEach((text, i) => lines.push({ file: f, line: i + 1, text }));
  }
  return lines;
}

for (const [name, r] of Object.entries(repos)) {
  const problems = { hindi: [], prisma: [], secret: [], alert: [] };
  for (const { file, line, text } of addedLines(r)) {
    if (file.endsWith('package-lock.json')) continue; // integrity hashes look like tokens
    if (file === 'scripts/verify.js') continue; // holds the patterns themselves
    const at = `${file}:${line}`;
    if (DEVANAGARI.test(text)) problems.hindi.push(at);
    if (NON_LOCAL_DB_URL.test(text) || META_TOKEN.test(text)) problems.secret.push(at);
    const isCode = /\.(ts|tsx|js)$/.test(file) && !file.startsWith('docs/');
    if (isCode && name === BACKEND && /new PrismaClient\s*\(/.test(text) && file !== 'src/lib/prisma.ts') problems.prisma.push(at);
    if (isCode && name === FRONTEND && /\bAlert\.alert\s*\(/.test(text)) problems.alert.push(at);
  }
  if (problems.hindi.length) fail(`${name}: Hindi (Devanagari) text added — repo content is English only: ${list(problems.hindi)}`);
  if (problems.secret.length) fail(`${name}: looks like a real connection string or access token: ${list(problems.secret)}`);
  if (problems.prisma.length) fail(`${name}: new PrismaClient() — import prisma from '../lib/prisma' instead: ${list(problems.prisma)}`);
  if (problems.alert.length) warn(`${name}: Alert.alert added — it does nothing on web, use utils/dialogs.ts: ${list(problems.alert)}`);
  const clean = Object.values(problems).every((p) => p.length === 0);

  for (const c of r.commits) {
    const subject = c.slice(c.indexOf(' ') + 1);
    if (DEVANAGARI.test(subject)) fail(`${name}: commit message not in English: ${c}`);
    else if (/^(feat|fix|docs|chore|refactor|test|style|perf|build|ci)(\(.+\))?!?:/.test(subject)) {
      warn(`${name}: commit "${c}" — repo style is "<Area>: <what changed>", e.g. "Vendors: next code after a delete"`);
    }
  }
  if (clean) ok(`${name}: no rule problems in the added lines`);
}

// ─── 4. TypeScript ───────────────────────────────────────────────────────────

section('TypeScript');
function tsc(dir, project) {
  const bin = path.join(dir, 'node_modules/typescript/bin/tsc');
  if (!fs.existsSync(bin)) return null;
  const r = run(process.execPath, [bin, '--noEmit', '-p', project], { cwd: dir });
  return r.out.split('\n').filter((l) => /error TS\d+/.test(l));
}

const beErrors = tsc(BE, '.');
if (beErrors === null) fail(`${BACKEND}: node_modules missing — run npm install`);
else if (beErrors.length) fail(`${BACKEND}: tsc --noEmit has ${beErrors.length} error(s), must be 0 (stale Prisma client? run npx prisma generate):\n        ${beErrors.slice(0, 10).join('\n        ')}`);
else ok(`${BACKEND}: tsc --noEmit — 0 errors`);

if (fs.existsSync(path.join(BE, 'test/tsconfig.json'))) {
  const testErrors = tsc(BE, 'test');
  if (testErrors && testErrors.length) fail(`${BACKEND}: the API tests do not type-check:\n        ${testErrors.slice(0, 10).join('\n        ')}`);
  else if (testErrors) ok(`${BACKEND}: API tests type-check`);
}

const knownIssues = readText(path.join(HERE, 'docs/shared/KNOWN_ISSUES_AND_PENDING.md'));
const baselineMatch = /Frontend TypeScript baseline: (\d+) errors/.exec(knownIssues);
const feErrors = tsc(FE, '.');
if (feErrors === null) fail(`${FRONTEND}: node_modules missing — run npm install`);
else if (!baselineMatch) fail('KNOWN_ISSUES_AND_PENDING.md no longer states "Frontend TypeScript baseline: N errors"');
else {
  const baseline = parseInt(baselineMatch[1], 10);
  if (feErrors.length > baseline) {
    const touched = new Set(repos[FRONTEND]?.changed || []);
    const inTouched = feErrors.filter((l) => touched.has(l.split('(')[0].replace(/\\/g, '/')));
    fail(`${FRONTEND}: tsc --noEmit has ${feErrors.length} errors, baseline is ${baseline}${inTouched.length ? `; in files you changed:\n        ${inTouched.slice(0, 10).join('\n        ')}` : ''}`);
  } else if (feErrors.length < baseline) {
    warn(`${FRONTEND}: ${feErrors.length} tsc errors, below the baseline ${baseline} — lower the number in KNOWN_ISSUES_AND_PENDING.md section C`);
  } else ok(`${FRONTEND}: tsc --noEmit — ${feErrors.length} errors = known baseline`);
}

// ─── 5. Backend API tests ────────────────────────────────────────────────────

section('Backend API tests');
if (QUICK) {
  warn('API tests skipped (--quick) — run the full npm run verify before reporting the task done');
} else {
  console.log('        (throwaway PostgreSQL; first run downloads it, then about a minute)');
  const r = run(process.execPath, [path.join(BE, 'test/run.js')], { cwd: BE });
  const count = (k) => (new RegExp(`^# ${k} (\\d+)`, 'm').exec(r.out) || [])[1] || '?';
  const failed = r.out.split('\n').filter((l) => /^\s*not ok /.test(l) && !/# TODO/.test(l)).map((l) => l.trim());
  if (r.status === 0) ok(`npm test — ${count('pass')} passed, ${count('todo')} todo (known bugs)`);
  else {
    fail(`npm test failed — ${count('fail')} failed: ${list(failed, 6)} — run "npm test" in ${BACKEND} for details`);
    if (count('fail') === '?') console.log(r.out.split('\n').slice(-25).join('\n'));
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(70));
if (failures.length === 0) {
  console.log(`PASSED${warnings.length ? ` with ${warnings.length} warning(s) — read them, they need a decision` : ''}.`);
  process.exit(0);
}
console.log(`FAILED: ${failures.length} problem(s). Fix them with NEW commits (never amend), then run npm run verify again.`);
failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.split('\n')[0]}`));
process.exit(1);
