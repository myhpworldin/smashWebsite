# Design system mapping — Stage 3, Phase 1

What the designer has actually supplied, what's still pending, and exactly where each approved value will slot into the code once it exists. No visual value in this project is final (§5 of the phase brief) — this file exists so replacing a placeholder is a one-line token edit, never a component rewrite.

## Pending designer input

**Nothing has been supplied yet.** Audited: no Figma file, export, or design-token file exists anywhere in the project or its sibling folders referenced in `ARCHITECTURE.md`. No brand colors, typeface, spacing scale, icon set, or logo asset exist. This is stated plainly rather than worked around, per phase brief §5: "do not invent final visual values when the designer has not supplied them."

| Design system item | Status | Where it lands when approved |
|---|---|---|
| Typography (typeface, scale) | Pending | `--font-sans`, `--font-size-*` in `src/app/globals.css` |
| Colors | Pending | `--color-*` in `src/app/globals.css` |
| Spacing | Pending | `--space-*` in `src/app/globals.css` |
| Buttons | Pending | `.primary`/`.secondary`/`.ghost`/`.link` in `src/components/ui/Button.module.css` |
| Cards | Pending | `src/components/content/Card.module.css`, `TestimonialCard.module.css`, `MetricCard.module.css` |
| Navigation | Pending (labels only are set, from the approved sitemap — not visual treatment) | `src/components/layout/Header.module.css` |
| Footer | Pending | `src/components/layout/Footer.module.css` |
| Form fields | Pending | `src/components/content/FormField.module.css` |
| Icons | Pending — no icon set chosen, no icon component exists yet | Not started; `TitledItem.icon` (backend) is currently an opaque string with no rendering decided |
| Grid / breakpoints | **Set** — required QA widths only (1440/1366/1024/768/430/390/360), not a visual grid | `src/lib/breakpoints.ts`, media queries in each `.module.css` |
| Animation guidelines | Pending — no motion spec exists | Nothing beyond a `prefers-reduced-motion`-respecting skeleton pulse exists; see `FRONTEND_ARCHITECTURE.md` §12 |
| Logo | Pending — no asset | `Header`/`Footer` currently render the plain text "SMASH" |

## Temporary technical abstraction (what exists instead)

Every visual placeholder lives in exactly one place: `src/app/globals.css`'s `:root` block. It is explicitly commented as placeholder data. No component file contains a literal color, font size, or spacing value — every one references a `var(--token-name)`. This means the entire visual identity of the site can change by editing one file, with zero component code changes, the moment real values are approved. This is the "temporary technical abstraction that can later accept the designer's approved value without requiring architectural restructuring" the phase brief asks for (§5).

## Design → code naming correspondence

See `COMPONENT_GUIDE.md` §"Design system → code naming" for the full table (Button, Service Card, Case Study Card, Testimonial, Metric, Hero, CTA block, Navigation, Footer, Form field) — names were chosen to match the developer brief's own component list exactly, so no renaming pass will be needed once a Figma file exists.

## Process once real design values arrive

1. Replace the placeholder values in `src/app/globals.css` — colors, font stack/sizes, spacing scale, radii.
2. Update each component's `.module.css` only if a variant genuinely doesn't exist yet in the token set (e.g. a new button variant) — never by hardcoding a value that bypasses the tokens.
3. Add real assets (logo, icons, fonts) under a new `public/` directory (doesn't exist yet) or as a font-loading strategy in `layout.tsx` (currently the system font stack, `--font-sans`).
4. Re-run the full verification (`npm run typecheck && npm run lint && npm test && npm run build`) — a token-only change should never break typecheck, lint, or tests, since components never depend on a token's specific value.
5. Do live design QA against the actual rendered pages, per the joint workflow's designer-review step (phase brief §33) — component-level, not page-wide rewrites, is the point of this architecture.

## What this phase deliberately did not decide

Font choice, exact color values, exact spacing scale numbers, icon set, logo, and every animation trigger/duration/easing — all of these require the designer's actual input and are not guessed here.
