#!/usr/bin/env bash
source "$(dirname -- "$0")/common.sh"
RUN_ID=${1:?Supply exact owned run ID}; validate_id "$RUN_ID"
[[ ! -L "$ROOT/e2e/.state" ]] || { echo "Refusing linked state root"; exit 1; }
STATE="$ROOT/e2e/.state/$RUN_ID"
[[ -d "$STATE" && ! -L "$STATE" && -f "$STATE/owner" ]] || { echo 'No owned run directory; nothing removed'; exit 0; }
[[ ! -L "$STATE/owner" && ! -L "$STATE/env" && ! -L "$STATE/certs" ]] || { echo "Refusing linked ownership/secret files"; exit 1; }
[[ "$(cat "$STATE/owner")" == "cf-s1c-$RUN_ID" ]] || { echo 'Ownership check failed'; exit 1; }
# No prune, project-name inference, external volumes, or unrelated resources.
if [[ -f "$STATE/env" ]]; then compose down --volumes --remove-orphans > "$STATE/cleanup.log" 2>&1; fi
image="cf-s1c-browser:$RUN_ID"
if docker_cmd image inspect "$image" > /dev/null 2>&1; then
 [[ "$(docker_cmd image inspect --format '{{index .Config.Labels "io.commerceflow.e2e.run"}}' "$image")" == "$RUN_ID" ]] || exit 1
 docker_cmd image rm "$image" >> "$STATE/cleanup.log" 2>&1
fi
[[ -z "$(docker_cmd ps -aq --filter "label=com.docker.compose.project=cf-s1c-$RUN_ID")" ]]
[[ -z "$(docker_cmd network ls -q --filter "label=com.docker.compose.project=cf-s1c-$RUN_ID")" ]]
# Browser output uses root UID inside a container. Remove only explicitly owned
# secret files with host ownership; preserve allowlisted sanitized evidence.
rm -f -- "$STATE/env" "$STATE/certs/ca.key" "$STATE/certs/server.key" "$STATE/certs/server.csr" "$STATE/certs/ca.srl" "$STATE/certs/server.ext" "$STATE/certs/ca.crt" "$STATE/certs/server.crt"
rm -rf -- "$STATE/buildx"
rmdir "$STATE/certs" 2>/dev/null || true
rm -f -- "$STATE/build.log" "$STATE/compose.log" "$STATE/cert-generation.log" "$STATE/cleanup.log" "$STATE/readiness.log"
printf '{"status":"PASS","run":"%s","secretsRemoved":true,"ownedInfrastructureRemoved":true}\n' "$RUN_ID" > "$STATE/evidence/cleanup.json"
echo "Owned resources cleaned; evidence=e2e/.state/$RUN_ID/evidence"
