# Observability

The mobile app is wired for Sentry error reporting and structured logs.

## Required Sentry settings

Create a Sentry React Native project, then configure these values outside the repo:

- `EXPO_PUBLIC_SENTRY_DSN`: public DSN used by the app at runtime.
- `SENTRY_AUTH_TOKEN`: Sentry token for release and source-map uploads.
- `SENTRY_ORG`: Sentry organization slug.
- `SENTRY_PROJECT`: Sentry project slug.

For GitHub/EAS iOS builds, add these as GitHub repository secrets. The release workflow forwards them to EAS. `SENTRY_ALLOW_FAILURE=true` is set in the workflow so a temporary Sentry upload problem does not block installing the app.

For local development, copy `apps/mobile/.env.example` to `apps/mobile/.env` and set only the public DSN when you want local events to be sent.

## What gets reported

- Unhandled React Native errors through `Sentry.wrap`.
- App log entries from `logDevInfo` and `logDevError` as Sentry breadcrumbs and structured logs.
- Captured handled errors, including Moodle API failures, QR exchange failures, app update failures, and Moodle WebView load/HTTP failures.
- Release tags for app version, platform, Expo channel, runtime version, update id, and update group when available.

The app does not enable `sendDefaultPii`. Moodle mobile links and token-like query parameters are scrubbed before app logs are sent.

## Testing

After setting `EXPO_PUBLIC_SENTRY_DSN`, run the app and trigger a handled error, for example by opening the Moodle browser login while the device has no internet connection. The app should show the local error, and Sentry should receive a `Moodle browser login failed` event with the WebView code/status details.

For release builds, verify the build log contains the Sentry source-map upload step. If the upload fails while Sentry secrets are still missing, the workflow should continue because `SENTRY_ALLOW_FAILURE=true` is set.

After publishing an OTA update manually, upload the generated source maps from `apps/mobile/dist`:

```sh
cd apps/mobile
eas update --channel preview --message "..."
npx @sentry/expo-upload-sourcemaps dist
```
