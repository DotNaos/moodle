#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES_DIR="$ROOT/services/moodle"
ENV_LOCAL="$ROOT/apps/web/.env.local"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-moodle-services}"
LOCAL_SERVICES_URL="${MOODLE_SERVICES_URL:-http://127.0.0.1:8080}"
LOCAL_INTERNAL_SECRET="${MOODLE_WEB_INTERNAL_SECRET:-local-moodle-dev-internal-secret}"

if [[ ! -d "$SERVICES_DIR" ]]; then
  echo "Expected Moodle service at $SERVICES_DIR"
  exit 1
fi

cd "$SERVICES_DIR"
docker build -t moodle-study-codex-runner:local docker/codex-runner
docker compose --project-name "$COMPOSE_PROJECT_NAME" -f docker-compose.dev.yml up -d --build

echo "Waiting for local Moodle backend healthcheck..."
for _ in $(seq 1 90); do
  if curl -sf "$LOCAL_SERVICES_URL/healthz" >/dev/null; then
    echo "Local Moodle backend is up at $LOCAL_SERVICES_URL"
    break
  fi
  sleep 2
done

if ! curl -sf "$LOCAL_SERVICES_URL/healthz" >/dev/null; then
  echo "Local Moodle backend did not become healthy in time."
  docker compose --project-name "$COMPOSE_PROJECT_NAME" -f docker-compose.dev.yml logs --tail=40 moodle-api
  exit 1
fi

echo "Applying local database migrations..."
docker compose --project-name "$COMPOSE_PROJECT_NAME" -f docker-compose.dev.yml exec -T postgres sh -lc '
set -eu
for file in /docker-entrypoint-initdb.d/*.sql; do
  echo "Applying ${file}..."
  psql -v ON_ERROR_STOP=1 -U moodle -d moodle -f "${file}" >/dev/null
done
'

mkdir -p "$(dirname "$ENV_LOCAL")"
touch "$ENV_LOCAL"

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    /^[[:space:]]*#/ || $0 !~ /^[A-Za-z_][A-Za-z0-9_]*=/ {
      print
      next
    }
    {
      split($0, parts, "=")
      if (parts[1] == key) {
        print key "=" value
        updated = 1
        next
      }
      print
    }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$ENV_LOCAL" > "$tmp"
  mv "$tmp" "$ENV_LOCAL"
}

set_env_value "MOODLE_SERVICES_URL" "$LOCAL_SERVICES_URL"
set_env_value "NEXT_PUBLIC_MOODLE_SERVICES_URL" "$LOCAL_SERVICES_URL"
set_env_value "MOODLE_BACKEND_PROFILE" "local"
set_env_value "MOODLE_WEB_INTERNAL_SECRET" "$LOCAL_INTERNAL_SECRET"

echo "Updated $ENV_LOCAL for the local Moodle backend."
