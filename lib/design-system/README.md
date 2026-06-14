# Furnish AI Design System Foundation

This layer standardizes visual behavior without redesigning product structure.

## 1) Token Architecture

### Source of truth
- CSS variables in `app/globals.css` under `Design System Foundation Tokens`
- Type-safe mirrors in `lib/design-system/tokens.ts`

### Token groups
- Spacing: `--ds-space-*`
- Typography: `--ds-text-*`
- Radius: `--ds-radius-*`
- Borders: `--ds-border-*`
- Shadows: `--ds-shadow-*`
- Motion timing/ease: `--ds-duration-*`, `--ds-ease-premium`

## 2) Shared UI Primitives

- `app/components/ui/Button.tsx`
- `app/components/ui/Card.tsx`
- `app/components/ui/Section.tsx`
- `app/components/ui/cn.ts`

These primitives encapsulate spacing, radius, border, shadow, and interaction patterns.

## 3) Reusable Utility Patterns

Global utility classes:
- `ds-section`, `ds-section-shell`
- `ds-card`, `ds-card-muted`
- `ds-input`
- `ds-chip`
- `ds-btn`, `ds-btn-primary`, `ds-btn-secondary`, `ds-btn-ghost`

## 4) Unified Scales

### Spacing
Use only token spacing values in new work:
- 4, 8, 12, 16, 20, 24, 32, 40, 48px equivalents via `--ds-space-*`

### Typography
Use system hierarchy:
- Label: uppercase metadata
- Body small/body
- Heading sm/md/lg

### Radius
Use tokenized radii only:
- sm/md/lg/xl/pill

### Shadow
Use tokenized shadows only:
- subtle/card/floating

## 5) Shared Motion System

- Continue using `app/components/motion/presets.ts`
- Align component transitions with `--ds-duration-*`
- Keep micro interactions <= 220ms
- Keep reveal transitions <= 360ms

## 6) Refactoring Recommendations (Phased)

1. Replace repeated ad-hoc button classes with `Button` primitive.
2. Replace repeated panel wrappers with `Card` primitive.
3. Gradually map `home-*` blocks in `globals.css` to `ds-*` utilities.
4. Consolidate repeated focus ring styles into `ds-input` and button classes.
5. Move one-off section width/padding to `Section` primitive over time.

## 7) Cleanup Recommendations for Duplicated Styles

1. Remove duplicate rounded border + shadow combinations after migration.
2. Remove repeated `text-[11px] uppercase tracking-wide` blocks; use label token classes.
3. Replace repeated chip and pill classes with `ds-chip`.
4. Normalize all card borders to `--ds-border-subtle`.
5. Remove component-local transition durations that conflict with design tokens.

## 8) Migration Guardrails

- Do not change page structure.
- Do not alter information architecture.
- Prefer class replacement over markup rewrites.
- Keep motion subtle and meaning-driven.
