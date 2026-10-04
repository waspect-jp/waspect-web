/**
 * Checks on the built site in dist/. Run `npm run build` first
 * (or `npm run verify`, which builds and then tests).
 *
 * These guard the things a static marketing site breaks silently:
 * the Netlify Forms contract that feeds HubSpot, internal links,
 * per-page SEO tags, and leaked translation keys.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parse, type HTMLElement } from 'node-html-parser';

const DIST = join(process.cwd(), 'dist');
const SITE = 'https://waspect.jp';
const ROUTES = ['/', '/schools/', '/businesses/', '/kids/', '/about/', '/contact/'];
const LOCALIZED = [...ROUTES, ...ROUTES.map((r) => `/en${r}`)];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function routeFile(route: string): string {
  return join(DIST, route, 'index.html');
}

function load(route: string): HTMLElement {
  return parse(readFileSync(routeFile(route), 'utf8'));
}

beforeAll(() => {
  if (!existsSync(routeFile('/'))) {
    throw new Error('dist/ is missing. Run `npm run build` before `npm test` (or use `npm run verify`).');
  }
});

describe('built pages', () => {
  it('exist for every route in both languages, plus the 404 page and sitemap', () => {
    for (const route of LOCALIZED) expect(existsSync(routeFile(route)), route).toBe(true);
    expect(existsSync(join(DIST, '404.html'))).toBe(true);
    expect(existsSync(join(DIST, 'sitemap-index.xml'))).toBe(true);
  });

  it.each(LOCALIZED)('%s has the right lang, one h1, title, description, canonical and hreflang', (route) => {
    const doc = load(route);
    const lang = route.startsWith('/en/') ? 'en' : 'ja';
    expect(doc.querySelector('html')?.getAttribute('lang')).toBe(lang);
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('title')?.text.trim()).not.toBe('');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()).not.toBe('');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE}${route}`);
    const base = route.replace(/^\/en/, '') || '/';
    expect(doc.querySelector('link[hreflang="ja"]')?.getAttribute('href')).toBe(`${SITE}${base}`);
    expect(doc.querySelector('link[hreflang="en"]')?.getAttribute('href')).toBe(`${SITE}/en${base}`);
    expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(`${SITE}/images/og-v2.png`);
  });

  it('ships the Open Graph image', () => {
    expect(existsSync(join(DIST, 'images', 'og-v2.png'))).toBe(true);
  });

  it.each(LOCALIZED)('%s has no leaked translation keys or undefined values', (route) => {
    const text = load(route).querySelector('body')?.text ?? '';
    expect(text).not.toMatch(/\b(?:home|schools|biz|kids|about|contact|nav|footer|common|meta|notfound)\.[a-z0-9]+(?:\.[a-z0-9]+)+\b/);
    expect(text).not.toMatch(/\bundefined\b|\[object Object\]|\bNaN\b/);
  });

  it.each(LOCALIZED)('%s gives every image an alt attribute and points at files that exist', (route) => {
    const doc = load(route);
    for (const img of doc.querySelectorAll('img')) {
      expect(img.hasAttribute('alt'), img.toString().slice(0, 120)).toBe(true);
      const src = img.getAttribute('src') ?? '';
      if (src.startsWith('/')) expect(existsSync(join(DIST, src)), src).toBe(true);
    }
  });

  it.each(LOCALIZED)('%s only links to pages that were built', (route) => {
    const doc = load(route);
    for (const a of doc.querySelectorAll('a[href^="/"]')) {
      const href = (a.getAttribute('href') ?? '').split('#')[0].split('?')[0];
      if (!href) continue;
      const ok = existsSync(join(DIST, href, 'index.html')) || existsSync(join(DIST, href));
      expect(ok, `${route} links to ${href}`).toBe(true);
    }
  });

  it.each(LOCALIZED)('%s keeps the same language inside the page except for the language switch', (route) => {
    const doc = load(route);
    const lang = route.startsWith('/en/') ? 'en' : 'ja';
    const prefix = lang === 'en' ? '/en/' : '/';
    const offenders = doc
      .querySelectorAll('a[href^="/"]')
      .map((a) => a.getAttribute('href') ?? '')
      .filter((href) => href.startsWith(prefix) === false && !href.startsWith('/images/'))
      // the language switch deliberately points at the other locale
      .filter((href) => (lang === 'en' ? href !== (route.replace(/^\/en/, '') || '/') : href !== `/en${route}`));
    expect(offenders).toEqual([]);
  });
});

describe('Netlify forms (HubSpot sync contract)', () => {
  const contactRoutes = ['/contact/', '/en/contact/'];

  it.each(contactRoutes)('%s has the contact form with the exact field set', (route) => {
    const form = load(route).querySelector('form[name="contact"]');
    expect(form).not.toBeNull();
    expect(form?.getAttribute('data-netlify')).toBe('true');
    expect(form?.getAttribute('netlify-honeypot')).toBe('bot-field');
    expect(form?.getAttribute('method')?.toUpperCase()).toBe('POST');
    expect(form?.querySelector('input[name="form-name"]')?.getAttribute('value')).toBe('contact');
    expect(form?.querySelector('input[name="bot-field"]')).not.toBeNull();
    const identities = form?.querySelectorAll('input[name="identity"]').map((i) => i.getAttribute('value')).sort();
    expect(identities).toEqual(['business', 'parent', 'school']);
    for (const name of ['name', 'email', 'organization', 'role']) {
      expect(form?.querySelector(`input[name="${name}"]`), name).not.toBeNull();
    }
    expect(form?.querySelector('textarea[name="message"]')).not.toBeNull();
    expect(form?.querySelector('input[name="email"]')?.getAttribute('type')).toBe('email');
  });

  it.each(LOCALIZED)('%s carries the newsletter form in the footer', (route) => {
    const form = load(route).querySelector('form[name="newsletter"]');
    expect(form).not.toBeNull();
    expect(form?.getAttribute('data-netlify')).toBe('true');
    expect(form?.querySelector('input[name="form-name"]')?.getAttribute('value')).toBe('newsletter');
    expect(form?.querySelector('input[name="email"]')?.getAttribute('type')).toBe('email');
    expect(form?.querySelector('input[name="bot-field"]')).not.toBeNull();
  });

  it('matches the fields the HubSpot function reads', () => {
    const fn = readFileSync(join(process.cwd(), 'netlify/functions/hubspot-sync.mjs'), 'utf8');
    for (const field of ['name', 'email', 'organization', 'role', 'message', 'identity']) {
      expect(fn, field).toContain(`data.${field}`);
    }
    expect(fn).toContain("formName === 'contact'");
    expect(fn).toContain("formName === 'newsletter'");
  });
});

describe('assets', () => {
  it('does not ship any image larger than 600 KB', () => {
    const big = walk(join(DIST, '_astro'))
      .filter((f) => /\.(webp|jpe?g|png|avif)$/.test(f))
      .filter((f) => statSync(f).size > 600 * 1024)
      .map((f) => relative(DIST, f));
    expect(big).toEqual([]);
  });

  it('no longer references the removed stock photos', () => {
    const html = LOCALIZED.map((r) => readFileSync(routeFile(r), 'utf8')).join('\n');
    expect(html).not.toMatch(/hero-collaboration|classroom-shizuoka|zen-garden|tokyo-skyscraper|wood-joinery|team-whiteboard|ginza-aerial|newspaper-press|student-tablet/);
  });
});
