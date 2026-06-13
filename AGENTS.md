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

- **HeroUI Native**: We use `heroui-native` components wrapped in our shared `packages/app/src/components/ui.tsx`.
- **Standard Library**: Prefer using our predefined wrappers `<TextField>`, `<PrimaryButton>`, `<SecondaryButton>`, from `ui.tsx` instead of adding your own raw `TextInput` or `Pressable` primitives.
- **Styling**: Shared styling lives in `packages/app/src/styles.ts` using typical RN `StyleSheet.create`. Always pull from `styles.ts` when introducing new elements instead of raw hex values or arbitrary numbers.
