# Waspect (和スペクト) Website Design System

## Brand Identity

- **Name**: Waspect (和スペクト) — blending 和 (Wa, harmony) with "Aspect"
- **Tagline**: Bridging Tradition and Innovation
- **Logo**: Bonsai tree with stylized "W" in teal/olive tones (see `public/images/logo.png`)

## Color Palette — "Navy" (Material Design 3)

### Primary (Dark Navy)


| Token               | Hex       | Usage                                   |
| ------------------- | --------- | --------------------------------------- |
| `primary`           | `#2d3142` | Main brand color, headings, CTA buttons |
| `primary-container` | `#454a5e` | Card accents, CTA sections, dark cards  |
| `on-primary`        | `#ffffff` | Text on primary backgrounds             |


### Secondary (Coral)


| Token                 | Hex       | Usage                                |
| --------------------- | --------- | ------------------------------------ |
| `secondary`           | `#e07840` | Accent buttons, hover states, energy |
| `secondary-container` | `#fcdcc8` | Badges, highlight backgrounds        |


### Tertiary (Steel Blue)


| Token                | Hex       | Usage                                  |
| -------------------- | --------- | -------------------------------------- |
| `tertiary`           | `#4f5d75` | Subtle accents, dates, supporting text |
| `tertiary-container` | `#68788e` | Dark card variants                     |


### Surface (Pure White)


| Token                      | Hex       | Usage               |
| -------------------------- | --------- | ------------------- |
| `surface`                  | `#ffffff` | Page background     |
| `surface-container-lowest` | `#ffffff` | Card backgrounds    |
| `surface-container-low`    | `#f6f6f7` | Section alternation |
| `surface-container-high`   | `#e6e7e8` | Elevated surfaces   |
| `on-surface`               | `#1a1a1e` | Body text           |
| `on-surface-variant`       | `#40424a` | Secondary text      |


## Typography

- **Font**: Manrope (all text — headlines, body, labels)
- **Weights**: 400 (regular), 500 (medium), 700 (bold)
- **Headline scale**: text-5xl to text-7xl (extrabold, tight tracking)
- **Body**: text-lg to text-xl (relaxed leading)

## Icons

- **Library**: Material Symbols Outlined (Google)
- **Settings**: FILL 0, weight 400, GRAD 0, optical size 24

## Design Motifs

- **Enso circles**: Decorative radial gradients as background accents (`.enso-bg`, `.enso-blob`)
- **Ink wash**: Subtle multi-gradient background texture (`.ink-wash`)
- **Stone surface**: Noise-textured card backgrounds (`.stone-surface`)
- **Accent gradient**: Navy-to-coral signature gradient (`.accent-gradient`)
- **Rounded corners**: `rounded-xl` through `rounded-[2.5rem]` for cards
- **Glass nav**: Fixed top nav with `backdrop-blur-xl` and `white/70` bg, scroll-aware shadow
- **Shadows**: Custom CSS variables (`--shadow-card`, `--shadow-card-hover`, `--shadow-nav`)
- **Scroll animations**: Intersection Observer reveals (`.reveal`, `.reveal-stagger`), hero entrance animations
- **Reduced motion**: Full `prefers-reduced-motion` support — all animations disabled

## Pages

1. **Home** (`/`) — Hero, Who We Help, Our Approach, Media, CTA
2. **For Schools** (`/schools`) — Hero, Challenge, Features, MEXT Alignment, Timeline, CTA
3. **For Businesses** (`/businesses`) — Hero, Quote, Offerings, Why Waspect, CTA
4. **For Parents** (`/kids`) — Hero, Why AI Literacy, What They Learn, Age Groups, Register
5. **About** (`/about`) — Hero, Our Story, Founders, Values, Company Info
6. **Contact** (`/contact`) — Sidebar info + Smart form with identity selector

## Tech Stack

- **Framework**: Astro 6 (static site generation)
- **Styling**: Tailwind CSS v4 via @tailwindcss/vite
- **Fonts**: Google Fonts (Manrope, Material Symbols Outlined)
- **Forms**: Netlify Forms (data-netlify="true" on form elements)
- **Hosting**: Netlify (see `netlify.toml` for build/deploy config, custom domain waspect.jp)
- **SEO**: Open Graph + Twitter meta via `SeoMeta.astro` component
- **CMS**: Decap CMS (future, git-based)

