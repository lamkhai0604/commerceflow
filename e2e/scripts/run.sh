#!/usr/bin/env bash
source "$(dirname -- "$0")/common.sh"
RUN_ID=${1:-local-$(date +%s)-$(openssl rand -hex 3)}; validate_id "$RUN_ID"
STATE="$ROOT/e2e/.state/$RUN_ID"
bash "$ROOT/e2e/scripts/start.sh" "$RUN_ID"
trap 'bash "$ROOT/e2e/scripts/cleanup.sh" "$RUN_ID"' EXIT
compose run --rm browser
