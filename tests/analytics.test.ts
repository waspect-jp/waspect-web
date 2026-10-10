import { describe, expect, it, vi } from 'vitest';
import { campaignParameters, CONSENT_KEY, createAnalytics, MEASUREMENT_ID, pageLocation, pageReferrer } from '../src/lib/analytics';

function setup(href = 'https://waspect.jp/contact/', saved: string | null = null) {
  const values = new Map<string, string>();
  if (saved !== null) values.set(CONSENT_KEY, saved);
  const gtag = vi.fn();
  const loadTag = vi.fn();
  const setDisabled = vi.fn();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  };
  const analytics = createAnalytics({
    href, referrer: 'https://www.google.com/search?q=private', language: 'ja',
    storage, gtag, loadTag, setDisabled,
  });
  return { analytics, gtag, loadTag, setDisabled, storage };
}

describe('GA4 consent and production isolation', () => {
  it('loads no Google tag and sends no events before consent or after declining', () => {
    const { analytics, gtag, loadTag, storage } = setup();
    expect(analytics.getConsent()).toBeNull();
    analytics.contactSucceeded('school');
    analytics.newsletterSucceeded();
    analytics.setConsent('denied');
    expect(storage.setItem).toHaveBeenCalledWith(CONSENT_KEY, 'denied');
    expect(gtag).not.toHaveBeenCalled();
    expect(loadTag).not.toHaveBeenCalled();
  });

  it('initializes the existing property once, with advertising consent denied', () => {
    const { analytics, gtag, loadTag } = setup();
    analytics.setConsent('granted');
    analytics.setConsent('granted');
    expect(loadTag).toHaveBeenCalledOnce();
    expect(gtag).toHaveBeenCalledWith('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    });
    expect(gtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    });
    expect(gtag).toHaveBeenCalledWith('config', MEASUREMENT_ID, expect.objectContaining({
      page_location: 'https://waspect.jp/contact/',
      page_referrer: 'https://www.google.com',
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    }));
    expect(gtag.mock.calls.filter(([command]) => command === 'config')).toHaveLength(1);
  });

  it.each([
    'http://localhost:4321/', 'https://waspect.netlify.app/', 'https://deploy-preview-7--waspect.netlify.app/',
    'https://waspect.jp.example.com/', 'http://waspect.jp/',
  ])('never loads or records events on %s, even with saved consent', (href) => {
    const { analytics, gtag, loadTag } = setup(href, 'granted');
    analytics.contactSucceeded('school');
    analytics.newsletterSucceeded();
    expect(gtag).not.toHaveBeenCalled();
    expect(loadTag).not.toHaveBeenCalled();
  });

  it('restores a saved choice and permits the www host', () => {
    const { analytics, loadTag } = setup('https://www.waspect.jp/en/', 'granted');
    expect(analytics.getConsent()).toBe('granted');
    expect(loadTag).toHaveBeenCalledOnce();
  });

  it('rejects unrecognized saved values', () => {
    const { analytics, loadTag } = setup(undefined, 'true');
    expect(analytics.getConsent()).toBeNull();
    expect(loadTag).not.toHaveBeenCalled();
  });

  it('stops events when consent is revoked and does not reload the tag on regrant', () => {
    const { analytics, gtag, loadTag, setDisabled } = setup(undefined, 'granted');
    analytics.setConsent('denied');
    analytics.contactSucceeded('school');
    expect(setDisabled).toHaveBeenLastCalledWith(true);
    expect(gtag.mock.calls.filter(([command]) => command === 'event')).toHaveLength(0);
    analytics.setConsent('granted');
    analytics.contactSucceeded('business');
    expect(setDisabled).toHaveBeenLastCalledWith(false);
    expect(loadTag).toHaveBeenCalledOnce();
    expect(gtag.mock.calls.filter(([command]) => command === 'event')).toHaveLength(1);
  });

  it('still respects consent when browser storage is blocked', () => {
    const gtag = vi.fn();
    const loadTag = vi.fn();
    const analytics = createAnalytics({
      href: 'https://waspect.jp/', referrer: '', language: 'en',
      storage: { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } },
      gtag, loadTag, setDisabled: vi.fn(),
    });
    expect(analytics.getConsent()).toBeNull();
    analytics.setConsent('granted');
    analytics.newsletterSucceeded();
    expect(loadTag).toHaveBeenCalledOnce();
    expect(gtag).toHaveBeenCalledWith('event', 'newsletter_subscribe', {
      send_to: MEASUREMENT_ID, form_name: 'newsletter', language: 'en',
    });
  });
});

describe('conversion data quality', () => {
  it('counts each successful form once per page and sends only whitelisted metadata', () => {
    const { analytics, gtag } = setup(undefined, 'granted');
    analytics.contactSucceeded('business');
    analytics.contactSucceeded('business');
    analytics.newsletterSucceeded();
    analytics.newsletterSucceeded();
    const events = gtag.mock.calls.filter(([command]) => command === 'event');
    expect(events).toEqual([
      ['event', 'generate_lead', {
        send_to: MEASUREMENT_ID, form_name: 'contact', language: 'ja', lead_type: 'business', lead_source: 'website',
      }],
      ['event', 'newsletter_subscribe', {
        send_to: MEASUREMENT_ID, form_name: 'newsletter', language: 'ja',
      }],
    ]);
  });

  it('does not forward unexpected form identity contents', () => {
    const { analytics, gtag } = setup(undefined, 'granted');
    analytics.contactSucceeded('person@example.com');
    expect(gtag).toHaveBeenCalledWith('event', 'generate_lead', expect.objectContaining({ lead_type: 'unknown' }));
    expect(JSON.stringify(gtag.mock.calls)).not.toContain('person@example.com');
  });

  it('strips arbitrary query parameters, fragments and unrecognized page paths', () => {
    expect(pageLocation('https://waspect.jp/en/contact/?email=person@example.com#secret')).toBe('https://waspect.jp/en/contact/');
    expect(pageLocation('https://waspect.jp/person@example.com/')).toBe('https://waspect.jp/404.html');
    expect(pageReferrer('https://other.example/path-with-private-data?email=person@example.com')).toBe('https://other.example');
    expect(pageReferrer('javascript:alert(1)')).toBe('');
    expect(pageReferrer('invalid')).toBe('');
  });

  it('retains campaign attribution without forwarding unrelated parameters or email addresses', () => {
    expect(campaignParameters('https://waspect.jp/?utm_source=newsletter&utm_medium=email&utm_campaign=autumn&utm_content=hero&utm_term=ai&email=private@example.com')).toEqual({
      campaign_source: 'newsletter', campaign_medium: 'email', campaign_name: 'autumn', campaign_content: 'hero', campaign_term: 'ai',
    });
    expect(campaignParameters('https://waspect.jp/?utm_campaign=person@example.com&utm_source=person%2540example.com')).toEqual({});
  });
});
