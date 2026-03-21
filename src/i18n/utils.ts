import en from './en';
import ja from './ja';

export type Lang = 'en' | 'ja';

const translations: Record<Lang, Record<string, string>> = { en, ja };

/** Default language is Japanese */
export const defaultLang: Lang = 'ja';

export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations.ja[key] ?? key;
}

/** Generate both locale variants: / (Japanese) and /en (English) */
export function getStaticPaths() {
  return [
    { params: { locale: undefined }, props: { lang: 'ja' as Lang } },
    { params: { locale: 'en' }, props: { lang: 'en' as Lang } },
  ];
}

/** Ensure path ends with trailing slash */
function ensureTrailingSlash(p: string): string {
  if (p.includes('?')) {
    const [base, query] = p.split('?');
    return `${base.endsWith('/') ? base : base + '/'}?${query}`;
  }
  return p.endsWith('/') ? p : `${p}/`;
}

/** Prefix a path with the locale if needed */
export function localePath(lang: Lang, path: string): string {
  if (lang === 'ja') return ensureTrailingSlash(path);
  return ensureTrailingSlash(`/en${path}`);
}

/** Get the path for the other language */
export function switchLangPath(lang: Lang, currentPath: string): string {
  if (lang === 'ja') {
    return ensureTrailingSlash(`/en${currentPath}`);
  }
  return ensureTrailingSlash(currentPath.replace(/^\/en/, '') || '/');
}
