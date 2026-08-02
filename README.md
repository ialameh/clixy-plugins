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

- `registry.json`: the registry document Clixy reads. It lists every plugin as a
  full package, so Clixy fetches it in one request.
- `plugins/`: the individual plugin packages, one JSON file each. `registry.json`
  is built from these.

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

2. Rebuild `registry.json` so it includes your package:

   ```bash
   npm run build
   ```

   (or run `node build.js` directly)

3. Open a pull request.

Use a unique reverse-DNS `id` (for example `com.yourname.example`). Installing a
package replaces any installed plugin with the same `id`, which is how updates
work.

## Writing a plugin

See the Clixy plugin docs. To have an AI assistant write one for you, paste the
Clixy plugin authoring spec into it and describe what you want; it returns a
package you can drop into `plugins/`.
