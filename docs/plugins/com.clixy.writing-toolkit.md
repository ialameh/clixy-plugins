# Writing Toolkit

A set of small text actions for Clixy. Some run a language model through Clixy,
some are plain local transforms. Every action works on your selected text, or the
whole document when nothing is selected.

- id: com.clixy.writing-toolkit
- version: 1.0.0
- author: Clixy
- package: `plugins/writing-toolkit.clixy.json`

## Install

Settings, Plugins, Registry, Load, then Install next to Writing Toolkit. Or click
Install, and paste the contents of `plugins/writing-toolkit.clixy.json`.

## Actions

AI actions (need an OpenAI key set in Clixy Settings):

- Fix grammar: corrects grammar, spelling, and punctuation, keeping meaning and
  Markdown.
- Improve clarity: rewrites to be clearer and more concise.
- Change tone: rewrites in the tone set in this plugin's config.
- Summarize: summarizes as bullet points, count set in config.

Local actions (no model, no network):

- Title case: capitalizes the text as a title, leaving small words like of, and,
  the lowercase unless first.
- Bulletize lines: turns each non-empty line into a Markdown bullet, leaving
  existing list items alone.

## Configuration

Click the sliders icon next to the plugin to set:

- Tone (select): Professional, Friendly, Confident, Casual, or Direct. Default
  Professional. Used by Change tone.
- Summary bullets (number): how many bullets Summarize returns. Default 5.

## Notes

AI actions run through Clixy, so the model and key come from your Settings and the
plugin never sees the key. Each completion is capped at 1024 tokens.
