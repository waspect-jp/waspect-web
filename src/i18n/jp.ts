import { loadDefaultJapaneseParser } from 'budoux';
import type { Lang } from './utils';

/**
 * Build-time Japanese line breaking with BudouX.
 *
 * Japanese has no spaces, so browsers may break a line anywhere, which
 * leaves orphaned particles and split words in headings. BudouX finds
 * phrase boundaries; we mark each one with <wbr>. Together with
 * `word-break: keep-all; overflow-wrap: anywhere;` (the .jp class in
 * global.css) the text then wraps only at those boundaries.
 *
 * Two things BudouX cannot know are handled here as well, by inserting
 * U+2060 WORD JOINER (an invisible character that forbids a break):
 *  - brand terms and proper nouns that must never split (AI×英語,
 *    モルガン・スタンレー), where the × and ・ would otherwise allow one;
 *  - a closing bracket followed by a particle (「知りたい」を), where
 *    browsers still allow a break even under keep-all.
 * A `white-space: nowrap` span would do the same job, but Chrome then
 * mis-places the break around an adjacent 。, so the character is safer.
 *
 * This runs in Astro frontmatter only; nothing ships to the client.
 */
const parser = loadDefaultJapaneseParser();
const ZWSP = '​';
export const WORD_JOINER = '⁠';

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
  return out;
}
