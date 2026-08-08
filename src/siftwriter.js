// SiftWriter for Clixy - readable source.
//
// The installable artifact is plugins/siftwriter.clixy.json (this code embedded
// in a package). To install: open Clixy Settings, Plugins, Install, and paste
// the contents of that file, or load the community registry.
//
// The plugin runs in a sandbox: no network, no files, no DOM, and it never sees
// your API key. AI actions go through clixy.ai, which runs the completion using
// the model and key set in Clixy Settings.
//
// Two kinds of action here. The deterministic ones (Strip AI tells, Readability)
// are plain JavaScript: instant, free, and identical every time. The rest are
// prompts. Anything a regular expression can do correctly is not sent to a
// model.

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function config(key, fallback) {
  var value = clixy.config[key];
  if (value === undefined || value === null || value === '') return fallback;
  return value;
}

// A voice sample the user pasted into settings, used to match their own style.
// Trimmed and length-capped so a whole chapter cannot crowd out the text being
// worked on.
function voiceClause() {
  var sample = String(config('voiceSample', '')).trim();
  if (!sample) return '';
  return (
    '\n\nMatch the voice of this writing sample. Copy its rhythm, vocabulary, and ' +
    'level of formality, not its subject matter:\n"""\n' +
    sample.slice(0, 4000) +
    '\n"""'
  );
}

// Every prompt ends with this. Without it models tend to add a preamble, and
// the result goes straight into the user's document.
var ONLY_RESULT =
  '\n\nReturn only the rewritten text. No preamble, no explanation, no quotes ' +
  'around it. Keep the Markdown formatting of the original.';

var ONLY_REPORT =
  '\n\nReturn only the report as Markdown. Be specific and quote the text you ' +
  'are referring to. Do not rewrite the whole piece.';

function rewrite(instruction, text) {
  return clixy.ai(instruction + voiceClause() + ONLY_RESULT + '\n\n' + text);
}

function report(instruction, text) {
  return clixy.ai(instruction + ONLY_REPORT + '\n\n' + text);
}

// ---------------------------------------------------------------------------
// Deterministic: strip AI tells
// ---------------------------------------------------------------------------

// Openers and connectives that mark machine-written prose. Removed at the start
// of a sentence, where they almost always appear and almost never earn a place.
var AI_OPENERS = [
  'in conclusion',
  'in summary',
  'to summarize',
  'it is worth noting that',
  'it is important to note that',
  'it should be noted that',
  'needless to say',
  'at the end of the day',
  'when it comes to',
  'in the realm of',
  'in the world of',
  'furthermore',
  'moreover',
  'additionally',
  'consequently',
  'nevertheless',
  'notably',
  'importantly',
  'ultimately',
  'overall',
];

