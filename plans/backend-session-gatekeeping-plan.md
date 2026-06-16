# Backend Session Gatekeeping Plan

## Problem abstraction

The app can run a local frontend against either a local Moodle Services backend or the live backend. Today that relationship is implicit: routes read `MOODLE_SERVICES_URL`, a shared internal secret, browser cookies, and old UI cache independently. When one part is wrong, the UI can still render a later Moodle screen and only fail after a user action.

The core problem is not a single `401`. The core problem is that the UI reaches private Moodle states before the required backend/session evidence has been proven.

## Bad state

Examples of bad states:

- The Moodle connect page says the FHGR credentials are wrong when the real failure is frontend/backend trust.
- A private course route shows course or pipeline UI before current access is verified.
- A pipeline run button is enabled before the backend has proven it can execute the run for the current user.
- Local development silently mixes a live backend with local-only secrets.

## Why the current approach fails

The current approach treats failed requests as local symptoms. A `401` from the backend is interpreted near the place where it happens. That is too late. The code that renders the connect form does not first prove that this frontend can talk to the configured backend. The code that opens a course can briefly rely on cached course data before the current session has been verified.

So the UI can make claims from weak evidence:

- URL implies course existence.
- Cache implies current access.
- Any `401` during connect implies bad Moodle credentials.
- A loaded page implies the backend profile is valid.

Those assumptions must be removed.

## State machine

Real states:

- `Unknown`: nothing has been checked.
- `AppUnauthenticated`: no app session exists.
- `CheckingBackend`: the frontend is checking the backend profile and health.
- `BackendBlocked(reason)`: the backend configuration or trust check failed.
- `MoodleDisconnected`: the app session is valid, but no Moodle session is connected.
- `MoodleReady(evidence)`: app session and Moodle backend session are both valid.
- `CheckingResource`: a private resource is being checked.
- `ResourceBlocked(reason)`: the resource cannot be shown.
- `ResourceReady(evidence)`: the resource is verified for this user.

Derived states:

- `ConnectFormVisible`
- `CourseVisible`
- `PipelineVisible`
- `RunButtonEnabled`

These derived states must never be defaults.

## ASCII state transition diagram

```text
Unknown
  |
  v
App session check
  |
  +-- missing -------------------------------> AppUnauthenticated
  |
  +-- present -------------------------------> CheckingBackend
                                                   |
                                                   +-- profile/health/trust failed --> BackendBlocked(reason)
                                                   |
                                                   +-- trust ok, no Moodle token ----> MoodleDisconnected
                                                   |
                                                   +-- trust ok, token valid --------> MoodleReady(evidence)
                                                                                         |
                                                                                         v
                                                                                  CheckingResource
                                                                                         |
                                                                                         +-- denied/missing --> ResourceBlocked(reason)
                                                                                         |
                                                                                         +-- verified -------> ResourceReady(evidence)
```

## Evidence objects

The UI may advance only from evidence, not from assumptions.

- `AppSessionEvidence`: Clerk user id exists in the server route.
- `BackendProfileEvidence`: backend URL has an explicit or safely inferred profile (`local`, `live`, or `custom`).
- `BackendHealthEvidence`: the configured backend responded to a health check.
- `BackendTrustEvidence`: the backend accepted the frontend's server-side trust proof for the current app user.
- `MoodleSessionEvidence`: the backend confirms that the current app user has a Moodle token.
- `ResourceAccessEvidence`: the backend confirms that the current user may see this course/resource.
- `PipelineCapabilityEvidence`: the backend confirms that this user may trigger the requested pipeline stage and scope.

## Preconditions / gates

- `ConnectFormVisible => AppSessionEvidence AND BackendProfileEvidence AND BackendHealthEvidence AND BackendTrustEvidence`
- `CourseVisible => MoodleSessionEvidence AND ResourceAccessEvidence`
- `PipelineVisible => MoodleSessionEvidence AND ResourceAccessEvidence AND PipelineGraphLoaded`
- `RunButtonEnabled => PipelineVisible AND PipelineCapabilityEvidence`
- `CredentialFailureVisible => BackendTrustEvidence AND MoodleCredentialAttemptFailed`

