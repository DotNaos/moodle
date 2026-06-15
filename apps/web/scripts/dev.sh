#!/usr/bin/env bash
# Only supported entrypoint for the web dev server.
#
# The app must always run behind portless so it is reachable at a stable
# https://moodle.localhost URL (Clerk/OAuth redirects depend on the hostname,
# not a port). `portless run --name moodle` keeps the "moodle" base name while
# automatically prefixing the branch in linked git worktrees, so several
# worktrees can run side by side without fighting over the same URL.
#
# We hand off to dev-raw.sh *inside* portless (which assigns $PORT) and pass a
# sentinel so dev-raw.sh can refuse a direct, non-portless start.
set -euo pipefail

exec env WEB_VIA_PORTLESS=1 portless run --name moodle bash "$(dirname "$0")/dev-raw.sh"
