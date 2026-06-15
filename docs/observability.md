# Observability

The mobile app is wired for Sentry error reporting and structured logs.

## Study pipeline request tracing

The study pipeline spans the web frontend, the Next.js proxy, and Moodle Services. Every proxied study-pipeline request must carry an `X-Request-ID` header. For user-triggered pipeline runs, the UI creates this id before the request starts. The same id is returned to the browser and forwarded to Moodle Services.

Use the request id as the primary debugging key:

```sh
bun run study:pipeline:logs <request-id>
```

The command reads the local web tmux pane and the Moodle Services Docker logs. For manual filtering:

```sh
tmux capture-pane -pt moodle-web-dev -S -800 | rg '<request-id>|study_pipeline\.proxy'
docker logs moodle-services-moodle-api-1 2>&1 | rg '<request-id>|study_pipeline\.'
```

The Next.js proxy logs one structured JSON line for every non-GET study-pipeline request and for every upstream error. Moodle Services logs structured JSON events around long-running pipeline plans:

- `study_pipeline.request.start`
- `study_pipeline.plan.start`
- `study_pipeline.plan.step.start`
- `study_pipeline.plan.step.succeeded`
- `study_pipeline.plan.step.failed`
- `study_pipeline.plan.step.record_failed`
- `study_pipeline.plan.finish`
- `study_pipeline.request.finish`

The logs must include enough fields to answer where a run is stuck: `request_id`, `course_id`, `stage`, `step_index`, `engine`, `duration_ms`, `run_id`, and a bounded `error` string when something fails.

Do not log credentials, cookies, Moodle tokens, request bodies, extracted task content, PDF text, or generated answers. Log ids, status, stage, timings, and short error summaries only.

### Long-running requests

Pipeline runs can take longer than the proxy wait window. A proxy timeout is not the same as a failed backend run.

When the proxy hits the Node/Undici header timeout, it returns:

- HTTP `504`
- `code: upstream_headers_timeout`
- the `requestId`

The UI should keep the run understandable: show the request id, refresh pipeline state, and rely on `/runs` plus the backend plan logs to determine whether the server finished, failed, or is still running.

## Required Sentry settings

Create a Sentry React Native project, then configure these values outside the repo:

- `EXPO_PUBLIC_SENTRY_DSN`: public DSN used by the app at runtime.
- `SENTRY_AUTH_TOKEN`: Sentry token for release/source-map uploads and smoke-test verification.
- `SENTRY_ORG`: Sentry organization slug.
- `SENTRY_PROJECT`: Sentry project slug.
- `SENTRY_PROJECT_ID`: numeric Sentry project id for log smoke-test verification.
- `SENTRY_URL`: Sentry region URL. Use `https://de.sentry.io` for the current `oliver-schuetz` organization.

For GitHub/EAS iOS builds, add these as GitHub repository secrets. The release workflow forwards them to EAS. `SENTRY_ALLOW_FAILURE=true` is set in the workflow so a temporary Sentry upload problem does not block installing the app.

For local development, copy `apps/mobile/.env.example` to `apps/mobile/.env` and set only the public DSN when you want local events to be sent.

## What gets reported

- Unhandled React Native errors through `Sentry.wrap`.
- App log entries from `logDevInfo` and `logDevError` as Sentry breadcrumbs and structured logs.
- Captured handled errors, including Moodle API failures, QR exchange failures, app update failures, and Moodle WebView load/HTTP failures.
- Release tags for app version, platform, Expo channel, runtime version, update id, and update group when available.

The app does not enable `sendDefaultPii`. Moodle mobile links and token-like query parameters are scrubbed before app logs are sent.

## Testing

Before trusting a DSN, run the smoke test from the repo root:

```sh
SENTRY_AUTH_TOKEN=... bun run mobile:sentry:smoke
```

Use a Sentry token with `org:read`, `project:read`, and `event:read`. The test sends one handled error and one info-level app log event, then fails unless both can be read back from Sentry. It also sends a raw structured-log envelope and reports whether Sentry Logs indexed it, but the pass/fail signal uses the visible Sentry events because Sentry Logs may be unavailable for the project.

After setting `EXPO_PUBLIC_SENTRY_DSN`, run the app and trigger a handled error, for example by opening the Moodle browser login while the device has no internet connection. The app should show the local error, and Sentry should receive a `Moodle browser login failed` event with the WebView code/status details.

For release builds, verify the build log contains the Sentry source-map upload step. If the upload fails while Sentry secrets are still missing, the workflow should continue because `SENTRY_ALLOW_FAILURE=true` is set.

After publishing an OTA update manually, upload the generated source maps from `apps/mobile/dist`:

```sh
cd apps/mobile
eas update --channel preview --message "..."
npx @sentry/expo-upload-sourcemaps dist
```
