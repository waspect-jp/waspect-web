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
 * This runs in Astro frontmatter only; nothing ships to the client.
 */
const parser = loadDefaultJapaneseParser();
const ZWSP = '​';

/** Returns HTML (safe for set:html) with phrase-level break opportunities for ja. */
export function jp(lang: Lang, html: string): string {
  if (lang !== 'ja' || !html) return html;
  // BudouX wraps the fragment in <span style="word-break:keep-all;overflow-wrap:anywhere">
  // and inserts zero-width spaces. Swap both for a class and <wbr> so the
  // markup stays clean and copied text has no invisible characters.
  return parser
    .translateHTMLString(html)
    .replaceAll(ZWSP, '<wbr>')
    .replace(/<span style="word-break:\s*keep-all;\s*overflow-wrap:\s*anywhere;?">/g, '<span class="jp">');
}
