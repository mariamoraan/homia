---
name: homia-icons
description: >-
  Conventions for UI icons in Homia. Use when adding or changing icons, reactions,
  tags, chrome buttons, or any visual symbol in the app. Enforces Lucide-only icons
  via @/presentation/icons.
---

# Homia icons

## Rules

1. **Only Lucide React.** No other icon packs, no inline SVG, no emoji characters in UI or copy.
2. **Import only from** `@/presentation/icons`. Never import from `lucide-react` in components.
3. **Brand exception:** PWA / header / onboarding mark PNGs under `public/icons/` (e.g. `/icons/icon-192.png`) stay as raster assets. Do not replace them with Lucide.

## Add a chrome icon

1. Pick the Lucide component name.
2. Import it in [`src/presentation/icons/index.ts`](src/presentation/icons/index.ts) and re-export it.
3. In the component:

```tsx
import { Check } from '@/presentation/icons'

<button type="button" aria-label={es.markDone}>
  <Check size={16} strokeWidth={2} />
</button>
```

## Add or change a reaction / tag

Reaction IDs are **stable slugs** (e.g. `shopping`), not emojis. Persisted in localStorage / Firebase.

1. Add `[slug, 'Label']` to `TAG_CATALOG` in [`src/domain/catalog/TagCatalog.ts`](src/domain/catalog/TagCatalog.ts).
2. Update `QUICK_REACTIONS` / `QUICK_STARTS` / `HASHTAG_TO_REACTION` if needed.
3. Map slug → Lucide in `REACTION_ICONS` inside `reactionIcons.ts` (re-exported from `icons/index.ts`).
4. Render with `<ReactionIcon id={slug} size={16} />`.
5. Legacy emoji IDs (if any old data) go in `LEGACY_EMOJI_TO_REACTION`; `normalizeTask` migrates on load.

## Do not

- Put emoji in `es.ts`, toasts, or JSX text.
- Import `lucide-react` outside `presentation/icons`.
- Hand-draw `<svg>` paths for UI chrome.
- Change reaction slug meaning without migrating stored data.
