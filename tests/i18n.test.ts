import { describe, expect, it } from 'vitest';
import ja from '../src/i18n/ja';
import en from '../src/i18n/en';
import { localePath, switchLangPath, t } from '../src/i18n/utils';
import { GLUE_TERMS, KINSOKU_END, KINSOKU_START, MAX_PHRASE, WORD_JOINER, glue, jp, softenLongPhrase } from '../src/i18n/jp';

describe('translation files', () => {
  it('have exactly the same keys in Japanese and English', () => {
    const jaKeys = Object.keys(ja).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys.filter((k) => !jaKeys.includes(k))).toEqual([]);
    expect(jaKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it('have no empty strings', () => {
    for (const [dict, name] of [[ja, 'ja'], [en, 'en']] as const) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim(), `${name}: ${key}`).not.toBe('');
      }
    }
  });

  it('only use <strong>, <br>, <span> markup inside strings', () => {
    const allowed = /<\/?(strong|br|span)\b[^>]*>/g;
    for (const dict of [ja, en]) {
      for (const [key, value] of Object.entries(dict)) {
        const leftover = value.replace(allowed, '');
        expect(leftover, key).not.toMatch(/<[a-z]/i);
      }
    }
  });

  it('falls back to Japanese for an unknown language key and returns the key when missing everywhere', () => {
    expect(t('en', 'nav.schools')).toBe('For schools');
    expect(t('ja', 'nav.schools')).toBe('学校向け');
    expect(t('en', 'does.not.exist')).toBe('does.not.exist');
  });
});

describe('locale paths', () => {
  it('prefixes English routes and keeps trailing slashes', () => {
    expect(localePath('ja', '/')).toBe('/');
    expect(localePath('ja', '/schools')).toBe('/schools/');
    expect(localePath('en', '/schools')).toBe('/en/schools/');
    expect(localePath('en', '/contact?who=school')).toBe('/en/contact/?who=school');
  });

  it('switches between languages for the same page', () => {
    expect(switchLangPath('ja', '/about/')).toBe('/en/about/');
    expect(switchLangPath('en', '/en/about/')).toBe('/about/');
    expect(switchLangPath('en', '/en/')).toBe('/');
  });
});

describe('Japanese phrase breaking (jp)', () => {
  it('leaves English untouched', () => {
    expect(jp('en', 'Hello <strong>world</strong>')).toBe('Hello <strong>world</strong>');
  });

  it('wraps Japanese in a .jp span with <wbr> at phrase boundaries and no zero-width spaces', () => {
    const out = jp('ja', 'テクノロジーを翼に、世界を遊び場に');
    expect(out.startsWith('<span class="jp">')).toBe(true);
    expect(out).toContain('<wbr>');
    expect(out).not.toContain('​');
    expect(out).not.toContain('style=');
    expect(out.replace(/<[^>]+>/g, '')).toBe('テクノロジーを翼に、世界を遊び場に');
  });

  it('preserves inline markup from the translation strings', () => {
    const out = jp('ja', '私たちの名前は<strong>「和」</strong>と「アスペクト」を組み合わせたものです。');
    expect(out).toContain('<strong>');
    expect(out.replace(/<[^>]+>/g, '').replaceAll(WORD_JOINER, '')).toBe('私たちの名前は「和」と「アスペクト」を組み合わせたものです。');
  });

  it('never allows a break inside brand terms and proper nouns', () => {
    for (const term of GLUE_TERMS) {
      const out = jp('ja', `これは${term}のテストです。`);
      expect(out, term).toContain(glue(term));
      // no <wbr> may survive inside the glued term
      const inner = out.slice(out.indexOf(glue(term)), out.indexOf(glue(term)) + glue(term).length);
      expect(inner).not.toContain('<wbr>');
    }
    expect(glue('AI×英語')).toBe(`A${WORD_JOINER}I${WORD_JOINER}×${WORD_JOINER}英${WORD_JOINER}語`);
  });

  it('keeps a particle attached to a closing bracket', () => {
    expect(jp('ja', '子どもたちの「知りたい」を広げるプログラムへ')).toContain(`」${WORD_JOINER}を`);
    expect(jp('ja', '和（ハーモニー）とアスペクトの融合')).toContain(`）${WORD_JOINER}と`);
  });

  it('keeps the visible text identical apart from invisible joiners', () => {
    const src = '<strong>インペリアル・カレッジ・ロンドン</strong>卒業。<strong>モルガン・スタンレー</strong>での経験。';
    const out = jp('ja', src).replace(/<[^>]+>/g, '').replaceAll(WORD_JOINER, '');
    expect(out).toBe(src.replace(/<[^>]+>/g, ''));
  });

  it('never leaves a phrase longer than a narrow line unbreakable', () => {
    const out = jp('ja', '私たちが教えるのはコーディングではありません。AI時代に求められるのは、批判的に、戦略的に、倫理的に考える力です。');
    const runs = out
      .replace(/<span[^>]*>|<\/span>/g, '')
      .split(/<wbr>/)
      .map((r) => Array.from(r).filter((c) => c !== WORD_JOINER).length);
    expect(Math.max(...runs)).toBeLessThanOrEqual(MAX_PHRASE);
  });

  it('only adds break opportunities where kinsoku allows them', () => {
    const out = softenLongPhrase('コーディングではありません。だから「問い」を立てて考えましょう。');
    const starts = [...out.matchAll(/<wbr>(.)/g)].map((m) => m[1]);
    const ends = [...out.matchAll(/(.)<wbr>/g)].map((m) => m[1]);
    for (const c of starts) expect(KINSOKU_START.has(c), `line may not start with ${c}`).toBe(false);
    for (const c of ends) expect(KINSOKU_END.has(c), `line may not end with ${c}`).toBe(false);
    // Latin words are never split inside; a break between them and Japanese is fine
    expect(softenLongPhrase('ChatGPTとKaggle Notebooks')).toMatch(/^ChatGPT(<wbr>)?と(<wbr>)?Kaggle Notebooks$/);
    expect(softenLongPhrase('短い句')).toBe('短い句');
  });
});
