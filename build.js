// Build registry.json from the package files in plugins/.
//
// Each plugin is a full package JSON. The registry lists them inline so Clixy
// fetches everything in a single request. Run: node build.js

const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, 'plugins');
const OUT = path.join(__dirname, 'registry.json');

const REQUIRED = ['clixyPlugin', 'id', 'name', 'code'];

function loadPackage(file) {
  const full = path.join(PLUGINS_DIR, file);
  const pkg = JSON.parse(fs.readFileSync(full, 'utf8'));
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
const plugins = files.map((file) => {
  const pkg = loadPackage(file);
  if (seen.has(pkg.id)) {
    throw new Error(`${file}: duplicate id "${pkg.id}"`);
  }
  seen.add(pkg.id);
  return pkg;
});

fs.writeFileSync(OUT, JSON.stringify({ name: 'Clixy community plugins', plugins }, null, 2) + '\n');
console.log(`Wrote registry.json with ${plugins.length} plugin(s): ${[...seen].join(', ')}`);
