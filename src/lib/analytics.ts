/** Public ID of the existing Waspect GA4 web stream. */
export const MEASUREMENT_ID = 'G-9240NYV1X7';
export const CONSENT_KEY = 'waspect.analytics-consent.v1';
export type Consent = 'granted' | 'denied';
type Gtag = (command: string, ...args: unknown[]) => void;

interface AnalyticsOptions {
  href: string;
  referrer: string;
  language: string;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  gtag: Gtag;
  loadTag: () => void;
  setDisabled: (disabled: boolean) => void;
}

const HOSTS = new Set(['waspect.jp', 'www.waspect.jp']);
const ADS_DENIED = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

/** Send known page paths, never arbitrary URL parameters or fragments. */
export function pageLocation(href: string): string {
  const url = new URL(href);
  const path = /^\/(?:en\/)?(?:(?:schools|businesses|kids|about|contact)\/)?$/.test(url.pathname)
    ? url.pathname : '/404.html';
  return `${url.origin}${path}`;
}

export function pageReferrer(referrer: string): string {
  try {
    const url = new URL(referrer);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return HOSTS.has(url.hostname) ? pageLocation(referrer) : url.origin;
  } catch {
    return '';
  }
}

/** Preserve campaign attribution without forwarding arbitrary query strings. */
export function campaignParameters(href: string): Record<string, string> {
  const params: Record<string, string> = {};
  const url = new URL(href);
  for (const key of ['source', 'medium', 'campaign', 'content', 'term'] as const) {
    const value = url.searchParams.get(`utm_${key}`);
    if (value && value.length <= 100 && !/[@<>]|%40/i.test(value)) {
      params[key === 'campaign' ? 'campaign_name' : `campaign_${key}`] = value;
    }
  }
  return params;
}

/** Basic consent mode: no Google script or measurement before opt-in. */
export function createAnalytics(options: AnalyticsOptions) {
  const url = new URL(options.href);
  const production = url.protocol === 'https:' && HOSTS.has(url.hostname);
  let consent: Consent | null = null;
  let initialized = false;
  const sent = new Set<string>();
  const language = options.language === 'en' ? 'en' : 'ja';

  try {
    const saved = options.storage.getItem(CONSENT_KEY);
    if (saved === 'granted' || saved === 'denied') consent = saved;
  } catch {
    // A blocked storage API must not prevent the visitor from choosing.
  }

  function applyConsent() {
    const enabled = production && consent === 'granted';
    options.setDisabled(!enabled);
    if (!enabled) {
      if (initialized) {
        options.gtag('consent', 'update', { analytics_storage: 'denied', ...ADS_DENIED });
      }
      return;
    }
    if (!initialized) {
      initialized = true;
      options.gtag('consent', 'default', { analytics_storage: 'denied', ...ADS_DENIED });
      options.gtag('consent', 'update', { analytics_storage: 'granted', ...ADS_DENIED });
      options.gtag('js', new Date());
      options.gtag('config', MEASUREMENT_ID, {
        page_location: pageLocation(options.href),
        page_referrer: pageReferrer(options.referrer),
        language,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        ...campaignParameters(options.href),
      });
      options.loadTag();
    } else {
      options.gtag('consent', 'update', { analytics_storage: 'granted', ...ADS_DENIED });
    }
  }

  applyConsent();

  function track(name: string, formName: string, extra: Record<string, string> = {}) {
    if (!production || consent !== 'granted' || sent.has(formName)) return;
    sent.add(formName);
    options.gtag('event', name, {
      send_to: MEASUREMENT_ID,
      form_name: formName,
      language,
      ...extra,
    });
  }

  return {
    getConsent: () => consent,
    setConsent(value: Consent) {
      if (value === consent) return;
      consent = value;
      try {
        options.storage.setItem(CONSENT_KEY, value);
      } catch {
        // Keep the choice for this page even when storage is unavailable.
      }
      applyConsent();
    },
    contactSucceeded(identity: string) {
      const leadType = ['school', 'business', 'parent'].includes(identity) ? identity : 'unknown';
      track('generate_lead', 'contact', { lead_type: leadType, lead_source: 'website' });
    },
    newsletterSucceeded() {
      track('newsletter_subscribe', 'newsletter');
    },
  };
}

let analytics: ReturnType<typeof createAnalytics> | undefined;

export function initAnalytics() {
  if (analytics) return analytics;
  const runtime = window as Window & {
    dataLayer?: unknown[];
    gtag?: Gtag;
  };
  runtime.dataLayer = runtime.dataLayer || [];
  runtime.gtag = function () { runtime.dataLayer!.push(arguments); };
  analytics = createAnalytics({
    href: window.location.href,
    referrer: document.referrer,
    language: document.documentElement.lang,
    storage: {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
    },
    gtag: runtime.gtag,
    setDisabled: (disabled) => { Reflect.set(window, `ga-disable-${MEASUREMENT_ID}`, disabled); },
    loadTag() {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      document.head.append(script);
    },
  });
  return analytics;
}

export function trackContactSuccess(identity: string) {
  // Measurement failure must never interfere with a successful form submission.
  try { analytics?.contactSucceeded(identity); } catch { /* Optional analytics. */ }
}

export function trackNewsletterSuccess() {
  try { analytics?.newsletterSucceeded(); } catch { /* Optional analytics. */ }
}
