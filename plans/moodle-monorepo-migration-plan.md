# Moodle Monorepo Migration Plan

## Goal

Migrate the Moodle client apps and Moodle backend service into one repository
named `DotNaos/moodle`.

The current `DotNaos/moodle-clients` repository remains the base repository so
its issues, PRs, deployments, and active app history stay attached to the new
repo. The `DotNaos/moodle-services` repository does not need to be imported
with Git history. After the code has been copied, keep that repository private and
archived so its history remains available if needed.

## Current Inputs

- Main migration issue: `DotNaos/moodle-clients#151`
- Backend migration issue: `DotNaos/moodle-services#79`
- Base repository: `DotNaos/moodle-clients`
- Backend repository to copy from: `DotNaos/moodle-services`
- Target repository name: `DotNaos/moodle`

## Target Layout

```text
moodle/
  apps/
    web/
    mobile/
    extension/

  services/
    moodle/
      api/
      internal/
      pkg/
      migrations/
      public/
      go.mod
      go.sum
      Dockerfile
      docker-compose.yml
      docker-compose.dev.yml
      vercel.json

  packages/
    app/
    api-client/
    shared-types/

  docs/
  plans/
  scripts/
```

## Goal 1: Rename The Base Repo To `moodle`

Rename `DotNaos/moodle-clients` to `DotNaos/moodle`.

Work included:

- Confirm `DotNaos/moodle` is available.
- Rename `DotNaos/moodle-clients` to `DotNaos/moodle`.
- Update the local `origin` remote for the active checkout.
- Confirm GitHub redirects work for the old `moodle-clients` URL.
- Keep `moodle-clients` issues and PR history intact through the rename.

Done when:

- `DotNaos/moodle` points to the former `moodle-clients` repository.
- The local checkout pushes and fetches from the new `DotNaos/moodle` URL.
- Issue `moodle-clients#151` is still reachable through the renamed repo.

## Goal 2: Copy Moodle Services Code Into `services/moodle`

Copy the current backend code from `DotNaos/moodle-services` into
`services/moodle` in the new monorepo. Do not perform a Git-history-preserving
subtree import. The old repository will remain archived privately for history.

Work included:

- Decide the backend source commit or branch to copy.
- Resolve whether the open backend work should be included before copying.
- Copy the backend code into `services/moodle`.
- Keep the backend as its own Go module under `services/moodle`.
- Keep backend Docker files, migrations, API routes, and release config with the
  service.
- Remove or adjust files that only made sense at the old backend repo root.
- Avoid copying local worktree metadata, temporary files, logs, secrets, caches,
  or generated junk.

Done when:

- `services/moodle/go.mod` builds as its own Go module.
- `services/moodle` contains the backend API, internal packages, migrations,
  Docker files, and service docs.
- No backend secrets or local-only files were added.
- The copied backend code can run tests from inside `services/moodle`.

## Goal 3: Make One-Checkout Local Development Work

Update root scripts and helper paths so a fresh checkout can run the web app and
backend service together without depending on a sibling `../moodle-services`
folder.

Work included:

- Replace hardcoded `../moodle-services` assumptions with `services/moodle`.
- Add or update root scripts:
  - `bun run web:dev`
  - `bun run web:build`
  - `bun run services:dev`
  - `bun run services:test`
  - `bun run dev`
- Keep frontend and backend commands separate even if `bun run dev` starts both.
- Update local Docker startup and shutdown scripts.
- Update API-client generation so it can use the local backend from the
  monorepo.
- Make backend URL and internal-secret handling explicit for local development.

Done when:

- `bun run web:build` works from the repo root.
- `bun run services:test` runs backend Go tests.
- `bun run services:dev` starts the local backend Docker/dev stack.
- `bun run dev` starts the normal local development flow from one checkout.
- No script requires a sibling `moodle-services` checkout.

## Goal 4: Keep CI, Releases, And Deploys Separate But Monorepo-Aware

Move the backend checks and release/deploy workflows into the monorepo without
mixing web, mobile, extension, backend, database migrations, and VPS deploys
into one unclear command.

Work included:

- Keep frontend CI based on Bun/Turbo.
- Add backend CI that runs Go tests from `services/moodle`.
- Keep Docker image builds scoped to `services/moodle`.
- Keep VPS deploy scoped to the backend service and its migrations.
- Keep Vercel/web deploy scoped to `apps/web`.
- Update workflow paths, working directories, cache keys, and build contexts.
- Decide whether backend container image names stay as `moodle-services` for
  compatibility or move to a new `moodle` naming scheme later.

Done when:

- Frontend CI still checks web/mobile/extension as before.
- Backend CI checks the Go service from `services/moodle`.
- Docker build context points at `services/moodle`.
- Web deploy and backend deploy can be run independently.
- A failed backend deploy cannot block an unrelated web build unless the shared
  contract is broken.

## Goal 5: Archive Old Repos And Update Documentation

Make the new repo the clear source of truth, while preserving old backend
history through a private archived `moodle-services` repository.

Work included:

- Update the root README for the new `moodle` repo layout.
- Add a short backend service README under `services/moodle` if needed.
- Update docs that mention `moodle-clients` or sibling `moodle-services`.
- Update GitHub repository metadata for `DotNaos/moodle`.
- Replace the old `moodle-services` README with a migration notice.
- Make `DotNaos/moodle-services` private and archived after the copy is
  verified.
- Close or cross-link migration issues only after the final verification passes.

Done when:

- A new contributor can understand where web, mobile, extension, backend, and
  shared packages live.
- The old `moodle-services` repository clearly points to `DotNaos/moodle`.
- The old backend repository is private and archived.
- `moodle-clients#151` and `moodle-services#79` are updated with
  the final outcome.

## Verification Checklist

- `git status` is clean before starting destructive repo operations.
- `bun install --frozen-lockfile`
- `bun run web:build`
- `bun run services:test`
- `bun run services:dev`
- Local web app can talk to the local backend.
- API-client generation catches backend contract drift.
- GitHub Actions pass for frontend and backend paths.
- Vercel web deploy still targets the web app.
- Backend release/deploy still targets the backend service only.

## Open Decisions Before Starting

1. Which exact `moodle-services` branch or commit should be copied?
2. Should the current open backend PR be merged, closed, or carried over
   manually before the copy?
3. Should container image names stay compatible with `moodle-services`, or move
   to new `moodle` names in a later cleanup?
