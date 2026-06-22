#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-web}"

LOCAL_SERVICES_URL="${MOODLE_SERVICES_URL:-http://127.0.0.1:8080}"
LOCAL_BACKEND_PROFILE="${MOODLE_BACKEND_PROFILE:-local}"
LOCAL_INTERNAL_SECRET="${MOODLE_WEB_INTERNAL_SECRET:-local-moodle-dev-internal-secret}"

case "$MODE" in
  web)
    exec node "$ROOT/scripts/with-op-env.cjs" env \
      "MOODLE_SERVICES_URL=$LOCAL_SERVICES_URL" \
      "NEXT_PUBLIC_MOODLE_SERVICES_URL=$LOCAL_SERVICES_URL" \
      "MOODLE_BACKEND_PROFILE=$LOCAL_BACKEND_PROFILE" \
      "MOODLE_WEB_INTERNAL_SECRET=$LOCAL_INTERNAL_SECRET" \
      bun run --filter @moodle-clients/web dev
    ;;
  turbo)
    exec node "$ROOT/scripts/with-op-env.cjs" env \
      "MOODLE_SERVICES_URL=$LOCAL_SERVICES_URL" \
      "NEXT_PUBLIC_MOODLE_SERVICES_URL=$LOCAL_SERVICES_URL" \
      "MOODLE_BACKEND_PROFILE=$LOCAL_BACKEND_PROFILE" \
      "MOODLE_WEB_INTERNAL_SECRET=$LOCAL_INTERNAL_SECRET" \
      turbo run dev --parallel
    ;;
  *)
    echo "Usage: $0 [web|turbo]" >&2
    exit 64
    ;;
esac
