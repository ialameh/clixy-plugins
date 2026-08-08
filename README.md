# Clixy community plugins

A registry of plugins for [Clixy](https://github.com/ialameh), the AI markdown
editor. Point Clixy at the registry and install plugins with one click.

## Use the registry in Clixy

1. Open Clixy, go to Settings, Plugins.
2. Click Registry.
3. Paste this URL and click Load:

```
https://raw.githubusercontent.com/ialameh/clixy-plugins/main/registry.json
```

4. Each listed plugin has an Install button. Click it.

Plugins run in a sandbox: no network, no files, no DOM, and they never see your
API key. AI actions run through Clixy using the model and key set in your
Settings.

## What is here

- `registry.json`: the plugin feed Clixy reads. It lists every plugin as a full
  package (code inline), so Clixy fetches everything in one request.
- `index.json`: a lightweight catalog for browsing and tooling. Per plugin it
  carries the metadata plus raw URLs to the package file and its docs page, with
  no code.
- `templates.json`: the project template feed. Clixy reads it in the New Project
  form so you can start a project from a community template.
- `plugins/`: the individual plugin packages, one JSON file each.
- `templates/`: the individual project templates, one JSON file each.
- `docs/`: `authoring-guide.md` (how to write a plugin), `authoring-spec.md`
  (paste into an AI assistant to have it write one), and `docs/plugins/<id>.md`
  (a page per plugin).

`registry.json`, `index.json`, and `templates.json` are all generated from
`plugins/` and `templates/` by `build.js`.

## Index and docs URLs

- Catalog: `https://raw.githubusercontent.com/ialameh/clixy-plugins/main/index.json`
- Template feed: `https://raw.githubusercontent.com/ialameh/clixy-plugins/main/templates.json`
- Authoring guide: `https://raw.githubusercontent.com/ialameh/clixy-plugins/main/docs/authoring-guide.md`
- Authoring spec (for AI): `https://raw.githubusercontent.com/ialameh/clixy-plugins/main/docs/authoring-spec.md`

## Add a plugin

1. Add your package file to `plugins/`, named `your-plugin.clixy.json`. A package
   looks like this:

   ```json
   {
     "clixyPlugin": 1,
     "id": "com.yourname.example",
     "name": "Example",
     "version": "1.0.0",
     "author": "Your Name",
     "description": "What it does.",
     "config": [],
     "code": "clixy.registerAction({ id: 'x', label: 'X', description: '', run: function (t) { return t; } });"
   }
   ```

2. Optional: add a docs page at `docs/plugins/<your-id>.md` describing the
   actions and config. When present, `index.json` links to it automatically.

3. Rebuild `registry.json` and `index.json` so they include your package:

   ```bash
   npm run build
   ```

   (or run `node build.js` directly)

4. Open a pull request.

Use a unique reverse-DNS `id` (for example `com.yourname.example`). Installing a
package replaces any installed plugin with the same `id`, which is how updates
work.

## Writing a plugin

See `docs/authoring-guide.md` for the full guide. To have an AI assistant write a
plugin for you, paste `docs/authoring-spec.md` into it and describe what you want;
it returns a package you can drop into `plugins/`.

## Project templates

A project in Clixy is a folder holding a `clixy.project.json` manifest. A
template describes the folders and files a new project starts with, plus the
type label the project carries (writing, documentation, thinking, design, or
anything else you name). Templates are pure data: no code runs.

To use these templates, open Clixy, start a new project, and paste this URL into
the template registry field:

```
https://raw.githubusercontent.com/ialameh/clixy-plugins/main/templates.json
```

Community templates then appear in the template picker alongside the built-in
ones.

### Add a template

1. Add your template to `templates/`, named `your-template.template.json`:

   ```json
   {
     "id": "blog",
     "name": "Blog",
     "type": "writing",
     "description": "What a project from this template starts with.",
     "entries": [
       { "path": "posts", "content": null },
       { "path": "posts/first-post.md", "content": "# First post\n\n" },
       { "path": "style-guide.md", "content": "# {{name}} style guide\n\n" }
     ]
   }
   ```

2. Rebuild the feeds so `templates.json` includes it:

   ```bash
   npm run build
   ```

3. Open a pull request.

Field rules:

- `id`: unique across this repo, lowercase, no spaces.
- `name`, `type`, `description`: all required, all shown in the picker.
- `entries`: the tree to create. `content: null` makes a folder; a string makes a
  file with that content. `{{name}}` in a file's content is replaced with the
  project's name when the project is created.

Entry paths must stay inside the project folder: relative, forward slashes, no
`..`, no leading `/`, and no drive letters. `build.js` rejects anything else, and
Clixy validates again on its side before writing. A template must not declare
`clixy.project.json`; Clixy writes the manifest itself so it always matches the
name and type the user chose. Existing files are never overwritten, so
scaffolding into a folder that already has work in it is safe.
