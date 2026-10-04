# Waspect (和スペクト) Design System · v2

## Concept

The site is built on one idea from the CEO brief: **AI × English is a passport
that works in any country and any industry.** Everything else supports it.

The visual language comes from the thing every Japanese student knows:
**genkō yōshi (原稿用紙)**, the ruled manuscript paper used for compositions.

- **Paper** — white, generous margins, calm.
- **Ink** — blue-black (#1b2740), the fountain-pen colour of the text.
- **Ruling** — the soft green grid of the paper (#b9dbcf), used for dividers,
  borders, focus rings and highlights, with a text-safe green (#24896a / #176b52)
  as the accent.
- **朱 (shu)** — one vermilion mark (#d8432b), the teacher's pen. Used once per
  page at most: the side-line (傍線) that marks 「AI×英語」 in the hero.

The signature moment is the home hero: a fragment of manuscript paper on which
the tagline writes itself in, column by column, then receives the vermilion
side-line. Everything around it stays quiet.

## Tokens

Defined in `src/styles/global.css` (`@theme`) and available as Tailwind
utilities (`text-ink`, `bg-mist`, `border-rule-soft`, …).

| Token | Hex | Role |
| --- | --- | --- |
| `paper` | `#ffffff` | Page background |
| `mist` / `mist-deep` | `#f4f7f6` / `#e9eeec` | Section alternation, image placeholders |
| `ink` / `ink-soft` | `#1b2740` / `#2d3a55` | Headings, body, primary buttons |
| `ink-muted` / `ink-faint` | `#56607a` / `#8a93a8` | Secondary text, hints |
| `rule` / `rule-deep` | `#24896a` / `#176b52` | Accent: `rule` for icons and rules, `rule-deep` for text (AA on white) |
| `rule-soft` / `rule-faint` | `#b9dbcf` / `#dcece6` | Ruling: borders, dividers |
| `mint` | `#e8f4ef` | Soft green tint behind icons and chips |
| `indigo-tint` | `#e8edf5` | Soft ink tint for secondary chips |
| `on-ink-muted` | `#b7c1d6` | Secondary text on dark bands |
| `shu` | `#d8432b` | Vermilion. One mark per page. |

## Typography

- **Latin:** Schibsted Grotesk (variable, 400–900). Headlines 700, tight
  tracking (−0.022em), line-height 1.08.
- **Japanese:** Zen Kaku Gothic New (400/500/700/900). Headlines 700,
  line-height 1.4, slight positive tracking (+0.015em).
- Both are loaded from Google Fonts with `display=swap`; Japanese is delivered
  in unicode-range slices so only the glyphs used are downloaded.
- `html[lang="ja"]` switches the body face and a smaller heading scale
  (`--fs-h1`, `--fs-h2`, …) so Japanese never looks oversized.

### Japanese line breaking

Japanese has no spaces, so browsers break anywhere. Every heading and lead that
contains Japanese is passed through `jp()` (`src/i18n/jp.ts`), which runs
[BudouX](https://github.com/google/budoux) at build time and inserts `<wbr>` at
phrase boundaries inside a `<span class="jp">` (`word-break: keep-all;
overflow-wrap: anywhere`). No client JavaScript is involved.

## Layout

- Container `1200px` (`.wrap`), gutters 20 / 40px, 12-column grid on `lg`.
- Sections alternate paper and mist; section padding `--sec` (80 → 128px).
- Headings are left-aligned. A section opens with a short green rule, then the
  title (`.sec-head`).
- Radii: `--radius-sm` 10px (inputs), `--radius-md` 16px (sheet), `--radius-lg`
  22px (cards), `--radius-xl` 28px (photo frames, dark bands). Buttons are pills.
- Lists are **ruled**, not boxed: rows separated by the paper's green ruling
  (`.ruled`). Cards (`.card`) are reserved for navigational items and the two
  age-group panels.

## Motion

- **Hero sequence:** the paper settles (`paper`), each character is written
  with a top-to-bottom stroke (`write`), the side-line is drawn (`sideline`),
  the signature follows. The sheet then holds for about nine seconds, the ink
  fades and it is written again (`--cycle` on `.sheet`, 11s; set
  `animation-iteration-count: 1` on `.sheet .ch` and `.sheet .mark::after` to
  play once). Copy rises in (`rise`).
- **Scroll reveal** on a handful of blocks per page (`data-reveal`,
  `data-reveal-stagger`), handled by one IntersectionObserver in `BaseLayout`.
- **Steps line** draws itself when the sequence enters view (`.steps`).
- **Disclosures** (`<details class="disc">`) open with a short fade.
- Hover: link underlines thicken, button arrows nudge, card photos scale 3%.
- Everything is disabled under `prefers-reduced-motion: reduce`.

## Components

| File | Purpose |
| --- | --- |
| `BaseLayout.astro` | Document shell, fonts, skip link, reveal observer |
| `Nav.astro` | Sticky nav, language switch, full-screen mobile menu with focus trap |
| `Footer.astro` | Links, address, newsletter form (Netlify `newsletter`) |
| `Manuscript.astro` | The genkō yōshi hero sheet |
| `PageHero.astro` | Sub-page hero: title, lead, actions, facts, photo |
| `SectionHead.astro` | Rule + h2 + lead |
| `CtaBand.astro` | Dark ink band with faint ruling and one button |
| `Icon.astro` | Inline stroke icons (Lucide paths, ISC) |
| `SeoMeta.astro` | Open Graph, Twitter, canonical, hreflang, JSON-LD |

## Pages

| Route | Sections |
| --- | --- |
| `/` | Manuscript hero · Who we help · Three pillars · Shimoda case · Media · CTA |
| `/schools/` | Hero · Think/create/solve with AI · Programs (4 disclosures) · Common to every program · Journey (4 steps) · CTA |
| `/businesses/` | Hero · Point of view · What we offer · Why Waspect (founders) · CTA |
| `/kids/` | Hero with quote · Why · What children learn · Two stages · CTA |
| `/about/` | Hero (founders) · Story · Founders · Values · Company table · CTA |
| `/contact/` | Who-are-you shortcuts · Netlify form (`contact`) · address and map |

All routes exist in Japanese (default, `/`) and English (`/en/`).

## Images

Photographs live in `src/assets/photos/` and go through `astro:assets`
(`<Image>`), which emits responsive WebP `srcset`s at build time. Real
Waspect photos (Shimoda High School session, founders) are from the company's
PR TIMES release and the Newswitch feature; the rest are Pexels / Wikimedia
Commons (see the Open Design project credits). `public/images/` holds only the
logo and the Open Graph image.

## Forms

Two Netlify Forms, unchanged in name and field set so the HubSpot sync
function (`netlify/functions/hubspot-sync.mjs`) keeps working:

- `contact` — `identity`, `name`, `email`, `organization`, `role`, `message`
- `newsletter` — `email`

Both include the honeypot `bot-field` and a hidden `form-name`.
