// `npm run map` — writes docs/shared/CODE_MAP.md in BOTH repositories: an
// index of the whole system built from the code itself (API endpoints with
// their handler line, permission, tables and the app screens that call them;
// screens; components; data models; backend helpers). Agents search it
// instead of reading every file, so it must never be stale: `npm run verify`
// runs `node scripts/code-map.js --check`, which fails when the map no
// longer matches the code.
//
// Plain regex parsing of this project's own conventions (router.get('...'),
// xxxApi = { fn: () => api.get(`/api/...`) }, prisma.<model>.<op>(...)), no
// dependencies. When a convention changes, adjust the parser here.
//
// This file is identical in both repositories; `npm run verify` enforces it.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BACKEND = 'rajat_crm_node_backend';
const FRONTEND = 'rajat_crm_native_frontend';
const HERE = path.resolve(__dirname, '..');
const PARENT = path.dirname(HERE);
const BE = path.join(PARENT, BACKEND);
const FE = path.join(PARENT, FRONTEND);
const OUT = 'docs/shared/CODE_MAP.md';
const CHECK = process.argv.includes('--check');

for (const dir of [BE, FE]) {
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    console.error(`${path.basename(dir)} not found next to ${path.basename(HERE)} (expected ${dir}).`);
    process.exit(2);
  }
}

const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const lineAt = (text, index) => text.slice(0, index).split('\n').length;
const posix = (p) => p.split(path.sep).join('/');
const uniq = (xs) => [...new Set(xs)];
const sortedUniq = (xs) => uniq(xs).sort((a, b) => a.localeCompare(b));

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

// ─── Backend: data models ────────────────────────────────────────────────────