## Earliest allowed display

Without an app session:

- Show only sign-in.
- Do not show course names, course ids, pipeline status, or Moodle-specific counts.

With an app session but no backend trust:

- Show only a backend blocked state.
- Do not show the Moodle credential form.
- Do not blame the Moodle password.

With backend trust but no Moodle session:

- Show the Moodle connect form.
- It is now valid to submit credentials or start the bridge flow.

With Moodle session but no resource verification:

- Show checking or blocked state for the requested resource.
- Do not show the course title from URL/cache.

## Renderer rules

- Never render private Moodle content from URL, stale cache, or previous UI state.
- Cache can seed layout only after fresh access verification is in progress or passed; it must not prove access.
- Error messages must name the failed gate: app auth, backend profile, backend trust, Moodle session, resource access, or pipeline capability.
- Credential errors may only be shown after backend trust was proven for that request.

## UI invariants

- `ScreenVisible(S) => Preconditions(S)`
- `ActionEnabled(A) => Preconditions(A)`
- `PrivateDataVisible => Authenticated AND AccessVerified`
- `ResourceTitleVisible => ResourceAccessVerified`
- `PipelineGraphVisible => MoodleSessionEvidence AND CourseAccessEvidence AND GraphDataLoaded`
- `RunButtonEnabled => PipelineCapabilityEvidence`

## Proof sketch

Credential error:

```text
UI shows "Moodle login failed"
=> /api/moodle/connect returned moodle_login_failed
=> route first passed BackendTrustEvidence
=> upstream 401 came from credential login after trust was proven

Therefore impossible:
UI shows "Moodle login failed"
AND backend trust was not proven
```

Pipeline screen:

```text
PipelineVisible
=> gate state is ready
=> MoodleSessionEvidence exists
=> CourseAccessEvidence exists
=> pipeline graph data loaded

Therefore impossible:
PipelineVisible
AND current user access was never checked
```

Live/local development:

```text
BackendProfileReady
=> configured URL matches the selected/inferred profile
=> live backend is not paired with local-only trust settings

Therefore impossible:
local frontend silently uses live backend with local-only trust and then blames Moodle credentials
```

## Allowed error cases

- App session missing: show sign-in.
- Backend profile invalid: show backend blocked with the conflicting profile details.
- Backend unreachable: show backend blocked.
- Backend trust failed: show backend blocked, not Moodle login failed.
- Moodle token missing/expired: show Moodle connect.
- Resource access denied: show resource blocked without leaking private resource details.
- Pipeline capability missing: keep run action disabled and show why.

## Disallowed error cases

- Showing a course title before course access is verified.
- Showing `No courses found` before a successful empty load.
- Showing `Moodle login failed` when backend trust failed.
- Enabling a pipeline run button while backend/session/capability evidence is missing.
- Showing a later screen and explaining there that an earlier prerequisite failed.

## Consequences for code

- Centralize backend profile and trust checks in one server helper.
- Add a `/api/backend/preflight` route that returns a typed gate state.
- Make `/moodle/connect` depend on backend preflight before rendering the form.
- Make `/api/moodle/connect` verify backend trust before submitting credentials.
- Keep pipeline and course gates evidence-driven; do not use URL/cache as proof.
- Return stable error codes for gate failures.

## Consequences for tests

- Unit-test backend profile resolution for local, live, mixed, missing, and malformed settings.
- Test that Moodle credential failures require prior backend trust.
- Test that the connect form is not visible when backend trust is blocked.
- Test route guards: private screens render only after the matching ready state.

## Consequences for documentation

- Document backend profiles and which environment variables belong together.
- Document that local frontend to live backend is a supported mode only through public, user-authenticated APIs or an explicit trusted dev profile.
- Document every gate state and which UI is allowed to render from it.