// Words that read as filler or as machine vocabulary. Replaced with the plain
// word, or cut. Order matters: longer phrases first so they win.
var WORD_SWAPS = [
  ['a testament to', 'proof of'],
  ['plays a pivotal role in', 'is central to'],
  ['plays a crucial role in', 'is central to'],
  ['a wide range of', 'many'],
  ['a variety of', 'several'],
  ['in order to', 'to'],
  ['due to the fact that', 'because'],
  ['despite the fact that', 'although'],
  ['for the purpose of', 'for'],
  ['with regard to', 'about'],
  ['in terms of', 'for'],
  ['delve into', 'dig into'],
  ['delve', 'dig'],
  ['tapestry', 'mix'],
  ['pivotal', 'key'],
  ['underscore', 'show'],
  ['underscores', 'shows'],
  ['seamless', 'smooth'],
  ['seamlessly', 'smoothly'],
  ['robust', 'solid'],
  ['leverage', 'use'],
  ['leveraging', 'using'],
  ['utilize', 'use'],
  ['utilizing', 'using'],
  ['utilization', 'use'],
  ['myriad of', 'many'],
  ['plethora of', 'plenty of'],
  ['navigate the complexities of', 'work through'],
  ['embark on', 'start'],
  ['realm', 'area'],
  ['landscape of', 'state of'],
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Preserve the casing of what was matched: a replacement at the start of a
// sentence should stay capitalised.
function matchCase(replacement, original) {
  if (!original) return replacement;
  var firstChar = original.charAt(0);
  if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// Split off fenced code blocks so nothing inside them is rewritten. Returns an
// array of { code: boolean, text: string } in original order.
function splitFences(text) {
  var parts = [];
  var lines = text.split('\n');
  var buffer = [];
  var inFence = false;
  for (var i = 0; i < lines.length; i += 1) {
    var line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      parts.push({ code: inFence, text: buffer.join('\n') });
      buffer = [line];
      // The fence line itself belongs to the code side on open, and closes it
      // on the following marker.
      inFence = !inFence;
      parts.push({ code: true, text: buffer.join('\n') });
      buffer = [];
      continue;
    }
    buffer.push(line);
  }
  parts.push({ code: inFence, text: buffer.join('\n') });
  return parts;
}

function stripTellsFromProse(text) {
  var out = text;

  // Em and en dashes: a comma reads more naturally in most places, and they are
  // one of the strongest machine-writing tells.
  out = out.replace(/\s*[—–]\s*/g, ', ');

  // Sentence-opening connectives, with the comma that usually follows.
  for (var i = 0; i < AI_OPENERS.length; i += 1) {
    var opener = escapeRegExp(AI_OPENERS[i]);
    out = out.replace(
      new RegExp('(^|[.!?]\\s+|\\n)' + opener + ',?\\s+', 'gi'),
      function (match, lead) {
        return lead;
      }
    );
  }

  // Filler and machine vocabulary anywhere in the text.
  for (var j = 0; j < WORD_SWAPS.length; j += 1) {
    var from = escapeRegExp(WORD_SWAPS[j][0]);
    var to = WORD_SWAPS[j][1];
    out = out.replace(
      new RegExp('\\b' + from + '\\b', 'gi'),
      (function (replacement) {
        return function (match) {
          return matchCase(replacement, match);
        };
      })(to)
    );
  }

  // A sentence that lost its opener may now start lowercase.
  out = out.replace(/(^|[.!?]\s+|\n\n)([a-z])/g, function (match, lead, letter) {
    return lead + letter.toUpperCase();
  });

  // Collapse the double spaces the removals leave behind, without touching
  // indentation at the start of a line.
  out = out.replace(/([^\n ]) {2,}/g, '$1 ');
  return out;
}

function stripTells(text) {
  return splitFences(text)
    .map(function (part) {
      return part.code ? part.text : stripTellsFromProse(part.text);
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// Deterministic: readability
// ---------------------------------------------------------------------------

function countSyllables(word) {
  var w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  w = w.replace(/^y/, '');
  var groups = w.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

function readability(text) {
  var prose = splitFences(text)
    .filter(function (p) {
      return !p.code;
    })
    .map(function (p) {
      return p.text;
    })
    .join('\n');

  var sentences = prose.split(/[.!?]+(?:\s|$)/).filter(function (s) {
    return s.trim().length > 0;
  });
  var words = prose.split(/\s+/).filter(function (w) {
    return /[a-z0-9]/i.test(w);
  });
  if (words.length === 0) return 'No prose to measure.';

  var syllables = 0;
  var longWords = 0;
  for (var i = 0; i < words.length; i += 1) {
    var s = countSyllables(words[i]);
    syllables += s;
    if (s >= 3) longWords += 1;
  }

  var sentenceCount = Math.max(1, sentences.length);
  var wordsPerSentence = words.length / sentenceCount;
  var syllablesPerWord = syllables / words.length;

  // Flesch reading ease, clamped to the range people recognise.
  var ease = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  ease = Math.max(0, Math.min(100, ease));

  var grade = Math.max(1, 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59);

  // Sentence-length spread. Uniform length is the clearest machine tell, and
  // the number is more useful than an adjective.
  var lengths = sentences.map(function (s) {
    return s.trim().split(/\s+/).length;
  });
  var mean = lengths.reduce(function (a, b) {
    return a + b;
  }, 0) / lengths.length;
  var variance = lengths.reduce(function (a, b) {
    return a + (b - mean) * (b - mean);
  }, 0) / lengths.length;
  var spread = Math.sqrt(variance);

  var shortest = Math.min.apply(null, lengths);
  var longest = Math.max.apply(null, lengths);

  var verdict =
    spread < 4
      ? 'Very even. Real writing varies more; try cutting one sentence to a handful of words.'
      : spread < 7
        ? 'Somewhat even. A few more short sentences would give it a pulse.'
        : 'Good variation.';

  return [
    '# Readability',
    '',
    '- Words: ' + words.length + ' in ' + sentenceCount + ' sentences',
    '- Average sentence: ' + wordsPerSentence.toFixed(1) + ' words',
    '- Shortest / longest sentence: ' + shortest + ' / ' + longest + ' words',
    '- Sentence length spread: ' + spread.toFixed(1) + ' (' + verdict + ')',
    '- Long words (3+ syllables): ' +
      longWords +
      ' (' +
      ((longWords / words.length) * 100).toFixed(1) +
      '%)',
    '- Reading ease: ' + ease.toFixed(0) + '/100 (higher is easier)',
    '- Reading grade: ' + grade.toFixed(1),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

clixy.registerAction({
  id: 'strip-ai-tells',
  label: 'Strip AI tells',
  description: 'Remove machine-writing markers and em-dashes. No AI, instant.',
  run: function (text) {
    return stripTells(text);
  },
});

clixy.registerAction({
  id: 'readability',
  label: 'Readability check',
  description: 'Sentence length, spread, and reading grade. No AI, instant.',
  run: function (text) {
    return readability(text);
  },
});

clixy.registerAction({
  id: 'humanize',
  label: 'Humanize',
  description: 'Rewrite so it reads as written by a person, not generated',
  run: function (text) {
    var level = String(config('level', 'Moderate')).toLowerCase();
    var depth =
      level === 'subtle'
        ? 'Keep it professional. Remove the machine markers and vary the sentence ' +
          'lengths, but do not add personality or change the register.'
        : level === 'aggressive'
          ? 'Overhaul the style. Conversational, opinionated, with real personality ' +
            'and the small imperfections of natural writing.'
          : 'Remove every machine marker, vary sentence length noticeably, and let ' +
            'some personality through without becoming casual.';

    return rewrite(
      'Rewrite the following so it reads as though a person wrote it.\n\n' +
        depth +
        '\n\nDo all of this:\n' +
        '- Vary sentence length hard. Put a four-word sentence next to a long one.\n' +
        '- Cut machine connectives: furthermore, moreover, additionally, in conclusion.\n' +
        '- Use plain words over inflated ones: use not utilize, show not underscore.\n' +
        '- Never use em-dashes or en-dashes. Use a comma, a colon, or a new sentence.\n' +
        '- Choose the specific word over the safe one.\n' +
        '- Keep every fact, name, number, and link exactly as written.\n' +
        '- Keep the original meaning. This is a rewrite, not a rethink.',
      text
    );
  },
});

clixy.registerAction({
  id: 'detect-ai',
  label: 'Detect AI writing',
  description: 'Report which parts read as machine-written, and why',
  run: function (text) {
    return report(
      'Assess how much the following reads as machine-generated.\n\n' +
        'Report, as Markdown:\n' +
        '1. A verdict line: how machine-written this reads, and your confidence.\n' +
        '2. The specific markers you found, each with the exact phrase quoted. Look ' +
        'for uniform sentence length, machine connectives, inflated vocabulary, ' +
        'em-dashes, hedging, symmetrical paragraph structure, and generic examples.\n' +
        '3. The three changes that would most reduce it.\n\n' +
        'If it reads as human-written, say so plainly rather than inventing faults.',
      text
    );
  },
});

clixy.registerAction({
  id: 'show-dont-tell',
  label: "Show, don't tell",
  description: 'Turn stated emotion and summary into what the reader can see',
  run: function (text) {
    return rewrite(
      'Rewrite the following so it shows rather than tells.\n\n' +
        'Replace stated emotions and summarised judgements with what a reader could ' +
        'observe: action, gesture, dialogue, physical detail, and consequence. ' +
        '"She was nervous" becomes something she does. Keep the same events in the ' +
        'same order, and do not lengthen it by more than about a third.',
      text
    );
  },
});

clixy.registerAction({
  id: 'sensory',
  label: 'Add sensory detail',
  description: 'Bring a scene to life through the senses',
  run: function (text) {
    var senses = String(config('senses', 'All'));
    var focus =
      senses === 'All'
        ? 'Use whichever senses fit. Do not use all of them everywhere.'
        : 'Favour these senses: ' + senses + '.';
    return rewrite(
      'Add sensory detail to the following scene.\n\n' +
        focus +
        '\n\nDetail must be concrete and specific to this scene, never decorative ' +
        'or generic. Add to what is there rather than replacing it, and keep the ' +
        'events, dialogue, and meaning unchanged. Restraint beats abundance: a few ' +
        'precise details land harder than many vague ones.',
      text
    );
  },
});

clixy.registerAction({
  id: 'dialogue',
  label: 'Tighten dialogue',
  description: 'Make spoken lines sound like people talking',
  run: function (text) {
    return rewrite(
      'Tighten the dialogue in the following.\n\n' +
        'Make each speaker sound like a distinct person. Cut pleasantries and any ' +
        'line that only conveys information the reader already has. Let people ' +
        'interrupt, evade, and leave things unsaid. Prefer "said" over ornate speech ' +
        'tags, and cut adverbs on the tags. Leave narration outside the dialogue ' +
        'alone unless it directly supports a line.',
      text
    );
  },
});

clixy.registerAction({
  id: 'emotional-read',
  label: 'Emotional impact read',
  description: 'Report what the reader is likely to feel, beat by beat',
  run: function (text) {
    return report(
      'Read the following as a reader would and report its emotional effect.\n\n' +
        'Cover: the dominant feeling it creates; where the emotional beats land and ' +
        'where they flatten; any place the writing tells the reader what to feel ' +
        'instead of earning it; and the single change that would raise the impact ' +
        'most. Quote the text you mean.',
      text
    );
  },
});

clixy.registerAction({
  id: 'plain-language',
  label: 'Plain language',
  description: 'Say the same thing in the simplest words that carry it',
  run: function (text) {
    return rewrite(
      'Rewrite the following in plain language.\n\n' +
        'Short common words, active voice, one idea per sentence. Define any term ' +
        'that has to stay. Keep every fact and all the precision: simpler wording, ' +
        'not a simpler claim. Do not talk down to the reader.',
      text
    );
  },
});

clixy.registerAction({
  id: 'explain-simply',
  label: 'Explain simply',
  description: 'Rewrite technical content for a non-technical reader',
  run: function (text) {
    return rewrite(
      'Rewrite the following technical content for an intelligent reader who does ' +
        'not know the field.\n\n' +
        'Lead with what it does and why it matters before any mechanism. Replace ' +
        'jargon with plain words, or define it in passing the first time. Use a ' +
        'concrete comparison where one genuinely fits, and skip it where it would ' +
        'mislead. Stay accurate: no claim may become wrong in the name of being ' +
        'simpler.',
      text
    );
  },
});

clixy.registerAction({
  id: 'shorten',
  label: 'Shorten for social',
  description: 'Cut to a post for the platform set in settings',
  run: function (text) {
    var platform = String(config('platform', 'LinkedIn'));
    var shape =
      platform === 'X'
        ? 'Under 280 characters. One idea, no hashtags, no thread.'
        : platform === 'Instagram'
          ? 'Around 100 words, warm and direct, a line break between thoughts.'
          : 'Around 120 words. Open with the point, not a wind-up. No hashtag pile, ' +
            'no engagement bait, no "thoughts?" ending.';
    return rewrite(
      'Cut the following down to a single ' + platform + ' post.\n\n' +
        shape +
        '\n\nKeep the strongest specific detail and lose everything that is context ' +
        'rather than point. Do not invent a statistic or a claim that is not in the ' +
        'original.',
      text
    );
  },
});

clixy.registerAction({
  id: 'headlines',
  label: 'Suggest headlines',
  description: 'A numbered list of titles, from plain to pointed',
  run: function (text) {
    var count = Number(config('headlineCount', 5));
    if (!isFinite(count) || count < 1) count = 5;
    count = Math.min(12, Math.round(count));
    return clixy.ai(
      'Write ' + count + ' headline options for the following piece.\n\n' +
        'Range from plain and descriptive to pointed and specific. Each must be true ' +
        'to what the piece actually says. No clickbait, no colon-subtitle formula on ' +
        'every one, no question marks used as a substitute for a claim.\n\n' +
        'Return only a numbered Markdown list, nothing else.\n\n' +
        text
    );
  },
});
