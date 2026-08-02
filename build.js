// Build registry.json and index.json from the package files in plugins/.
//
// registry.json is the feed Clixy loads: it lists each plugin as a full package
// (code inline) so the app fetches everything in one request.
//
// index.json is a lightweight catalog for browsing and tooling: per plugin it
// carries the metadata plus raw URLs to the package file and, when present, the
// plugin's documentation page. No code, so it stays small.
//
// Run: node build.js

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PLUGINS_DIR = path.join(ROOT, 'plugins');
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
      guide: `${RAW_BASE}/docs/authoring-guide.md`,
      spec: `${RAW_BASE}/docs/authoring-spec.md`,
      plugins: catalog,
    },
    null,
    2
  ) + '\n'
);

console.log(`Wrote registry.json and index.json with ${packages.length} plugin(s): ${[...seen].join(', ')}`);