const schemaText = read(path.join(BE, 'prisma/schema.prisma'));
const models = [];
for (const m of schemaText.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)) {
  const body = m[2];
  models.push({
    name: m[1],
    line: lineAt(schemaText, m.index),
    table: (/@@map\("([^"]+)"\)/.exec(body) || [])[1] || m[1],
    fields: body.split('\n').map((l) => /^\s+(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/.exec(l)).filter(Boolean)
      .map(([, field, type, list, , rest]) => ({ field, type, list: !!list, unique: /@unique\b/.test(rest) })),
    readBy: new Set(),
    writtenBy: new Set(),
  });
}
const modelNames = new Set(models.map((m) => m.name));
const modelByAccessor = new Map(models.map((m) => [m.name[0].toLowerCase() + m.name.slice(1), m]));

const WRITE_OPS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);
// `prisma.order.findMany(` / `tx.orderPayment.create(` → which tables a body touches.
function dataUse(body) {
  const reads = new Set();
  const writes = new Set();
  for (const [, accessor, op] of body.matchAll(/\b(?:prisma|tx|db)\.([a-z]\w*)\.(\w+)\s*\(/g)) {
    const model = modelByAccessor.get(accessor);
    if (!model) continue;
    (WRITE_OPS.has(op) ? writes : reads).add(model.name);
  }
  for (const w of writes) reads.delete(w);
  return { reads: [...reads].sort(), writes: [...writes].sort(), raw: /\$(queryRaw|executeRaw)/.test(body) };
}

// ─── Backend: helpers (functions other code calls) ───────────────────────────

// A top-level body (function or route handler) runs to the next statement
// that starts at column 0 — the code is consistently formatted that way.
const topLevelStarts = (text) =>
  [...text.matchAll(/^(?:export |async |function |const |let |class |router\.|app\.|interface |type |\/\/ )/gm)].map((m) => m.index);
const bodyFrom = (text, tops, index) => text.slice(index, tops.find((i) => i > index) ?? text.length);

// Exported functions are keyed by name (callable from any file); the others
// by "<file>#<name>" (callable only inside their own file).
const helpers = new Map();
function collectFunctions(file, text) {
  const rel = posix(path.relative(BE, file));
  const tops = topLevelStarts(text);
  for (const m of text.matchAll(/^(export\s+)?(?:async\s+)?function\s+(\w+)|^export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/gm)) {
    const name = m[2] || m[3];
    const local = !(m[1] || m[3]);
    helpers.set(local ? `${rel}#${name}` : name, {
      name, file: rel, line: lineAt(text, m.index), local, body: bodyFrom(text, tops, m.index), calledBy: new Set(),
    });
  }
}
for (const dir of ['src/lib', 'src/utils', 'src/middleware']) {
  for (const f of walk(path.join(BE, dir), ['.ts'])) collectFunctions(f, read(f));
}
const MIDDLEWARE = new Set(['requireAuth', 'requireStaff', 'requirePermission', 'requireAnyPermission', 'requireModulePermission', 'requireSuperAdmin', 'can']);

function helperCalls(body, ownFile) {
  const names = [];
  for (const [key, h] of helpers) {
    if (MIDDLEWARE.has(h.name)) continue;
    if (h.local && !key.startsWith(`${ownFile}#`)) continue;
    if (new RegExp(`(?<![\\w.])${h.name}\\s*\\(`).test(body.replace(new RegExp(`function\\s+${h.name}\\b`), ''))) names.push(key);
  }
  return names;
}

// ─── Backend: routers and endpoints ──────────────────────────────────────────

const appText = read(path.join(BE, 'src/app.ts'));
const importFile = new Map([...appText.matchAll(/^import (\w+) from '\.\/routes\/(\w+)';/gm)].map((m) => [m[1], m[2]]));
const mounts = [...appText.matchAll(/^app\.use\('([^']+)',\s*(\w+)\)/gm)]
  .filter((m) => importFile.has(m[2]))
  .map((m) => ({ prefix: m[1], file: importFile.get(m[2]) }));

// Permission middleware on a router.use()/route line. `fileText` resolves
// requireAnyPermission(SOME_KEYS) to `const SOME_KEYS = ['a', 'b']`, and a
// file's own require*() middleware is shown by name.
// requireModulePermission('x', { readers, writers }) depends on the method:
// GET → x or a reader, anything else → x (or a writer).
function permissionOf(text, fileText, rel, method = '') {
  const keys = [...text.matchAll(/requirePermission\('([^']+)'\)/g)].map((m) => m[1]);
  // can('a', 'b', ...PICKERS): a or b, plus the actions listed in PICKERS
  // (forms of other modules that may read this list).
  for (const m of text.matchAll(/(?<![\w.])can\(([^)]*)\)/g)) {
    const own = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    const spread = /\.\.\.(\w+)/.exec(m[1]);
    const readers = spread ? [...(((new RegExp(`const ${spread[1]}\\b[^=]*=\\s*\\[([^\\]]*)\\]`).exec(fileText) || [])[1] || '').matchAll(/'([^']+)'/g))].map((x) => x[1]) : [];
    keys.push(own.join(' or ') + (readers.length ? ` (read also by ${readers.join(', ')})` : ''));
  }
  for (const m of text.matchAll(/requireModulePermission\('([^']+)'(?:,\s*\{([^}]*)\})?\)/g)) {
    const list = (name) => [...(((new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`).exec(m[2] || '') || [])[1] || '').matchAll(/'([^']+)'/g))].map((x) => x[1]);
    keys.push([m[1], ...(method === 'get' ? list('readers') : list('writers'))].join(' or '));
  }
  for (const m of text.matchAll(/requireAnyPermission\(([^)]*)\)/g)) {
    let arg = m[1].trim();
    if (!arg.includes("'")) arg = (new RegExp(`const ${arg}\\b[^=]*=\\s*\\[([^\\]]*)\\]`).exec(fileText) || [])[1] || arg;
    keys.push([...arg.matchAll(/'([^']+)'/g)].map((x) => x[1]).join(' or ') || arg);
  }
  if (/requireSuperAdmin/.test(text)) keys.push('super admin');
  for (const [, name] of text.matchAll(/\b(require\w+)\b(?!\s*\()/g)) {
    if (helpers.has(`${rel}#${name}`)) keys.push(`${name} (${path.posix.basename(rel)}:${helpers.get(`${rel}#${name}`).line})`);
  }
  return keys;
}

const modules = [];
const endpoints = [];
for (const { prefix, file } of mounts) {
  const fullFile = path.join(BE, 'src/routes', `${file}.ts`);
  const rel = `src/routes/${file}.ts`;
  const text = read(fullFile);
  collectFunctions(fullFile, text);
  const tops = topLevelStarts(text);

  const uses = [...text.matchAll(/^router\.use\((?:'([^']+)',\s*)?([^\n]*)\);/gm)].map((m) => ({
    scope: m[1] || '', perms: (method) => permissionOf(m[2], text, rel, method), auth: /requireAuth/.test(m[2]),
    module: (/requireModulePermission\('([^']+)'/.exec(m[2]) || [])[1],
  }));
  const routes = [...text.matchAll(/^router\.(get|post|put|patch|delete)\('([^']*)',?([^\n]*)/gm)];
  const mod = { file, rel, prefix, endpoints: [], perms: new Set() };
  routes.forEach((m) => {
    const body = bodyFrom(text, tops, m.index);
    const sub = m[2];
    const scoped = uses.filter((u) => !u.scope || sub === u.scope || sub.startsWith(`${u.scope}/`));
    const perms = [...scoped.flatMap((u) => u.perms(m[1])), ...permissionOf(m[3], text, rel, m[1])];
    const auth = scoped.some((u) => u.auth) || /requireAuth/.test(m[3]);
    // Checks made inside the handler with the record or the body.
    const inner = [...new Set([...body.matchAll(/\b(?:ensure\(req, res|holds\(req), '([^']+)'/g)].map((x) => x[1]))];
    const permission = (perms.length ? perms.join(' + ') : auth ? 'auth only (any check is in the handler)' : 'public')
      + (inner.length ? ` · in handler: ${inner.join(', ')}` : '');
    // A requireModulePermission router is listed under its own key; the
    // endpoint rows show who else may read (GET) or write.
    const own = scoped.find((u) => u.module)?.module;
    mod.perms.add(own ? `${own} (+ readers)` : perms.length ? perms.join(' + ') : auth ? 'auth only' : 'public');
    const fullPath = (prefix + (sub === '/' ? '' : sub)) || '/';
    const ep = {
      method: m[1].toUpperCase(), sub, fullPath, file: rel, line: lineAt(text, m.index), permission,
      data: dataUse(body), calls: helperCalls(body, rel), callers: [],
    };
    ep.data.reads.forEach((n) => models.find((x) => x.name === n).readBy.add(rel));
    ep.data.writes.forEach((n) => models.find((x) => x.name === n).writtenBy.add(rel));
    ep.calls.forEach((k) => helpers.get(k).calledBy.add(rel));
    mod.endpoints.push(ep);
    endpoints.push(ep);
  });
  modules.push(mod);
}

// Helpers also touch tables and call each other (e.g. recalcOrderPaid writes Order).
for (const [key, h] of helpers) {
  h.data = dataUse(h.body);
  h.calls = helperCalls(h.body, h.file).filter((k) => k !== key);
  h.calls.forEach((k) => helpers.get(k).calledBy.add(h.file));
  h.data.reads.forEach((n) => models.find((x) => x.name === n).readBy.add(h.file));
  h.data.writes.forEach((n) => models.find((x) => x.name === n).writtenBy.add(h.file));
}

// Same matching rule as Express: the first registered route that fits wins.
const segs = (p) => p.split('?')[0].split('/').filter(Boolean);
function findEndpoint(method, url) {
  const want = segs(url);
  return endpoints.find((e) => (method === 'ANY' || e.method === method) && (() => {
    const have = segs(e.fullPath);
    // A ':' from the app (a variable) only fits a ':param' route segment.
    return have.length === want.length && have.every((s, i) => s.startsWith(':') || s === want[i]);
  })());
}

// ─── Frontend: services/api.ts functions ─────────────────────────────────────

const apiText = read(path.join(FE, 'services/api.ts'));
const apiFns = []; // { name: 'ordersApi.addPayment', method, url, line, endpoint, users: [] }
// `${id}` → ':' (a path parameter); `${x ? '?a=b' : ''}` → '' (a query string).
const normalizeUrl = (u) => u.replace(/\$\{([^}]*)\}/g, (_, expr) => (/\?/.test(expr) ? '' : ':')).split('?')[0];
for (const block of apiText.matchAll(/^export const (\w+Api) = \{\n([\s\S]*?)^\};/gm)) {
  const objName = block[1];
  const blockStart = lineAt(apiText, block.index);
  const stack = [];
  let current = null;
  block[2].split('\n').forEach((line, i) => {
    const nested = /^\s+(\w+):\s*\{\s*$/.exec(line);
    if (nested) { stack.push(nested[1]); return; }
    if (/^\s+\},?\s*$/.test(line) && stack.length) { stack.pop(); return; }
    const prop = /^\s+(\w+)\s*:/.exec(line);
    if (prop) current = { name: [objName, ...stack, prop[1]].join('.'), line: blockStart + 1 + i };
    const call = /\bapi\.(get|post|put|patch|delete)\b[^(]*\(\s*([`'"])(.*?)\2/.exec(line);
    if (call && current) {
      const url = normalizeUrl(call[3]);
      apiFns.push({ name: current.name, method: call[1].toUpperCase(), url, line: current.line, users: [] });
      current = null;
    }
  });
}
for (const fn of apiFns) {
  fn.endpoint = findEndpoint(fn.method, fn.url);
  if (fn.endpoint) fn.endpoint.callers.push(fn);
}

// ─── Frontend: screens, components, other files ──────────────────────────────

const feFiles = ['app', 'components', 'hooks', 'store', 'utils', 'constants']
  .flatMap((d) => walk(path.join(FE, d), ['.ts', '.tsx']));
const apiFnNames = new Set(apiFns.map((f) => f.name));
const feInfo = feFiles.map((file) => {
  const rel = posix(path.relative(FE, file));
  const text = read(file);
  const apiCalls = sortedUniq([...text.matchAll(/\b(\w+Api)\.(\w+)(?:\.(\w+))?\s*\(/g)]
    .map((m) => [m[1], m[2], m[3]].filter(Boolean).join('.'))
    .filter((n) => apiFnNames.has(n)));
  const direct = sortedUniq([...text.matchAll(/[`'"](?:\$\{\w+\})?(\/api\/[^`'"\s]*)[`'"]/g)].map((m) => normalizeUrl(m[1])))
    .filter(() => rel !== 'services/api.ts');
  const components = sortedUniq([...text.matchAll(/from '(?:\.\.?\/)+components\/(\w+)'/g)].map((m) => m[1]));
  const guard = (/useFeatureGuard\(([^)]*)\)/.exec(text) || [])[1];
  return { rel, apiCalls, direct, components, guard: guard ? guard.replace(/\s+/g, ' ') : null };
});
for (const f of feInfo) {
  for (const n of f.apiCalls) apiFns.filter((x) => x.name === n).forEach((x) => x.users.push(f.rel));
  for (const url of f.direct) {
    const ep = findEndpoint('ANY', url);
    if (ep) ep.callers.push({ name: `direct ${url}`, users: [f.rel] });
  }
}

// Expo Router: app/(app)/orders/[id].tsx → /orders/[id]
const routeOf = (rel) => {
  const parts = rel.replace(/^app\//, '').replace(/\.tsx?$/, '').split('/').filter((p) => !/^\(.*\)$/.test(p));
  if (parts[parts.length - 1] === 'index') parts.pop();
  return '/' + parts.join('/');
};

// ─── Write the map ───────────────────────────────────────────────────────────

const L = [];
const out = (s = '') => L.push(s);
const cell = (xs, none = '—') => (xs && xs.length ? xs.join(', ') : none);
const helperLabel = (key) => helpers.get(key).name;
const dataCell = (d) => cell([...d.writes.map((n) => `${n} (w)`), ...d.reads, ...(d.raw ? ['raw SQL'] : [])]);

out('# Code Map (generated — do not edit by hand)');
out();
out('Built from the code of both repositories by `npm run map`');
out('(`scripts/code-map.js`); `npm run verify` fails when it is out of date, so');
out('it can be trusted. **Search it, do not read it whole**: look up a module,');
out('endpoint, screen, component or model, then open only the file:line it');
out('names. `(w)` = the handler writes that table. "Used by" = app files that');
out('call the endpoint through `services/api.ts`.');
out();
out('Sections: 1 Modules · 2 API endpoints · 3 Screens · 4 Components and other');
out('frontend files · 5 Data models · 6 Backend helpers · 7 Loose ends');
out();

out('## 1. Modules');
out();
out('| Module | Mount | Backend file | Permission | Endpoints | App API object | App screens |');
out('|---|---|---|---|---|---|---|');
for (const m of modules) {
  const objs = sortedUniq(m.endpoints.flatMap((e) => e.callers.filter((c) => c.method).map((c) => c.name.split('.')[0])));
  const folder = feInfo.some((f) => f.rel.startsWith(`app/(app)/${m.file}/`)) ? `app/(app)/${m.file}/` : '—';
  out(`| ${m.file} | \`${m.prefix}\` | ${m.rel} | ${[...m.perms].sort().join(', ')} | ${m.endpoints.length} | ${cell(objs)} | ${folder} |`);
}
out();

out('## 2. API endpoints');
for (const m of modules) {
  out();
  out(`### ${m.file} — \`${m.prefix}\` — ${m.rel}`);
  out();
  out('| Endpoint | Line | Permission | Tables | Calls | App function → used by |');
  out('|---|---|---|---|---|---|');
  for (const e of m.endpoints) {
    const used = e.callers.map((c) => `${c.name}${c.line ? ` (api.ts:${c.line})` : ''} ← ${cell(sortedUniq(c.users), 'not called')}`);
    out(`| ${e.method} ${e.sub} | ${e.line} | ${e.permission} | ${dataCell(e.data)} | ${cell(e.calls.map(helperLabel))} | ${cell(used, 'not called by the app')} |`);
  }
}
out();

out('## 3. Screens (Expo Router, `app/`)');
out();
out('| Route | File | API functions | Components | Feature guard |');
out('|---|---|---|---|---|');
for (const f of feInfo.filter((x) => x.rel.startsWith('app/'))) {
  const route = f.rel.endsWith('_layout.tsx') ? `${routeOf(f.rel.replace('_layout', 'index'))} (layout)` : routeOf(f.rel);
  out(`| ${route} | ${f.rel} | ${cell([...f.apiCalls, ...f.direct.map((u) => `direct ${u}`)])} | ${cell(f.components)} | ${f.guard || '—'} |`);
}
out();

out('## 4. Components and other frontend files');
out();
out('| File | API functions | Used by |');
out('|---|---|---|');
for (const f of feInfo.filter((x) => !x.rel.startsWith('app/'))) {
  const base = path.posix.basename(f.rel).replace(/\.tsx?$/, '');
  const users = f.rel.startsWith('components/') ? feInfo.filter((x) => x.components.includes(base)).map((x) => x.rel) : [];
  if (!f.rel.startsWith('components/') && !f.apiCalls.length && !f.direct.length) continue;
  out(`| ${f.rel} | ${cell([...f.apiCalls, ...f.direct.map((u) => `direct ${u}`)])} | ${cell(users, f.rel.startsWith('components/') ? 'not imported' : '—')} |`);
}
out();

out('## 5. Data models (`prisma/schema.prisma`)');
out();
out('| Model | Table | Line | Unique | Links to | Written by | Read by |');
out('|---|---|---|---|---|---|---|');
for (const m of models) {
  const links = sortedUniq(m.fields.filter((f) => modelNames.has(f.type)).map((f) => `${f.type}${f.list ? '[]' : ''}`));
  const unique = m.fields.filter((f) => f.unique).map((f) => f.field);
  const short = (s) => [...s].map((x) => x.replace(/^src\//, '')).sort();
  out(`| ${m.name} | ${m.table} | ${m.line} | ${cell(unique)} | ${cell(links)} | ${cell(short(m.writtenBy))} | ${cell(short([...m.readBy].filter((x) => !m.writtenBy.has(x))))} |`);
}
out();

out('## 6. Backend helpers');
out();
out('Exported from `src/lib`, `src/utils`, `src/middleware`, plus functions local to a route file.');
out();
out('| Function | File:line | Tables | Calls | Called from |');
out('|---|---|---|---|---|');
for (const h of [...helpers.values()].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
  out(`| ${h.name} | ${h.file}:${h.line} | ${dataCell(h.data)} | ${cell(h.calls.map(helperLabel))} | ${cell([...h.calledBy].map((x) => x.replace(/^src\//, '')).sort(), MIDDLEWARE.has(h.name) ? 'route middleware' : 'not called')} |`);
}
out();

out('## 7. Loose ends');
out();
const broken = apiFns.filter((f) => !f.endpoint);
out('App functions with no matching backend route (a bug, or the parser missed a pattern):');
out();
if (broken.length) broken.forEach((f) => out(`- ${f.name} — ${f.method} ${f.url} (services/api.ts:${f.line})`));
else out('- none');
out();
const unusedFns = apiFns.filter((f) => f.users.length === 0);
out('App functions defined in `services/api.ts` but not called by any app file:');
out();
out(unusedFns.length ? `- ${unusedFns.map((f) => f.name).join(', ')}` : '- none');
out();

// Every endpoint must check a permission, except these (public by design, or
// open to every signed-in user). verify fails on any other.
const OPEN_ENDPOINTS = new Set([
  'GET /api/whatsapp/webhook', 'POST /api/whatsapp/webhook', 'POST /api/auth/login', 'GET /api/auth/me',
  'POST /api/auth/logout', 'GET /api/dashboard',
]);
const unguarded = endpoints.filter((e) => /^(auth only|public)/.test(e.permission) && !OPEN_ENDPOINTS.has(`${e.method} ${e.fullPath}`));
out('Endpoints without a permission check (verify fails on these; open ones are listed in OPEN_ENDPOINTS, scripts/code-map.js):');
out();
if (unguarded.length) unguarded.forEach((e) => out(`- ${e.method} ${e.fullPath} (${e.file}:${e.line})`));
else out('- none');
out();

const map = L.join('\n') + '\n';
let stale = false;
for (const dir of [BE, FE]) {
  const target = path.join(dir, OUT);
  const current = fs.existsSync(target) ? read(target) : null;
  if (current === map) continue;
  if (CHECK) { stale = true; continue; }
  fs.writeFileSync(target, map);
  console.log(`wrote ${path.basename(dir)}/${OUT}`);
}
if (CHECK && unguarded.length) {
  console.error(`Endpoints without a permission check: ${unguarded.map((e) => `${e.method} ${e.fullPath}`).join(', ')}`);
  process.exit(3);
}
if (CHECK && stale) {
  console.error(`${OUT} is out of date — run \`npm run map\` and commit the result in both repositories.`);
  process.exit(1);
}
if (!CHECK) console.log(`${endpoints.length} endpoints, ${apiFns.length} app API functions, ${feInfo.length} frontend files, ${models.length} models.`);
