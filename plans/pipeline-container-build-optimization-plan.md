# Pipeline Container Build Optimization Plan

## Ziel

Der Moodle-Services-Deploy soll schneller und robuster werden. Aktuell haengt
der Release oft am grossen Container-Image, weil API, Pipeline-Runtime und
schwere Browser/OCR/Codex-Abhaengigkeiten im selben Build-Pfad landen koennen.

Das Ziel ist nicht nur ein kleineres Dockerfile. Das Ziel ist eine Runtime, bei
der normale API-Aenderungen schnell deploybar sind, ohne jedes Mal den schweren
Pipeline-Brocken neu zu bauen.

## Problem

Die Pipeline hat unterschiedliche Runtime-Profile:

```text
Fast path
├─ API routes
├─ auth/session handling
├─ metadata
├─ scheduling
├─ progress/status
└─ lightweight validation

Heavy path
├─ PDF rendering
├─ OCR engines
├─ Playwright/browser tooling
├─ image extraction
├─ Codex runner dependencies
└─ optional model/tool runtimes
```

Wenn diese Pfade im selben Image stecken, passiert bei kleinen API-Aenderungen
zu viel Arbeit:

```text
API code changed
    │
    ▼
Rebuild giant image
    │
    ├─ reinstall browser/runtime dependencies
    ├─ rebuild OCR/tool layers
    └─ push large image
```

Das macht Deploys langsam und sorgt dafuer, dass ein normaler Backend-Fix an
einem komplett anderen Engpass haengt.

## Zielarchitektur

Die API bleibt schlank. Schwere Pipeline-Arbeit laeuft in separaten Workern oder
Tool-Containern.

```text
                 ┌────────────────────┐
                 │ moodle-api          │
                 │ small, fast deploy  │
                 └─────────┬──────────┘
                           │ schedules jobs
                           ▼
                 ┌────────────────────┐
                 │ pipeline queue      │
                 │ postgres first      │
                 └─────────┬──────────┘
                           │ claimed by
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌────────────────┐  ┌────────────────┐
│ pdf worker    │  │ ocr worker     │  │ codex worker   │
│ render pages  │  │ extract blocks │  │ curate output  │
└───────┬───────┘  └───────┬────────┘  └───────┬────────┘
        │                  │                   │
        └──────────────────┼───────────────────┘
                           ▼
                 ┌────────────────────┐
                 │ shared artifact     │
                 │ store               │
                 └────────────────────┘
```

## Image Split

Start with two images, not five. Split further only when the data proves it is
worth it.

```text
moodle-services-api
├─ Go API binary
├─ database migrations
├─ lightweight health checks
└─ no browser/OCR payload

moodle-pipeline-worker
├─ PDF rendering
├─ OCR tools
├─ Playwright/browser tooling, if needed
├─ image processing
└─ Codex execution support
```

Later optional split:

```text
moodle-pdf-worker
moodle-ocr-worker
moodle-codex-worker
```

Only do this once queue semantics, artifact contracts, and observability are
stable.

## Runtime Contract

The API should never depend on a browser or OCR runtime being inside its own
container. It should only know how to create and inspect jobs.

```text
POST /study-pipeline/run
    │
    ▼
create job row
    │
    ▼
worker claims job
    │
    ▼
worker writes artifacts + progress
    │
    ▼
API streams status to frontend
```

The frontend does not care which container did the work. It reads:

- job status
- active step
- progress events
- artifact refs
- node errors
- final publishability

## Goal 1: Measure Current Build

Acceptance criteria:

- [ ] Record current Release duration.
- [ ] Record container-image job duration.
- [ ] Record final image size.
- [ ] Identify the largest Docker layers.
- [ ] Identify whether Playwright/browser dependencies are inside the API image.

Commands/evidence to collect:

```text
gh run view <release-run-id> --json jobs
docker image inspect ghcr.io/dotnaos/moodle-services:latest
docker history ghcr.io/dotnaos/moodle-services:latest
```

## Goal 2: Make API Image Explicitly Lightweight

Acceptance criteria:

- [ ] API image contains only what the API needs to boot, serve requests, run
      migrations, and schedule jobs.
- [ ] API image can be rebuilt after a normal Go/API change without pulling in
      browser/OCR layers.
- [ ] Existing health check still passes.
- [ ] Existing API tests still pass.

## Goal 3: Introduce Worker Image

Acceptance criteria:

- [ ] Worker image owns PDF/OCR/Codex runtime dependencies.
- [ ] Worker can run one pipeline job from the same artifact store the API uses.
- [ ] Worker writes progress and failure details back in the existing pipeline
      trace format.
- [ ] If the browser/page closes, the worker continues or fails the job
      explicitly; the backend process must not crash.

## Goal 4: Queue and Progress Semantics

Acceptance criteria:

- [ ] A user can start a whole-course run.
- [ ] A user can rerun one step.
- [ ] A user can rerun from one step onward.
- [ ] Closing the browser does not cancel the backend job.
- [ ] The pipeline page can reconnect and show the current status.
- [ ] Failed jobs show the failed node and the concrete error.

Initial queue can be Postgres-backed. Do not add Redis or Temporal until the
Postgres version is clearly insufficient.

## Goal 5: Deploy Split Runtime

Acceptance criteria:

- [ ] VPS compose has separate API and worker services.
- [ ] API deploy can happen without rebuilding the worker image.
- [ ] Worker deploy can happen without redeploying the API unless the job
      contract changed.
- [ ] Production health check verifies API.
- [ ] Production pipeline smoke test verifies worker execution.

## Success Metric

This optimization is successful when a normal API-only change no longer waits
on the heavy worker build.

Target:

```text
API-only change:
  build + push + VPS deploy <= 2-3 minutes

Worker/runtime change:
  may remain slower, but should be isolated
```

## Non-Goals

- Do not introduce a complex orchestrator just to fix build speed.
- Do not split every pipeline step into its own service immediately.
- Do not make frontend depend on worker internals.
- Do not remove accountability checks to make the pipeline appear faster.

## Open Questions

- Does Playwright need to live in the worker image at all, or can rendered
  previews be produced by the frontend/app layer?
- Should Codex execution be its own per-user worker image from the start?
- Which artifacts must be shared read-only between API and workers?
- Which run data belongs in Postgres vs artifact storage?
