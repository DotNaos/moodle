# Task Sheet Curation Goal Charter

Status: charter only. Do not treat this document as permission to start the
curation implementation goal.

## Objective

For course `22584`, all real task sheets should be curated into usable study
tasks. A task sheet does not need to be perfect, but it must be good enough for
normal practice.

The target quality bar is roughly "90% usable": readable, navigable, and
practice-ready, with smaller OCR, formatting, math, or layout issues accepted as
follow-up quality work rather than blockers.

## Core Rule

Every detected real task sheet for course `22584` must end in exactly one of
these states:

1. `ready`
   - appears in the normal practice flow
   - is not read-only
   - has a Codex-curated task output
   - preserves the Moodle source reference
   - includes important extracted visual evidence when available

2. `blocked`
   - has one accepted blocker reason from the numbered list below
   - stores that blocker reason in pipeline data
   - shows that blocker reason in the UI

The goal must not complete while a real task sheet is still merely
`unprocessed`, unless it has been explicitly moved to `blocked` using one of the
accepted blocker reasons.

## Accepted Blocker Reasons

1. **Misclassified material**
   - The material is not a task sheet, for example a solution, note, cover
     sheet, form, link, directory, or other non-task resource.
   - This must be correctable later. The system needs a path to override or fix
     classification.

2. **Duplicate or replaced task sheet**
   - The sheet is a duplicate or has been superseded by a newer version.
   - The active replacement must be visible.

3. **External or interactive task**
   - The actual task lives outside the PDF, for example in a tool, notebook,
     GitLab repository, form, or web app.
   - This is accepted for this goal only. Later this should become an import or
     connector case, not a valid blocker.

4. **Privacy or safety issue**
   - The sheet contains personal data or content that should not be
     automatically moved into the practice flow.
   - This is expected to be rare, but remains a valid safety escape hatch.

5. **Hard pipeline or Codex failure after real retries**
   - A core system component is actually broken, for example Codex is not
     reachable, the runner is broken, page rendering is broken, file attachment
     upload is broken, or a similarly hard technical failure repeats.
   - This is only valid after retrying.
   - The stored blocker must include a concrete technical reason and a useful
     error trail.
   - A first failed run, timeout, or normal quality issue is not enough.

## Not Accepted As Blockers

These must not be used to complete the goal with a task sheet still blocked or
read-only:

1. **PDF or text not accessible**
   - If Moodle can show the file, the pipeline should be able to fetch it.

2. **PDF technically awkward**
   - A hard technical failure belongs under accepted blocker reason 5. It is not
     a normal product-level blocker.

3. **Weak OCR**
   - OCR is only a helper. Codex must be able to use rendered page images as
     primary evidence and manually reconstruct the task from them.

4. **Small quality issues**
   - OCR mistakes, imperfect math formatting, awkward layout, or imperfect image
     placement are quality follow-ups, not blockers.

5. **Missing solution**
   - A missing solution should be visible in the UI, but it does not make the
     task sheet unusable.

6. **Long or complicated task**
   - Length or difficulty is not a blocker. Codex should still produce a usable
     first curated version.

## Required Acceptance Criteria

The implementation goal may only be closed after all of the following are true:

1. For course `22584`, every detected real task sheet is either `ready` or has
   an accepted `blocked` reason from the list above.

2. No real task sheet remains in plain `unprocessed` state.

3. The task overview shows the true count of ready and blocked sheets.

4. Ready sheets appear in the normal practice flow.

5. Blocked sheets stay visible, but do not enter the normal practice flow.

6. Blocked sheets show their exact numbered blocker reason in the UI.

7. The Codex curation pipeline attempts the missing sheets using rendered page
   images as source evidence. Weak OCR alone must not stop curation.

8. Accepted blocker reason 5 requires retry evidence and a concrete stored
   technical failure trail.

9. An automated verification check fails if any detected real task sheet has
   neither `ready` nor an accepted numbered blocker reason.

10. Local tests and build pass.

11. GitHub CI passes after merge.

12. The result is dogfooded visually in the course `22584` task overview and in
    multiple sheets that were previously `unprocessed`.

## Suggested Verification Command Shape

The implementation should add a test or script with this logical contract:

