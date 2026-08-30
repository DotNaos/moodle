# Study Space web UI seam

Study Space is pinned to the published DotNaos `0.0.18` line:

- `@dotnaos/ui` supplies public web components through `@dotnaos/ui/base`.
- `@dotnaos/ui-base` is the underlying primitive/runtime package.
- `@dotnaos/design` owns tokens, theme CSS, Tailwind mappings, and `cn`.

The modules in this directory are compatibility wrappers, not a local shadcn layer. They preserve the existing Study Space call-site contracts with semantic DOM, use DotNaos primitives where their public API and React peer boundary fit, and consume DotNaos design tokens. There is no `components.json` generator configuration and no app-local token palette.

## CSS contract

Keep the imports in `app/globals.css` in this order: Tailwind and animation support, DotNaos design tokens/theme/styles, DotNaos UI styles, third-party component CSS, then the DotNaos Tailwind theme mapping. The temporary `@source` entry for `@dotnaos/ui-base/dist` is required by [DotNaos UI issue #80](https://github.com/DotNaos/ui/issues/80); remove it only after a published release includes the base utility selectors and a production CSS check passes without it.

Neutral legacy `accent` states map to `control-hover`; `accent` is reserved for primary or selected state. Inputs, buttons, selects, menus, and dialogs remain borderless, and actions/inputs remain fully rounded.

## Published API gaps

The following Radix behavior is deliberately retained behind these wrappers until the published DotNaos API can preserve the same semantics:

- `button.tsx`: `asChild` link/button composition and arbitrary children ([DotNaos UI #114](https://github.com/DotNaos/ui/issues/114)).
- `input.tsx`: standard DOM events/attributes, an `HTMLInputElement` ref, and caller classes ([DotNaos UI #114](https://github.com/DotNaos/ui/issues/114)).
- `badge.tsx`: compact arbitrary content that the published label-only `Chip` cannot render ([DotNaos UI #121](https://github.com/DotNaos/ui/issues/121)).
- `card.tsx`: HTML refs and caller classes; its regions align with the existing scoped composition direction ([DotNaos UI #114](https://github.com/DotNaos/ui/issues/114), [#54](https://github.com/DotNaos/ui/issues/54)).
- `checkbox.tsx`: indeterminate state and externally supplied accessible names ([DotNaos UI #115](https://github.com/DotNaos/ui/issues/115)).
- `dialog.tsx`: controlled focus-managed dialogs with arbitrary content and triggers; published region structure is tracked separately ([DotNaos UI #116](https://github.com/DotNaos/ui/issues/116), [#54](https://github.com/DotNaos/ui/issues/54)).
- `dropdown-menu.tsx`: rich menu items, checkbox/radio items, submenus, and shortcuts ([DotNaos UI #117](https://github.com/DotNaos/ui/issues/117)).
- `select.tsx`: grouped and rich option content ([DotNaos UI #120](https://github.com/DotNaos/ui/issues/120)).
- `spinner.tsx`: decorative loading indicators that must not add a second live-region announcement ([DotNaos UI #118](https://github.com/DotNaos/ui/issues/118)).
- `tooltip.tsx`: arbitrary focusable triggers and portal positioning ([DotNaos UI #119](https://github.com/DotNaos/ui/issues/119)).

Do not use those gaps as precedent for new local primitives. Prefer a public DotNaos component when it meets the interaction, accessibility, and responsive requirements. When it does not, extend the existing seam, link a focused upstream issue, and add a regression check before replacing behavior.
