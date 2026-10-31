# Design Tokens

Tailwind v4 CSS-first tokens. Declared in `src/styles/theme.css` inside an `@theme` block. No `tailwind.config.js`.

## Breakpoints

Use Tailwind v4 defaults. **Do not override.**

| Name | Width | Tailwind | Shell behavior |
|---|---|---|---|
| Mobile | `< 768px` | base | bottom tab bar |
| Tablet | `768px – 1023px` | `md:` | icon rail |
| Desktop | `1024px – 1279px` | `lg:` | full sidebar |
| Wide | `>= 1280px` | `xl:` | full sidebar + detail panel |

## Semantic Colors

Tokens are **semantic**, not literal. Components must never use palette colors (`blue-500`, `gray-200`) directly — only semantic tokens.

```css
@theme {
  /* Surface */
  --color-surface:            oklch(100% 0 0);
  --color-surface-muted:      oklch(97% 0 0);
  --color-surface-raised:     oklch(100% 0 0);
  --color-border:             oklch(90% 0 0); /* decorative separators */
  --color-border-strong:      oklch(66% 0 0); /* 3.11:1 — interactive boundaries */

  /* Text */
  --color-text:               oklch(20% 0 0);
  --color-text-muted:         oklch(45% 0 0);
  --color-text-subtle:        oklch(54% 0 0); /* 5.06:1 on surface */
  --color-text-inverse:       oklch(98% 0 0);

  /* Brand */
  --color-primary:            oklch(55% 0.18 250);
  --color-primary-hover:      oklch(50% 0.18 250);
  --color-primary-fg:         oklch(98% 0 0);

  /* Status */
  --color-success:            oklch(65% 0.17 145);
  --color-success-fg:         oklch(98% 0 0);
  --color-warning:            oklch(75% 0.15 85);
  --color-warning-fg:         oklch(20% 0 0);
  --color-danger:             oklch(56% 0.20 25); /* 5.15:1 on surface */
  --color-danger-hover:       oklch(50% 0.20 25); /* 6.3:1 with danger-fg */
  --color-danger-fg:          oklch(98% 0 0);
  --color-info:               oklch(65% 0.15 230);
  --color-info-fg:            oklch(98% 0 0);

  /* Focus — solid, 4.88:1 on surface */
  --color-focus-ring:         oklch(55% 0.18 250);

  /* Radius */
  --radius-sm:  0.25rem;
  --radius-md:  0.5rem;
  --radius-lg:  0.75rem;
  --radius-xl:  1rem;
  --radius-full: 9999px;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */

  /* Spacing scale is Tailwind's default — do not extend unless required */

  /* Shadows */
  --shadow-sm:  0 1px 2px 0 oklch(0% 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px oklch(0% 0 0 / 0.10);
  --shadow-lg:  0 10px 15px -3px oklch(0% 0 0 / 0.10);
}
```

## Contrast Notes

The token values above are tuned to the accessibility contract at the bottom of
this file. Measured against the light surface:

| Token | Ratio | Requirement |
|---|---|---|
| `--color-text-subtle` | 5.06:1 | 4.5:1 body text |
| `--color-danger` | 5.15:1 | 4.5:1 body text |
| `--color-border-strong` | 3.11:1 | 3:1 interactive boundaries |
| `--color-focus-ring` | 4.88:1 | visible focus indicator |

Destructive buttons and badges use a solid `danger` fill with `danger-fg` text
rather than the registry's tinted variant, because the tinted text measured
below 4.5:1 in dark mode. Hover states use the solid `primary-hover` /
`danger-hover` tokens, not a translucent wash: blending toward the surface drops
text contrast below 4.5:1. `--color-border` remains a decorative separator; it
is not the only boundary that identifies a control.

## Dark Mode

**Decision:** enabled. Dark mode ships. The `.dark` block lives in `src/styles/theme.css` — see that file for the values. Every color token has a dark counterpart; non-color tokens (radius, type scale, fonts) are theme-independent. Dark contrast for the adjusted tokens: `text-subtle` 5.16:1, `danger` 6.01:1, `border-strong` 3.87:1, `focus-ring` 6.54:1.

If enabled, use Tailwind v4's `@variant dark` and re-declare the semantic tokens inside a `.dark` selector. Every token above gets a dark counterpart. Components never branch on theme — only tokens change.

If disabled, remove the `.dark` block and drop theme state from the Context matrix.

## Token Usage Rules

1. **Only semantic tokens in components.** No `bg-blue-500`, no `text-gray-700`.
2. **Semantic naming by purpose, not appearance.** `--color-danger`, not `--color-red`.
3. **State variants use tokens too.** `hover:bg-primary-hover` — not a hand-picked darker shade.
4. **Spacing uses Tailwind defaults.** `p-4`, `gap-2`, `space-y-6`. No custom spacing tokens unless a real gap appears.
5. **Radius uses tokens.** `rounded-md`, `rounded-lg`. No arbitrary `rounded-[7px]`.
6. **Focus ring is a token.** Every interactive element uses `focus-visible:ring-2 focus-visible:ring-[--color-focus-ring]`. No ad-hoc outlines.

## Font Loading

Load Inter via `@fontsource/inter` (self-hosted, no external request). JetBrains Mono only if code blocks appear — otherwise drop it to reduce bundle size.

## Accessibility Contract

- Minimum contrast: **4.5:1** for body text, **3:1** for large text and for the
  boundaries of interactive controls. Purely decorative separators are exempt.
- Focus ring must be visible on every interactive element in both themes (solid
  `focus-ring`, not a translucent wash).
- All status colors come with a non-color indicator (icon or text label) — never color alone.
- `prefers-reduced-motion` disables non-essential transitions.