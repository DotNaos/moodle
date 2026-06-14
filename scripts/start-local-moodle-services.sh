#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES_DIR="$ROOT/../moodle-services"
ENV_LOCAL="$ROOT/apps/web/.env.local"

if [[ ! -d "$SERVICES_DIR" ]]; then
  echo "Expected moodle-services at $SERVICES_DIR"
  exit 1
fi

cd "$SERVICES_DIR"
docker build -t moodle-study-codex-runner:local docker/codex-runner
docker compose -f docker-compose.dev.yml up -d --build

echo "Waiting for moodle-services healthcheck..."
for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:8080/healthz" >/dev/null; then
    echo "moodle-services is up at http://127.0.0.1:8080"
    break
  fi
  sleep 2
done

if ! curl -sf "http://127.0.0.1:8080/healthz" >/dev/null; then
  echo "moodle-services did not become healthy in time."
  docker compose -f docker-compose.dev.yml logs --tail=40 moodle-api
  exit 1
fi

echo "Applying local database migrations..."
docker compose -f docker-compose.dev.yml exec -T postgres sh -lc '
set -eu
for file in /docker-entrypoint-initdb.d/*.sql; do
  echo "Applying ${file}..."
  psql -v ON_ERROR_STOP=1 -U moodle -d moodle -f "${file}" >/dev/null
done
'

if [[ -f "$ENV_LOCAL" ]]; then
  python3 - <<'PY' "$ENV_LOCAL"
from pathlib import Path
import sys

path = Path(sys.argv[1])
lines = path.read_text().splitlines()
updates = {
    "MOODLE_SERVICES_URL": "http://127.0.0.1:8080",
    "MOODLE_WEB_INTERNAL_SECRET": "local-moodle-dev-internal-secret",
}

out: list[str] = []
seen: set[str] = set()
for line in lines:
    if "=" not in line or line.lstrip().startswith("#"):
        out.append(line)
        continue
    key, _ = line.split("=", 1)
    if key in updates:
        out.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        out.append(line)

for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={value}")

path.write_text("\n".join(out).rstrip() + "\n")
print(f"Updated {path} for local docker backend.")
PY
fi
