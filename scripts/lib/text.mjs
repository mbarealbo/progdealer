// House style for catalog text: no em or en dashes (U+2014, U+2013). Same
// rules as noDashes() in src/utils/eventText.ts (the app's copy, used by the
// "Add event" form): keep the two in step.
//
// A dash inside a word or a range (2026, en dash, 2027) becomes a hyphen. A
// dash between words becomes a colon after a title's first part ("BEAT, em
// dash, Performing the music of King Crimson" -> "BEAT: Performing..."), a
// comma anywhere else, and goes away after punctuation ("BIG!", en dash,
// "Premio" -> "BIG! Premio") or at either end.
const DASH = `[${String.fromCharCode(0x2013, 0x2014)}]`;
const HAS_DASH = new RegExp(DASH);
const JOINED = new RegExp(`(\\S)${DASH}(?=\\S)`, 'g');
const SPACED = new RegExp(`\\s*${DASH}\\s*`, 'g');

export function noDashes(text, kind = 'text') {
  if (!text || !HAS_DASH.test(text)) return text;
  const joined = text.replace(JOINED, '$1-');
  let colon = kind === 'title' && !joined.includes(':');
  return joined.replace(SPACED, (dash, at, all) => {
    const before = all.slice(0, at).trimEnd();
    if (!before || !all.slice(at + dash.length).trim()) return '';
    if (/[!?.,:;]$/.test(before)) return ' ';
    if (colon) { colon = false; return ': '; }
    return ', ';
  }).trim();
}
