#!/usr/bin/env bash
source "$(dirname -- "$0")/common.sh"
RUN_ID=${1:-local-$(date +%s)-$(openssl rand -hex 3)}; validate_id "$RUN_ID"
STATE="$ROOT/e2e/.state/$RUN_ID"
bash "$ROOT/e2e/scripts/start.sh" "$RUN_ID"
finish() {
  status=$?
  trap - EXIT
  if ! bash "$ROOT/e2e/scripts/cleanup.sh" "$RUN_ID"; then status=1; fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
compose run --rm browser
