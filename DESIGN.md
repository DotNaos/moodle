# Design System

A record of the foundational design decisions, UI rules, and component styles to be used by all contributors and AI agents across the Moodle Clients project. This ensures a cohesive UI look and feel across platforms.

## 1. Core Principles

- **Minimal & High Contrast:** Emphasize critical user paths by removing unnecessary borders and layout containers. Use pronounced contrast and negative space.
- **Cross-platform Compatibility:** Our unified UI targets both Expo React Native and Web.
- **Token Ownership:** Web color, spacing, typography, and motion values come from `@dotnaos/design`. Native code should use the shared palette/styles or DotNaos native tokens instead of introducing one-off values.

## 2. Shapes & Layouts

- **Pill-shaped Actions & Inputs:** All buttons, input fields, and search bars use a fully-rounded pill shape (`borderRadius: 9999`).
- **Borderless Interfaces:** Primary actionable elements like inputs and buttons (`PrimaryButton`, `SecondaryButton`, `GhostButton`, `<TextField>`) are strictly borderless (`borderWidth: 0`, `borderColor: "transparent"`).
- **Overlays / Modals:** Modals and Pop-ups do not have borders (`borderWidth: 0`). They use dark high-contrast backgrounds (e.g., `#18181A` on top of a dark overlay) and drop shadows to establish elevation without requiring thick line borders.

## 3. Typography & Text

- **No Wrapping in Containers:** Buttons and distinct UI inputs must not wrap text. Enforce `numberOfLines={1}` in React Native on `<Button.Label>` elements, and `whiteSpace: "nowrap"` in web styles.
- **Hierarchical Weight:** Let font sizes and weights dictate importance rather than container bounding boxes.

## 4. Components

- **Web UI:** Use the pinned DotNaos line through `@dotnaos/ui/base` and the compatibility wrappers in `apps/web/components/ui`. Neutral hover/focus surfaces use `control`, `control-hover`, and `control-active`; reserve `accent` for selected or primary actions. Do not restore a shadcn generator layer or duplicate the design token palette in app CSS.
- **Native UI:** Use supported `@dotnaos/ui/native` primitives first. The shared wrappers may retain HeroUI for provider, Tabs, and button capabilities that do not yet have behavior-preserving DotNaos equivalents; `TextField` retains React Native `TextInput` until DotNaos exposes a compatible native input.
- **Inputs (`TextField`):** Native fields use the shared wrapper and `styles.input`; web fields use the DotNaos-backed compatibility wrapper. Both must retain the pill-shaped, borderless treatment.
- **Buttons (`AppButton` wrappers):** Primary, Secondary, and Ghost versions abstract away manual styling and default to strict pill shapes. Platform compatibility wrappers may preserve the existing public call-site API while their rendered surface and tokens come from DotNaos.
- **Dividers:** Use visual dividers (e.g. `--- or ---` with 1px low opacity lines) instead of bounding boxes to separate disparate elements vertically.
