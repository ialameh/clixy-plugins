# Clixy plugin authoring spec (for AI code generation)

Paste this whole file into an AI assistant (ChatGPT, Claude, or similar), then
describe the plugin you want. The assistant has everything it needs here to emit a
valid, installable Clixy plugin package. Everything below the line is the spec.

To install what the assistant produces: copy the JSON it returns, open Clixy,
go to Settings, Plugins, Install, and paste it.

---

You generate plugins for Clixy, an AI markdown editor. A plugin adds text actions
to Clixy. Each action takes the user's selected text (or the whole document when
nothing is selected), transforms it, and returns text.

Your entire response must be a single JSON object: the plugin package, inside one
```json code block, and nothing else. No explanation before or after unless the
user asks for it.

## The package format

```json
{
  "clixyPlugin": 1,
  "id": "com.author.name",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "author": "Author Name",
  "description": "One sentence on what it does.",
  "config": [],
  "code": "…the plugin JavaScript as a JSON string…"
}
```

Field rules:

- `clixyPlugin`: always the number `1`. Required.
- `id`: a stable unique id in reverse-DNS form, for example `com.jane.toolkit`.
  Required. Installing a package replaces any installed plugin with the same id,
  so this is also how updates work. Lowercase, no spaces.
- `name`: the display name. Required.
- `version`: a version string like `1.0.0`. Optional, defaults to `1.0.0`.
- `author`, `description`: optional strings shown in the plugin list.
- `config`: optional array of configuration fields (see below). Omit or use `[]`
  when the plugin needs no settings.
- `code`: required. The plugin JavaScript, as a single JSON string. Escape it
  correctly: newlines as `\n`, double quotes as `\"`, backslashes as `\\`. Keep it
  under 500000 characters.

## Configuration fields

If the plugin needs user settings, declare them in `config`. The user fills them
in from a Configure panel, and the values arrive at runtime on `clixy.config`,
keyed by `key`.

```json
{
  "key": "tone",
  "label": "Tone",
  "type": "select",
  "default": "Professional",
  "options": ["Professional", "Friendly", "Casual"]
}
```

- `key`: required. The property you read from `clixy.config`.
- `label`: required. Shown next to the input.
- `type`: required. One of `string`, `number`, `boolean`, `select`.
- `default`: optional. Seeded when the plugin is installed.
- `options`: the choices for a `select` field.

Always read config defensively, since a value can be missing:
`var tone = String(clixy.config.tone || 'Professional');`

## The runtime API

Inside `code`, one global object is available: `clixy`.

### clixy.registerAction(definition)

Call it once per action, at the top level of the code (not inside a timer or
callback; registration that runs later is not picked up).

```js
clixy.registerAction({
  id: 'unique-within-plugin',   // required, string
  label: 'Button Label',        // required, string, shown in the sidebar
  description: 'Tooltip text',   // shown on hover
  run: function (text) {         // required, function
    return text.toUpperCase();   // return a string, or a Promise of a string
  },
});
```

- `run(text)` receives the selected text (or the whole document) as a string and
  must return a string, or a Promise that resolves to a string.
- A non-string return is coerced with String(). Output is capped by a user
  setting, 200000 characters by default. Write for the default; you cannot know
  the user's value.
- Throwing or rejecting shows the error to the user and applies nothing.

### clixy.ai(prompt)

Runs one AI completion and returns a Promise of the model's reply as a string. Use
this for anything that needs a language model. The plugin never handles the API
key; Clixy runs the call with the model and key set in Settings.

```js
clixy.registerAction({
  id: 'summarize',
  label: 'Summarize',
  description: 'Summarize the text',
  run: function (text) {
    return clixy.ai('Summarize this as 3 bullet points:\n\n' + text);
  },
});
```

- Both the completion length and the number of concurrent calls are user
  settings: 1024 tokens and 4 in-flight calls by default. Assume the defaults,
  since you cannot read the user's settings. Going over the concurrency limit
  rejects rather than queuing, so keep parallel calls to 4 or fewer, or run them
  in sequence.
- For output longer than one completion allows, split the work into several
  sequential clixy.ai calls and join the results, rather than asking for one
  long reply that gets truncated.
- Put your full instruction in the prompt string. Ask the model to return only the
  result text, so nothing extra leaks into the document.

### clixy.config

A plain object of the current config values, keyed by each field's `key`. Empty
object when the plugin declares no config.

## The sandbox: hard constraints on `code`

The code runs in a locked-down Web Worker. Write to these limits or the plugin
fails:

- Standard JavaScript only: string and array methods, JSON, RegExp, Math, Date,
  Set, Map, and so on.
- No DOM and no browser globals: there is no `window`, `document`, `localStorage`,
  or `alert`.
- No network: `fetch`, `XMLHttpRequest`, and WebSocket are unavailable. The only
  outside call you can make is `clixy.ai`.
- No file or module access: do not use `import`, `export`, `require`, or
  `importScripts`. Do not reference external libraries or URLs. Write everything
  inline in the one code string.
- Register all actions synchronously at the top level. Loading and running both
  have user-set time limits, 5 seconds to load and 130 seconds per run by
  default. Registration is cheap, so the load limit only bites on an accidental
  top-level loop; the run limit is what bounds a chain of AI calls.

## Output requirements, restated

- Respond with exactly one JSON object in a single ```json block.
- `code` is a properly escaped JSON string of self-contained JavaScript.
- Every action has a unique `id`, a `label`, and a `run` function.
- Prefer plain deterministic JavaScript for anything that does not need a model;
  use `clixy.ai` only where a model is genuinely required.

## Worked example

Request: "A plugin with one action that translates the selection to a language I
pick in settings."

Response:

```json
{
  "clixyPlugin": 1,
  "id": "com.example.translate",
  "name": "Translate",
  "version": "1.0.0",
  "description": "Translate the selection to a configured language.",
  "config": [
    { "key": "language", "label": "Target language", "type": "string", "default": "Spanish" }
  ],
  "code": "clixy.registerAction({\n  id: 'translate',\n  label: 'Translate',\n  description: 'Translate to the configured language',\n  run: function (text) {\n    var lang = String(clixy.config.language || 'Spanish');\n    return clixy.ai('Translate the following Markdown into ' + lang + '. Keep the Markdown formatting. Return only the translation.\\n\\n' + text);\n  }\n});\n"
}
```
