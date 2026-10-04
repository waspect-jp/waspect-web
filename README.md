# Waspect (和スペクト)

Marketing website for [Waspect](https://waspect.jp): AI × English education
for schools, businesses and families in Japan.

## Stack

- [Astro 6](https://astro.build) (static) + [Tailwind CSS v4](https://tailwindcss.com)
- Japanese (default, `/`) and English (`/en/`) via `src/i18n/`
- [BudouX](https://github.com/google/budoux) for build-time Japanese line breaking
- Images optimized with `astro:assets` (responsive WebP)
- Hosted on [Netlify](https://netlify.com); forms via Netlify Forms, synced to HubSpot

See [DESIGN.md](./DESIGN.md) for the design system.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

`npm run build` runs `astro check` (types) and then builds to `dist/`.

## Editing copy

All copy lives in `src/i18n/ja.ts` and `src/i18n/en.ts`, keyed identically.
Headings and leads are rendered through `jp()` so Japanese wraps at phrase
boundaries; edit the strings and the breaks follow.

## License

All rights reserved. © Waspect Inc.
