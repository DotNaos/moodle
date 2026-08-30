---
name: moodle-clients-agent
description: Default instructions for the Moodle Client project that apply to every agent prompt.
---

## Subagents

- Use subagents proactively when a task has independent parts that can be explored, reviewed, or verified in parallel.
- Prefer subagents for UI review and visual dogfooding, codebase exploration across unrelated areas, CI failure investigation, larger diff review, alternative implementation comparison, and adjacent-flow regression checks.
- Do not use subagents when the task is tiny, strictly sequential, or the coordination overhead would be higher than the benefit.
- Give each subagent a narrow task with clear evidence to return, then synthesize the results yourself into one decision, plan, or final answer.

# Moodle Clients Agent Instructions

## Design System Enforcement

When editing, adding, or refactoring UI components and layouts, you MUST consult the [DESIGN.md](./DESIGN.md) document to ensure all styling matches the application's design system tokens, specifically regarding our strict borderless, pill-shaped inputs and buttons. Do not introduce arbitrary inline styles or borders that break these rules.

## UI Component Usage

- **DotNaos Web**: The Study Space web app uses the pinned `@dotnaos/ui`, `@dotnaos/ui-base`, and `@dotnaos/design` line. Import public web primitives from `@dotnaos/ui/base`, use `@dotnaos/design` tokens/utilities, and consult `apps/web/components/ui/README.md` before adding or changing a compatibility wrapper.
- **DotNaos Native**: Prefer supported primitives from `@dotnaos/ui/native`. `heroui-native` remains an explicit compatibility dependency for the provider, Tabs, and shared button behavior that the current DotNaos native API cannot preserve; the shared `TextField` retains React Native `TextInput` until DotNaos exposes a behavior-preserving native input.
- **Standard Library**: On native, prefer the predefined `<TextField>`, `<PrimaryButton>`, and `<SecondaryButton>` wrappers from `packages/app/src/components/ui.tsx` instead of adding raw `TextInput` or `Pressable` primitives. On web, prefer the wrappers in `apps/web/components/ui` and direct DotNaos components only where their public API preserves the required behavior and accessibility.
- **Styling**: Shared styling lives in `packages/app/src/styles.ts` using typical RN `StyleSheet.create`. Always pull from `styles.ts` when introducing new elements instead of raw hex values or arbitrary numbers.
