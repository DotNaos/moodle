#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES_DIR="$ROOT/services/moodle"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-moodle-services}"

cd "$SERVICES_DIR"
docker compose --project-name "$COMPOSE_PROJECT_NAME" -f docker-compose.dev.yml down