```text
fail if any detected real task sheet for course 22584 has:
  readiness != ready
  and blockedReason not in [1, 2, 3, 4, 5]
```

The exact command can be decided during implementation, but this check is part
of the exit gate.

## Scope Boundary

This goal should be deeply verified on course `22584`.

It does not require fully curating every task sheet in every course. For
reliability, implementation should include fixture tests and lightweight smoke
checks that prove the model is not hardcoded only to `22584`.

## Execution Plan

Do not drive the main implementation through the frontend. The frontend is for
dogfooding and final review, not for the fastest development loop.

The fastest feedback loop is:

1. Build an inventory for course `22584`.
   - list every detected task sheet
   - include current readiness
   - include linked solution status
   - include rendered page availability
   - include extracted image availability

2. Build the verifier first.
   - it may be red at the beginning
   - it fails if any real task sheet is neither `ready` nor blocked with an
     accepted numbered reason

3. Curate one currently unprocessed sheet in isolation.
   - use API or CLI, not frontend clicks
   - target one concrete `courseId` and `resourceId`
   - inspect logs and artifacts directly

4. Verify that one sheet directly through artifacts and `task-view`.
   - Codex output exists
   - `task-view` reports `ready`
   - `readOnly` is `false`
   - Moodle source reference is preserved
   - no raw placeholder remains
   - important extracted images are used or explicitly accounted for

5. Batch the remaining unprocessed sheets only after one sheet works end to end.
   - process sheets one by one or through a queue
   - persist attempt count, run id, logs, inputs, outputs, and final readiness

6. Run the verifier after each sheet or small batch.
   - the verifier should show remaining sheets, ready sheets, and blocked sheets
   - invalid blockers must fail the check

7. Use the frontend only after the data gates are green.
   - dogfood the overview
   - open multiple previously unprocessed sheets
   - confirm warnings are gone for ready sheets
   - confirm ready sheets can be practiced normally
   - confirm blocked sheets remain visible but do not enter the practice flow

## Goal Split

### Goal 1: Non-UI Pipeline Verification

Use API/CLI and direct artifact inspection to prove the curation pipeline works
without relying on frontend clicks.

Goal 1 is complete only when:

1. The inventory for course `22584` exists.
2. The verifier exists and enforces the ready-or-accepted-blocked rule.
3. At least one previously unprocessed sheet has been curated through API/CLI.
4. The curated sheet is verified through artifacts and `task-view`.
5. The remaining sheets have a clear machine-readable status.
6. The user has reviewed and accepted the non-UI result.

Do not proceed to Goal 1.5 or Goal 2 before the user explicitly accepts Goal 1.

### Goal 1.5: Codex Transport Split

Align the Codex integration with the intended runtime boundary before scaling
the pipeline across the remaining sheets.

Target architecture:

1. Web/chat uses the Codex app-server path.
   - the browser talks to the app/backend bridge, not directly to Codex
   - streaming deltas remain visible during generation
   - chat session behavior stays interactive and user-facing

2. The task-sheet pipeline uses the Codex SDK path.
   - pipeline curation and refinement run through the SDK, not shell-only
     `codex exec` command construction
   - structured output schemas remain enforced
   - rendered page images and extracted assets remain available to Codex
   - the non-UI readiness verifier remains the acceptance gate for pipeline
     output quality

Goal 1.5 is complete only when:

1. The web/chat route no longer depends on direct SDK chat execution.
2. The pipeline has a SDK-based runner for curation/refinement work.
3. Existing Goal 1 readiness checks still pass after the transport change.
4. The implementation has a clear local verification path that does not require
   frontend clicks.
5. Any remaining Codex transport limitation is documented with a concrete
   follow-up before Goal 2 starts.

### Goal 2: Full Course Completion And UI Dogfood

After Goal 1.5 is complete, finish the rest of the course and verify the user
experience.

Goal 2 is complete only when:

1. Every real task sheet in course `22584` is `ready` or has an accepted
   numbered blocker reason.
2. No real task sheet remains plain `unprocessed`.
3. The frontend overview reflects the final ready/blocked counts.
4. Multiple previously unprocessed sheets have been dogfooded visually.
5. Local tests, build, and GitHub CI pass.
