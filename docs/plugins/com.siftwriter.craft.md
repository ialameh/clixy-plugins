# SiftWriter

Twelve actions for working a draft: strip the markers of machine writing, check
how it reads, and push on the craft.

- id: com.siftwriter.craft
- version: 1.0.0
- author: Sam Alameh
- package: `plugins/siftwriter.clixy.json`
- source: `src/siftwriter.js`

## Install

Settings, Plugins, Registry, Load, then Install next to SiftWriter. Or click
Install and paste the contents of `plugins/siftwriter.clixy.json`.

## Actions

Two of these are plain JavaScript. They run instantly, cost nothing, and give
the same answer every time. Anything a regular expression can do correctly is
not sent to a model.

**Strip AI tells** (no AI). Removes the markers of machine-written prose:
em-dashes and en-dashes become commas, sentence-opening connectives such as
Furthermore and In conclusion are cut, and inflated vocabulary is replaced with
the plain word (utilize becomes use, underscore becomes show, delve becomes
dig). Fenced code blocks are left exactly as they are, and capitalisation is
repaired where an opener was removed.

**Readability check** (no AI). Word and sentence counts, average sentence
length, shortest and longest, the spread of sentence lengths, the share of long
words, and a reading ease and grade. The spread is the number to watch: uniform
sentence length is the clearest sign of machine writing, so the report says
plainly when a piece is too even.

**Humanize.** Rewrites so the text reads as though a person wrote it: sentence
length varied hard, machine connectives gone, plain words over inflated ones, no
dashes. Facts, names, numbers, and links are preserved. Depth follows the
Humanize level setting.

**Detect AI writing.** A report, not a rewrite. Gives a verdict with confidence,
the specific markers it found with the phrases quoted, and the three changes
that would most reduce it. It is told to say so plainly when a piece reads as
human rather than inventing faults.

**Show, don't tell.** Turns stated emotion and summarised judgement into what a
reader could observe: action, gesture, dialogue, physical detail, consequence.

**Add sensory detail.** Brings a scene to life through the senses set in
Senses. Detail has to be concrete and specific to the scene; the prompt asks for
restraint rather than abundance.

**Tighten dialogue.** Makes each speaker sound like a distinct person, cuts
pleasantries and lines that only carry information the reader already has, and
strips ornate speech tags.

**Emotional impact read.** A report on what the reader is likely to feel, where
the beats land, where the writing tells the reader what to feel instead of
earning it, and the one change that would raise the impact most.

**Plain language.** The same claim in the simplest words that carry it. Simpler
wording, not a simpler claim.

**Explain simply.** Technical content rewritten for an intelligent reader who
does not know the field, leading with what it does and why it matters. No claim
is allowed to become wrong in the name of being simpler.

**Shorten for social.** Cuts to a single post shaped for the platform in
Social platform. It will not invent a statistic that is not in the original.

**Suggest headlines.** A numbered list, from plain and descriptive to pointed
and specific, each true to what the piece actually says.

## Configuration

- **Humanize level** (select): Subtle, Moderate, Aggressive. Subtle keeps the
  register and only removes the markers. Aggressive overhauls the style.
- **Voice sample** (multi-line): paste two or three paragraphs of your own
  writing. Every rewriting action then matches its rhythm, vocabulary, and
  formality. The sample is capped at 4000 characters so it cannot crowd out the
  text you are working on.
- **Senses** (select): which senses Add sensory detail should favour.
- **Social platform** (select): LinkedIn, X, or Instagram.
- **Headline count** (number): how many headlines to return, up to 12.

## Notes

Actions run on the selection, or on the whole document when nothing is
selected. The result opens in the chooser, so nothing is written to your
document until you pick an option.

AI actions run through Clixy, so the model and key come from your Settings and
the plugin never sees the key. Each completion is capped by the "AI tokens per
call" setting, 1024 by default, which is short for anything longer than a few
paragraphs. On a long selection, raise it in Settings, Plugins.

Every prompt ends by asking for the result text alone, so nothing extra leaks
into your document, and rewriting actions are told to keep the meaning: these
are rewrites, not rethinks.
