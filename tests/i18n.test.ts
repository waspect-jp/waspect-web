import { describe, expect, it } from 'vitest';
import ja from '../src/i18n/ja';
import en from '../src/i18n/en';
import { localePath, switchLangPath, t } from '../src/i18n/utils';
import { GLUE_TERMS, WORD_JOINER, glue, jp } from '../src/i18n/jp';

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
});
