# Analytics and search after the Wix migration

## Existing Google property

Keep the existing Waspect GA4 property so historical reports remain available:

- Account: Waspect (`303586300`)
- Property: Waspect (`428803033`)
- Stream: Waspect Website (`7563789885`)
- Measurement ID: `G-9240NYV1X7`

The measurement ID is public configuration, not a credential.
Google Analytics works with the current Netlify Free plan. Netlify's separate
paid analytics product is optional.

## Collection

`src/lib/analytics.ts` loads the Google tag only on HTTPS `waspect.jp` or
`www.waspect.jp`, after a visitor allows analytics cookies. Localhost, Netlify
previews and the `netlify.app` URL do not record traffic. A saved choice carries
across pages; the footer lets visitors change it. Declining blocks measurement
and clears the site's GA4 cookies. Advertising consent stays denied, with Google
signals and ad personalization disabled.

| Event | Trigger | Extra parameters |
| --- | --- | --- |
| `page_view` | Initial Google tag configuration after consent | Page URL, referrer, language |
| `generate_lead` | Contact POST receives a successful response | `form_name=contact`, `lead_type=school/business/parent`, `lead_source=website`, language |
| `newsletter_subscribe` | Newsletter POST receives a successful response | `form_name=newsletter`, language |

Each custom form event is counted at most once per page. Failed requests and
events before consent are not recorded. Visitor names, email addresses,
organizations and messages are never passed to these analytics functions.
Unknown URL paths are reported as `/404.html`; query strings and fragments
are omitted. The five standard UTM parameters are mapped to campaign fields
(without email addresses), and external referrers are reduced to their origin.
Keep personal data out of campaign names.

The Netlify CSP allows Google's documented Analytics endpoints, without the
additional advertising endpoints:
https://developers.google.com/tag-platform/security/guides/csp

Consent implementation:
https://developers.google.com/tag-platform/security/guides/consent

## Google settings still to complete

1. Change the existing stream URL from `https://www.waspect.jp` to
   `https://waspect.jp`. Do not create a second stream or install a second tag.
2. Disable automatic **Form interactions** in Enhanced measurement. The
   custom events above count accepted requests, rather than submission attempts.
   Keep useful automatic page, scroll and outbound-click measurements.
3. Mark `generate_lead` and `newsletter_subscribe` as key events. Do not assign
   invented monetary values. For reports by audience/language, optionally create
   event-scoped custom dimensions for `lead_type` and `language`.
4. After DNS and HTTPS work, open the production site, allow analytics and check
   GA4 Realtime / DebugView with Tag Assistant. A successful real enquiry can
   verify the lead event without adding fake contacts to HubSpot.

These are deployment follow-ups; a local test passing does not prove Google has
received production events.

## Search and migration

The static build provides Japanese `/` and English `/en/` pages, individual
titles and descriptions, self-referencing HTTPS canonical URLs, reciprocal
language alternates, Organization JSON-LD, social previews, `robots.txt`, and
an XML sitemap. The 404 page is `noindex` and excluded from the sitemap.

Google Search Console currently has the `https://www.waspect.jp/` URL-prefix
property. Its indexed Wix URLs include `/`, `/about`, `/en`, `/en/about`, and
`/promotion2`. The business campaign moves permanently to `/businesses/`;
the English equivalent moves to `/en/businesses/`. Existing about/home language
paths remain available with trailing slashes.

After publishing and checking HTTPS:

1. Add the `waspect.jp` **Domain property** in Search Console to cover the apex,
   www, protocols and language subdomains. The existing Google verification TXT
   record has been retained in Netlify DNS.
2. Submit `https://waspect.jp/sitemap-index.xml` in that property.
3. Inspect the homepage, schools and businesses URLs, run Google's live test,
   and request indexing if the test succeeds. Repeat for English priorities.
4. Link that Search Console property to the existing GA4 web stream.
5. Check old Wix links and redirects. `en.waspect.jp` and `ja.waspect.jp` require
   Netlify domain aliases/DNS records and language redirects if they were shared
   externally; these have not been added yet.
6. Check Search Console indexing and redirect errors after Google recrawls.

Submitting a sitemap or requesting indexing asks Google to crawl. It does not
guarantee indexing, timing or rankings. HTTPS, crawlability and useful content
remain necessary.

Keep Wix until the custom domain and email have been verified. Cancel Wix
website billing separately, preserving the Squarespace domain registration
and Google Workspace email subscription.

## Validation

Run `npm run verify` to type-check, build all pages, and test Analytics consent,
production-host isolation, conversion metadata/deduplication, bilingual SEO,
sitemap entries, internal links and Netlify Forms.
