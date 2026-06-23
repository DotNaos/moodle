# Study Codex refinement

The study pipeline stores extracted Moodle content and Codex-improved content separately.
Machine output remains under:

- `/srv/moodle-study/courses/{courseID}/extracted`

Codex output is written to:

- `/srv/moodle-study/courses/{courseID}/improved/script`
- `/srv/moodle-study/courses/{courseID}/improved/tasks`

The web/chat path streams through the Codex app-server runner. That path is for
interactive user-facing chat and must stay separate from task-sheet curation.

The task-sheet curation path should use the Codex SDK runner. The Go service
hands the prepared Moodle artifact prompt, rendered page images, and JSON schema
to a small TypeScript process backed by `@openai/codex-sdk`; the SDK runner owns
the actual Codex turn and returns the structured curation JSON.

Each Moodle user still gets a separate Codex home directory:

- `/srv/moodle-study/codex-users/{clerkUserID}`

For local non-UI verification from the repository, the service auto-detects:

```sh
bun scripts/study-pipeline-codex-sdk-runner.ts
```

For deployed services, build the Codex runner image below. When
`MOODLE_STUDY_CODEX_DOCKER_IMAGE` is set and the repository script is not
available, Moodle Services starts the packaged SDK runner through Docker:

```sh
docker run --rm -i ... moodle-study-codex-runner:local node /opt/moodle-codex-runner/sdk-runner.mjs
```

Use `MOODLE_STUDY_CODEX_SDK_COMMAND` only when you need to override that default
command for a custom runner host.

Run the local transport self-test without calling a real model:

```sh
MOODLE_CODEX_SDK_MOCK_RESPONSE='{"ok":true}' bun scripts/study-pipeline-codex-sdk-runner.ts --self-test
bun run study:pipeline:cli self-test
```

The older Docker runner remains available for chat auth/model catalog support
and as a compatibility fallback where the SDK command is not deployed yet. Build
the runner image on the server:

```sh
docker build -t moodle-study-codex-runner:local docker/codex-runner
```

Set these environment variables for the `moodle-services` API:

```sh
MOODLE_STUDY_ARTIFACT_ROOT=/srv/moodle-study
MOODLE_STUDY_CODEX_DOCKER_IMAGE=moodle-study-codex-runner:local
```

The API container needs access to `/var/run/docker.sock`. The default
`docker-compose.yml` mounts it.

The Web UI loads model choices from `GET /api/codex/models`, which proxies the
current per-user Codex model catalog from the Docker runner. Refinement requests
must include one selected model id from that catalog. The API does not keep a
hard-coded model fallback list.

Legacy optional override for the Docker `codex exec` fallback:

```sh
MOODLE_STUDY_CODEX_CONTAINER_COMMAND='codex exec --skip-git-repo-check --sandbox read-only --model "$CODEX_MODEL" -'
```
