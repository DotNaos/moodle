#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

bash "$ROOT/scripts/start-local-moodle-services.sh"

exec bash "$ROOT/scripts/web-local-dev.sh" turbo
