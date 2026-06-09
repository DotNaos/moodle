#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICES_DIR="$ROOT/../moodle-services"

cd "$SERVICES_DIR"
docker compose -f docker-compose.dev.yml down
