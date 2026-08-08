// Build registry.json, index.json, and templates.json from the source files in
// plugins/ and templates/.
//
// registry.json is the feed Clixy loads: it lists each plugin as a full package
// (code inline) so the app fetches everything in one request.
//
// index.json is a lightweight catalog for browsing and tooling: per plugin it
// carries the metadata plus raw URLs to the package file and, when present, the
// plugin's documentation page. No code, so it stays small.
//
// templates.json is the project template feed for Clixy's New Project form:
// each template is a declarative tree (folders and files) stamped with a type
// label. Entry paths are validated here so the published feed can never carry a
// path that escapes a project folder.
//
// Run: node build.js

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PLUGINS_DIR = path.join(ROOT, 'plugins');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const DOCS_DIR = path.join(ROOT, 'docs', 'plugins');
const RAW_BASE = 'https://raw.githubusercontent.com/ialameh/clixy-plugins/main';

const REQUIRED = ['clixyPlugin', 'id', 'name', 'code'];

function loadPackage(file) {
  const pkg = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, file), 'utf8'));
  for (const field of REQUIRED) {
    if (pkg[field] === undefined) {
      throw new Error(`${file}: missing required field "${field}"`);
    }
  }
  if (pkg.clixyPlugin !== 1) {
    throw new Error(`${file}: clixyPlugin must be 1`);
  }
  return pkg;
}

const files = fs
  .readdirSync(PLUGINS_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

const seen = new Set();
const packages = files.map((file) => {
  const pkg = loadPackage(file);
  if (seen.has(pkg.id)) {
    throw new Error(`${file}: duplicate id "${pkg.id}"`);
  }
  seen.add(pkg.id);
  return { file, pkg };
});

// registry.json: full packages inline, for the app.
fs.writeFileSync(
  path.join(ROOT, 'registry.json'),
  JSON.stringify({ name: 'Clixy community plugins', plugins: packages.map((p) => p.pkg) }, null, 2) + '\n'
);

// index.json: light catalog with links, for browsing.
const catalog = packages.map(({ file, pkg }) => {
  const docFile = `${pkg.id}.md`;
  const hasDoc = fs.existsSync(path.join(DOCS_DIR, docFile));
  const entry = {
    id: pkg.id,
    name: pkg.name,
    version: pkg.version || '1.0.0',
    author: pkg.author,
    description: pkg.description,
    package: `${RAW_BASE}/plugins/${file}`,
  };
  if (hasDoc) entry.docs = `${RAW_BASE}/docs/plugins/${docFile}`;
  return entry;
});

fs.writeFileSync(
  path.join(ROOT, 'index.json'),
  JSON.stringify(
    {
      name: 'Clixy community plugins',
      registry: `${RAW_BASE}/registry.json`,
      templates: `${RAW_BASE}/templates.json`,
      guide: `${RAW_BASE}/docs/authoring-guide.md`,
      spec: `${RAW_BASE}/docs/authoring-spec.md`,
      plugins: catalog,
    },
    null,
    2
  ) + '\n'
);

// templates.json: the project template feed.

// A template entry path must stay inside the project folder: relative, forward
// slashes, no empty/dot/dot-dot segments, no drive letters or schemes.
function isSafeRelativePath(p) {
  if (typeof p !== 'string' || !p.trim()) return false;
  if (p.startsWith('/') || p.includes('\\') || p.includes(':')) return false;
  return p.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}

function loadTemplate(file) {
  const tpl = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf8'));
  for (const field of ['id', 'name', 'type', 'description']) {
    if (typeof tpl[field] !== 'string' || !tpl[field].trim()) {
      throw new Error(`${file}: missing or empty "${field}"`);
    }
  }
  if (!Array.isArray(tpl.entries) || tpl.entries.length === 0) {
    throw new Error(`${file}: entries must be a non-empty array`);
  }
  const paths = new Set();
  for (const entry of tpl.entries) {
    if (!entry || !isSafeRelativePath(entry.path)) {
      throw new Error(`${file}: unsafe or missing entry path "${entry && entry.path}"`);
    }
    if (paths.has(entry.path)) {
      throw new Error(`${file}: duplicate entry path "${entry.path}"`);
    }
    paths.add(entry.path);
    if (entry.content !== null && entry.content !== undefined && typeof entry.content !== 'string') {
      throw new Error(`${file}: entry "${entry.path}" content must be a string or null`);
    }
  }
  if (paths.has('clixy.project.json')) {
    throw new Error(`${file}: templates must not write clixy.project.json (the app owns it)`);
  }
  return tpl;
}

const templateFiles = fs.existsSync(TEMPLATES_DIR)
  ? fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.json')).sort()
  : [];

const templateIds = new Set();
const templates = templateFiles.map((file) => {
  const tpl = loadTemplate(file);
  if (templateIds.has(tpl.id)) {
    throw new Error(`${file}: duplicate template id "${tpl.id}"`);
  }
  templateIds.add(tpl.id);
  return tpl;
});

fs.writeFileSync(
  path.join(ROOT, 'templates.json'),
  JSON.stringify({ name: 'Clixy community templates', templates }, null, 2) + '\n'
);

console.log(
  `Wrote registry.json and index.json with ${packages.length} plugin(s): ${[...seen].join(', ')}`
);
console.log(
  `Wrote templates.json with ${templates.length} template(s): ${[...templateIds].join(', ')}`
);
