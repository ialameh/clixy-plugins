# AI Chat

Send the selected text (or the whole document) to the AI backend exactly as you
wrote it, like typing a message in a chat, and insert the reply. No prompt
wrapping is added, so the backend you selected in Settings decides how to answer.

- id: com.clixy.ai-chat
- version: 1.0.0
- author: Clixy
- package: `plugins/ai-chat.clixy.json`

## Install

Settings, Plugins, Registry, Load, then Install next to AI Chat. Or click Install
and paste the contents of `plugins/ai-chat.clixy.json`.

## Action

- Send to AI: sends the selection to the active backend as-is and inserts the
  reply at your chosen spot.

## Notes

This pairs well with a Moonnox agent set up for generation, since the request
reaches your agent verbatim. Select Moonnox in Settings, set your agent id, then
type an instruction (for example a request to generate a component) and run Send
to AI. With OpenAI selected, the model answers instead.
