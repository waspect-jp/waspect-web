import { loadDefaultJapaneseParser } from 'budoux';
import type { Lang } from './utils';

/**
 * Build-time Japanese line breaking with BudouX.
 *
 * Japanese has no spaces, so browsers may break a line anywhere, which
 * leaves orphaned particles and split words in headings. BudouX finds
 * phrase boundaries; we mark each one with <wbr>. Display text (.jp inside
 * headings, leads, chips) uses `word-break: keep-all; overflow-wrap: anywhere`
 * and so wraps only at those boundaries; body text uses phrase-aware normal
 * breaking so the hints are a preference, not a rule.
 *
 * Three things BudouX cannot know are handled here as well:
 *  - brand terms and proper nouns that must never split (AI×英語,
 *    モルガン・スタンレー): joined with U+2060 WORD JOINER, an invisible
 *    character that forbids a break where × or ・ would otherwise allow one;
 *  - a closing bracket followed by a particle (「知りたい」を), where
 *    browsers still allow a break even under keep-all: joined the same way;
 *  - phrases longer than a narrow line. With keep-all, a phrase that does
 *    not fit forces an emergency break that ignores kinsoku (a line may then
 *    start with 。). Long phrases therefore get extra, kinsoku-safe break
 *    opportunities at script transitions (kana → kanji, kana ↔ katakana) and,
 *    if still too long, at any legal position.
 *
 * This runs in Astro frontmatter only; nothing ships to the client.
 */
const parser = loadDefaultJapaneseParser();
const ZWSP = '​';
export const WORD_JOINER = '⁠';

/** Longest phrase that is allowed to stay unbreakable (full-width characters). */
export const MAX_PHRASE = 10;

/** Characters that may not start a line (行頭禁則). */
export const KINSOKU_START = new Set('、。，．・：；？！）」』】〉》〕｝〕ーゝゞ々ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ゛゜'.split(''));
/** Characters that may not end a line (行末禁則). */
export const KINSOKU_END = new Set('（「『【〈《〔｛'.split(''));

/** Terms kept on one line wherever they appear. */
export const GLUE_TERMS = [
  'AI×英語',
  '日本語・英語',
  'AI・世界・英語',
  'AI教育・グローバル教育',
  'モルガン・スタンレー',
  'インペリアル・カレッジ・ロンドン',
  'ニュースイッチ',
  '英語「を」学ぶ',
  '英語「で」学ぶ',
  '地域課題×AI×英語',
];

const OPEN_WRAPPER = /<span style="word-break:\s*keep-all;\s*overflow-wrap:\s*anywhere;?">/g;
const CLOSE_BRACKET_PARTICLE = /([」』）])(?:<wbr>)?([はがをにでともへ])/g;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The term with a word joiner between every character and no <wbr> inside. */
export function glue(term: string): string {
  return Array.from(term).join(WORD_JOINER);
}

type Script = 'kanji' | 'hira' | 'kata' | 'latin' | 'other';
function scriptOf(ch: string): Script {
  const c = ch.codePointAt(0) ?? 0;
  if ((c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf) || c === 0x3005) return 'kanji';
  if (c >= 0x3041 && c <= 0x309f) return 'hira';
  if ((c >= 0x30a0 && c <= 0x30ff) || (c >= 0x31f0 && c <= 0x31ff)) return 'kata';
  if (/[A-Za-z0-9À-ɏ]/.test(ch)) return 'latin';
  return 'other';
}

/** May a line break fall between these two characters? */
function legalBreak(prev: string, cur: string): boolean {
  if (prev === WORD_JOINER || cur === WORD_JOINER) return false;
  if (/\s/.test(prev) || /\s/.test(cur)) return false; // a space is already a break opportunity
  if (KINSOKU_START.has(cur) || KINSOKU_END.has(prev)) return false;
  if (scriptOf(prev) === 'latin' && scriptOf(cur) === 'latin') return false;
  return true;
}

/** A likely word boundary inside Japanese running text. */
function wordBoundary(prev: string, cur: string): boolean {
  const a = scriptOf(prev);
  const b = scriptOf(cur);
  if (a === b) return false;
  if (a === 'kanji' && b === 'hira') return false; // okurigana: 教える, 広げる
  return legalBreak(prev, cur);
}

const visibleLength = (s: string) => Array.from(s).filter((c) => c !== WORD_JOINER).length;

/**
 * Give a phrase longer than MAX_PHRASE extra, kinsoku-safe break opportunities.
 * Prefers script transitions; falls back to any legal position for runs that
 * are still too long.
 */
export function softenLongPhrase(phrase: string): string {
  if (visibleLength(phrase) <= MAX_PHRASE) return phrase;
  const chars = Array.from(phrase);
  // 1. split at likely word boundaries
  const parts: string[] = [];
  let current = chars[0] ?? '';
  for (let i = 1; i < chars.length; i++) {
    if (wordBoundary(chars[i - 1], chars[i])) {
      parts.push(current);
      current = '';
    }
    current += chars[i];
  }
  parts.push(current);
  // 2. anything still too long may break at any legal position
  const softened = parts.map((part) => {
    if (visibleLength(part) <= MAX_PHRASE) return part;
    const cs = Array.from(part);
    let out = cs[0] ?? '';
    for (let i = 1; i < cs.length; i++) {
      if (legalBreak(cs[i - 1], cs[i])) out += '<wbr>';
      out += cs[i];
    }
    return out;
  });
  return softened.join('<wbr>');
}

/** Returns HTML (safe for set:html) with phrase-level break opportunities for ja. */
export function jp(lang: Lang, html: string): string {
  if (lang !== 'ja' || !html) return html;
  let out = parser
    .translateHTMLString(html)
    .replaceAll(ZWSP, '<wbr>')
    .replace(OPEN_WRAPPER, '<span class="jp">');

  // Longest terms first so a short term never splits a longer one that contains it.
  for (const term of [...GLUE_TERMS].sort((a, b) => b.length - a.length)) {
    // BudouX may have placed a <wbr> (or an earlier term a joiner) inside; match either way.
    const pattern = new RegExp(Array.from(term).map(escapeRegExp).join(`(?:<wbr>|${WORD_JOINER})*`), 'g');
    out = out.replace(pattern, glue(term));
  }
  out = out.replace(CLOSE_BRACKET_PARTICLE, (_m, bracket: string, particle: string) => bracket + WORD_JOINER + particle);

  // Text between tags is one BudouX phrase (or a piece of one); soften the long ones.
  out = out.replace(/>([^<]+)</g, (_m, text: string) => `>${softenLongPhrase(text)}<`);
  return out;
}
