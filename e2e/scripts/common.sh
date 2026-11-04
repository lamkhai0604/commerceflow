#!/usr/bin/env bash
set -Eeuo pipefail
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
docker_cmd() {
  env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
    env -u REPO_DIR -u STATE_DIR -u RUN_ID -u BROWSER_IMAGE -u TEST_DB_PASSWORD docker --host=unix:///var/run/docker.sock "$@"
}
validate_id() { [[ "$1" =~ ^[a-z0-9][a-z0-9-]{5,60}$ ]] || { echo 'Invalid test run identifier' >&2; exit 1; }; }
compose() { docker_cmd compose -p "cf-s1c-$RUN_ID" --env-file "$STATE/env" -f "$ROOT/e2e/infra/compose.yaml" "$@"; }
