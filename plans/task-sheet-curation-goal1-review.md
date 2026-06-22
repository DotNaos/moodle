# Goal 1 Review: Non-UI Pipeline Verification

Course: `22584`

This document is the human review companion for:

- `plans/task-sheet-readiness-22584-goal1.json`
- `plans/task-view-22584-goal1-evidence.json`
- `plans/task-sheet-curation-goal-charter.md`

## Result

Goal 1 non-UI verification is ready for user review, but not complete until the
user explicitly accepts it.

Last refreshed from local artifacts on `2026-06-22T18:15:28Z`.

Current machine-readable status:

| Status | Count |
| --- | ---: |
| Detected task sheets | 12 |
| Ready | 4 |
| Accepted blocked | 0 |
| Unprocessed | 8 |
| Invalid | 0 |

The verifier intentionally exits with code `2` while unprocessed sheets remain.
This proves the gate is hard enough for Goal 2: the course cannot be treated as
fully complete until every real task sheet is either `ready` or accepted
`blocked`.

## Verified Non-UI Curation

`Aufgabenblatt 12` (`947753`) was promoted through the CLI from a saved Codex
curation artifact, not through frontend clicks.

The promoted sheet was rechecked through `studypipeline.LoadTaskView` against
the local artifact root and the stored course resource list.

Verified properties:

| Requirement | Evidence |
| --- | --- |
| Ready in task-view | `readiness=ready` |
| Not read-only | `readOnly=false` |
| Codex-curated output | `contentStatus=codex-improved` |
| Moodle source preserved | task markdown contains `moodle-resource:947753` |
| No raw placeholder | task-view evidence has `promptHasPlaceholder=false` |
| Image evidence used or accounted for | task-view has extracted asset image; readiness report counts 3 extracted images |
| Solution linked | `solutionResourceId=947754` |

Promoted artifact:

`/Users/oli/.moodle/study/courses/22584/improved/tasks/947753-aufgabenblatt-12.mdx`

## Remaining Sheets

These are still intentionally visible as `unprocessed` in the machine-readable
report:

| Resource | Title | Solution | Rendered pages | Extracted images |
| --- | --- | --- | ---: | ---: |
| `947729` | Aufgabenblatt 06 | `947730` | 1 | 1 |
| `947731` | Aufgabenblatt 07 | `947732` | 1 | 6 |
| `947733` | Aufgabenblatt 08 | `947734` | 1 | 16 |
| `947739` | Aufgabenblatt 09 | missing | 2 | 9 |
| `947740` | Aufgabenblatt 10 | `947741` | 2 | 103 |
| `947721` | Aufgabenblatt 04 | `947722` | 1 | 1 |
| `947723` | Aufgabenblatt 05 | `947724` | 1 | 1 |
| `947747` | Aufgabenblatt 11 | `947748` | 1 | 1 |

## Verification Commands

The current state was verified with:

```bash
bun ./scripts/study-pipeline-cli.ts self-test
bunx tsc --noEmit --module esnext --moduleResolution bundler --target es2022 --skipLibCheck --types node scripts/study-pipeline-cli.ts scripts/study-pipeline-readiness.ts scripts/study-pipeline-cli-core.ts scripts/study-pipeline-curation-promote.ts
cd services/moodle && go test ./pkg/studypipeline
bun ./scripts/study-pipeline-cli.ts readiness --course 22584 --artifact-root ~/.moodle/study --output plans/task-sheet-readiness-22584-goal1.json --raw
cd services/moodle && go run ./cmd/study-pipeline-local-evidence --course 22584 --artifact-root ~/.moodle/study --resource 947753 --readiness-report ../../plans/task-sheet-readiness-22584-goal1.json --output ../../plans/task-view-22584-goal1-evidence.json
```

The readiness command exits with code `2` for the current course state because
8 sheets are still unprocessed.

The task-view evidence command uses `studypipeline.LoadTaskView` locally and
fails if the promoted sheet is not ready, remains read-only, loses the Moodle
source link, still contains the unprocessed placeholder, or omits extracted
image evidence when extracted images exist.

## Acceptance

Goal 1 can be accepted if the user agrees that:

1. The non-UI inventory/verifier shape is sufficient.
2. The verifier is allowed to fail while unprocessed sheets remain.
3. The `Aufgabenblatt 12` promotion proves the end-to-end API/CLI path.
4. The remaining 8 sheets have enough machine-readable status for the next
   goals.

After explicit acceptance, Goal 1.5 can start.
