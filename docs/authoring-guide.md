# Clixy Plugins

Plugins let you add your own actions to Clixy. A plugin is a small piece of
JavaScript that registers one or more actions. Each action takes your selected
text (or the whole document when nothing is selected), does something with it,
and returns text. The result lands in the same chooser the built-in AI actions
use, so you decide how it goes into your document (replace the selection, insert
after it, at the cursor, as a comment, copy, or discard). You can also set a
fixed result mode per action in Settings so it applies without asking.

Plugins run in a locked-down sandbox. They cannot read your API key, touch the
file system, reach the network, or see the page. They can only transform text
and, if you want, ask Clixy to run an AI completion on their behalf.

This page is everything you need to write, install, and manage a plugin. Two
shortcuts: to have an AI assistant write a plugin for you, paste
`docs/authoring-spec.md` into it and describe what you want. For a ready
made plugin, install `plugins/writing-toolkit.clixy.json`.

## Contents

1. [Quick start](#quick-start)
2. [How a plugin runs](#how-a-plugin-runs)
3. [The clixy API](#the-clixy-api)
4. [Configuration fields](#configuration-fields)
5. [Examples](#examples)
6. [Sharing plugins: the package format](#sharing-plugins-the-package-format)
7. [The community registry](#the-community-registry)
8. [Installing and managing plugins](#installing-and-managing-plugins)
9. [The sandbox: what plugins can and cannot do](#the-sandbox-what-plugins-can-and-cannot-do)
10. [Limits](#limits)
11. [Troubleshooting](#troubleshooting)

## Quick start

Open Settings, scroll to Plugins, click Add, give it a name, and paste this:

```js
clixy.registerAction({
  id: 'shout',
  label: 'Shout',
  description: 'Uppercase the whole document',
  run: (text) => text.toUpperCase(),
});
```

Save. A Shout button appears in the AI Assistant panel in the left sidebar. Click
it, and the chooser opens with the uppercased text. Pick how to apply it.

That is a complete plugin. The rest of this page explains what else you can do.

## How a plugin runs

- Your code runs once when the plugin loads, in its own Web Worker. Register your
  actions at the top level of the code, right away. Registration that happens
  later (for example inside a `setTimeout`) is not picked up.
- Each registered action becomes a button in the sidebar AI Assistant panel.
- When you click the button, Clixy calls your action's `run` function with your
  selected text, or the whole document when nothing is selected, and waits for
  the string you return. You can return a string directly or a promise that
  resolves to a string.
- The returned string opens the result chooser. Nothing is written to your
  document until you pick an option there.

## The clixy API

Inside a plugin, one global object is available: `clixy`. It has two methods and
one property.

### clixy.registerAction(definition)

Registers an action. Call it once per action you want to add.

```js
clixy.registerAction({
  id: 'unique-id',           // required, unique within your plugin
  label: 'Menu Label',       // required, what the sidebar button says
  description: 'Tooltip',     // shown on hover
  run: (text) => '...',       // required, see below
});
```

- `run(text)` receives the selected text (or the whole document when nothing is
  selected) as a string and must return a string, or a promise that resolves to
  a string. Throwing an error (or rejecting) shows the error in the sidebar
  instead of applying a result.
- If `id`, `label`, or `run` is missing or the wrong type, registration throws
  and that action is skipped.

### clixy.ai(prompt)

Asks Clixy to run a single AI completion and returns a promise with the model's
reply as a string. Use this to build AI-assisted actions without ever handling
the API key yourself.

```js
clixy.registerAction({
  id: 'headline',
  label: 'Suggest a headline',
  description: 'Ask the model for a headline',
  run: async (text) => {
    const reply = await clixy.ai('Write a short headline for this text:\n\n' + text);
    return reply;
  },
});
```

- The prompt is sent as written, with no system prompt added, to whichever
  backend you selected in Settings (OpenAI or Moonnox). The key stays in the app;
  your plugin never sees it.
- Completions are capped by the "AI tokens per call" setting (default 1024).
  Raise it in Settings, Plugins when your model supports long outputs.
- The number of `clixy.ai` requests that can be in flight at once is the
  "Parallel AI calls" setting (default 4). One more than the limit rejects with
  an error until a pending request finishes.

### clixy.config

A plain object holding the current values of the configuration fields your plugin
declares (see [Configuration fields](#configuration-fields)). It is read-only from
the plugin's point of view: the user sets the values in Settings, and they are
handed to your code when the plugin loads.

```js
clixy.registerAction({
  id: 'greet',
  label: 'Add a greeting',
  description: 'Prepend a configurable greeting',
  run: (text) => `${clixy.config.greeting ?? 'Hello'}\n\n${text}`,
});
```

If your plugin has no config fields, `clixy.config` is an empty object.

## Configuration fields

A plugin can declare typed settings that the user fills in from a Configure panel
next to the plugin in Settings. You declare them in the plugin package (see the
next section); their values arrive at runtime on `clixy.config`, keyed by `key`.

Each field has this shape:

```json
{
  "key": "greeting",
  "label": "Greeting",
  "type": "string",
  "default": "Hello",
  "options": ["Hello", "Hi", "Hey"]
}
```

- `key` (required): the property name you read from `clixy.config`.
- `label` (required): what the Configure panel shows next to the input.
- `type` (required): one of `string`, `number`, `boolean`, or `select`.
- `default` (optional): the value seeded when the plugin is installed.
- `options` (optional): the choices for a `select` field.

The Configure button appears only when a plugin declares at least one field.
Changing a value reloads the plugin with the new config.

## Examples

### Wrap the document in a code fence

```js
clixy.registerAction({
  id: 'fence',
  label: 'Wrap in code block',
  description: 'Surround the text with a Markdown code fence',
  run: (text) => '```\n' + text + '\n```',
});
```

### Count words and return a summary line

```js
clixy.registerAction({
  id: 'wordcount',
  label: 'Word count',
  description: 'Report the word and character count',
  run: (text) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return `Words: ${words}, Characters: ${text.length}`;
  },
});
```

### AI: rewrite in plain language

```js
clixy.registerAction({
  id: 'plain',
  label: 'Plain language',
  description: 'Rewrite the text more simply',
  run: (text) => clixy.ai('Rewrite the following in plain, simple language:\n\n' + text),
});
```

### Several actions in one plugin

```js
clixy.registerAction({ id: 'upper', label: 'Uppercase', description: '', run: (t) => t.toUpperCase() });
clixy.registerAction({ id: 'lower', label: 'Lowercase', description: '', run: (t) => t.toLowerCase() });
clixy.registerAction({ id: 'trim',  label: 'Trim blank lines', description: '', run: (t) => t.replace(/\n{3,}/g, '\n\n') });
```

## Sharing plugins: the package format

To hand a plugin to someone else, or publish it, you package it as a single JSON
document. This is what the Install box accepts and what Export produces.

```json
{
  "clixyPlugin": 1,
  "id": "com.yourname.toolkit",
  "name": "Writing Toolkit",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A few small text actions.",
  "config": [
    { "key": "greeting", "label": "Greeting", "type": "string", "default": "Hello" }
  ],
  "code": "clixy.registerAction({ id: 'greet', label: 'Greet', description: '', run: (t) => clixy.config.greeting + '\\n' + t });"
}
```

Fields:

- `clixyPlugin` (required): must be the number `1`. It marks the format version.
- `id` (required): a stable, unique id. Use reverse-DNS (`com.yourname.toolkit`)
  so it does not collide with other authors. Installing a package replaces any
  installed plugin with the same `id`, so this is also how updates work.
- `name` (required): the display name.
- `version` (optional): a version string, defaults to `1.0.0`.
- `author`, `description` (optional): shown in the plugin list and registry.
- `config` (optional): the configuration fields described above.
- `code` (required): the plugin JavaScript, as a JSON string. Escape newlines as
  `\n` and quotes as needed, since it lives inside JSON.

To export: click the download icon next to a plugin. Its package JSON is copied
to your clipboard, ready to save to a `.json` file or paste to someone.

To install: click Install, paste the package JSON, click Install. Invalid packages
are rejected with a message and nothing is changed.

## The community registry

A registry is a hosted JSON document that lists packages, so you can browse and
install without copying JSON by hand. Click Registry in the Plugins section, enter
the registry URL (it is remembered), and click Load. Each listed plugin shows an
Install button, or Update if you already have that `id`.

The document is fetched by Clixy's backend over `https` (only `https` is allowed),
so no extra network permission is opened to plugins or the page. Its shape is a
list of packages, either bare or under a `plugins` key:

```json
{
  "plugins": [
    { "clixyPlugin": 1, "id": "com.yourname.toolkit", "name": "Writing Toolkit", "version": "1.0.0", "code": "..." }
  ]
}
```

Each entry is validated exactly like a pasted package. An entry that does not
validate is skipped, so one malformed package does not hide the rest.

## Installing and managing plugins

Everything is under Settings, in the Plugins section.

- Add your own: click Add, enter a name and paste your code, click Save. The
  plugin's actions appear in the sidebar right away.
- Install a package: click Install and paste a package's JSON, or use Registry to
  browse and install from a hosted list.
- Configure: click the sliders icon (shown when a plugin declares config fields)
  to set its values.
- Enable or disable: use the checkbox next to a plugin. A disabled plugin stops
  running and its actions leave the sidebar, but the code is kept so you can turn
  it back on.
- Edit: click the pencil icon, change the name or code, click Save. The plugin
  reloads with your changes.
- Export: click the download icon to copy the plugin as a package to share.
- Uninstall: click the trash icon. The plugin and its actions are removed.

Plugins are stored on your machine with your other settings. Installing one only
affects your copy of Clixy; sharing happens only when you export a package or
point at a registry.

## The sandbox: what plugins can and cannot do

A plugin runs in a Web Worker, isolated from the app. This is deliberate: you can
install a plugin without giving it the run of your machine.

A plugin can:

- Use standard JavaScript (string and array methods, JSON, regular expressions,
  `Math`, and so on).
- Register actions and transform text.
- Ask for an AI completion through `clixy.ai`.

A plugin cannot:

- See or use your OpenAI API key. AI calls are performed by the app; the key
  never enters the plugin.
- Reach the network. `fetch` and other network calls are blocked.
- Read or write files, or read your other settings.
- Touch the editor, the page, or the DOM. There is no `window` or `document`.

## Limits

These bounds keep a buggy or heavy plugin from taking over the app. Each one is
a setting under Settings, Plugins; the values below are the defaults:

- A plugin must finish loading and registering within the load timeout
  (default 5 seconds), or it is stopped (for example, an accidental infinite
  loop at the top level).
- A single action run must finish within the run timeout (default 130 seconds),
  or it is abandoned.
- An action's returned text is capped by the output setting
  (default 200,000 characters).
- Pending `clixy.ai` requests are capped by the parallel-calls setting
  (default 4), and each completion by the tokens-per-call setting
  (default 1024).

## Troubleshooting

- The action does not appear after saving: make sure `clixy.registerAction` is
  called at the top level of your code, not inside a timer or event handler, and
  that `id`, `label`, and `run` are all present.
- Clicking the action shows an error: your `run` function threw. The error text
  is shown in the sidebar. A common cause is calling a browser or Node API that
  does not exist in the worker.
- An AI action fails with a key error: set your OpenAI key in Settings first.
- Nothing happens for a long time: a run that exceeds the run timeout is
  abandoned. Check for a loop or an `await` that never resolves.
