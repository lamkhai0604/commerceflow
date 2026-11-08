#!/usr/bin/env bash
source "$(dirname -- "$0")/common.sh"
RUN_ID=${1:?Supply exact owned run ID}; validate_id "$RUN_ID"
[[ ! -L "$ROOT/e2e/.state" ]] || { echo "Refusing linked state root"; exit 1; }
STATE="$ROOT/e2e/.state/$RUN_ID"
[[ ! -L "$STATE" ]] || { echo 'Refusing linked run directory'; exit 1; }
[[ -e "$STATE" ]] || { echo 'No owned run directory; nothing removed'; exit 0; }
[[ -d "$STATE" && -f "$STATE/owner" ]] || { echo 'Missing owned run marker'; exit 1; }
for entry in owner env certs evidence cleanup.log; do
 [[ ! -L "$STATE/$entry" ]] || { echo 'Refusing linked ownership/cleanup paths'; exit 1; }
done
[[ "$(cat "$STATE/owner")" == "cf-s1c-$RUN_ID" ]] || { echo 'Ownership check failed'; exit 1; }
[[ -d "$STATE/evidence" && ! -L "$STATE/evidence/cleanup.json" ]] || { echo 'Unsafe or missing evidence directory'; exit 1; }
# Never mistake a failed Docker query for an empty resource inventory. Retain
# credentials/keys and report a retryable failure until all owned resources are gone.
STAGE=DOCKER_ACCESS
complete=false
record_result() {
 status=$?
 if [[ "$complete" != true ]]; then
  printf '{"status":"FAIL","run":"%s","stage":"%s","secretsRemoved":false,"ownedInfrastructureRemoved":false}\n' "$RUN_ID" "$STAGE" > "$STATE/evidence/cleanup.json"
  echo "Owned cleanup incomplete at $STAGE; retain private state and retry this exact run" >&2
  [[ $status != 0 ]] || status=1
 fi
 trap - EXIT
 exit "$status"
}
trap record_result EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# No prune, project-name inference, external volumes, or unrelated resources.
docker_cmd info > "$STATE/cleanup.log" 2>&1
STAGE=COMPOSE_DOWN
if [[ -f "$STATE/env" ]]; then compose down --volumes --remove-orphans >> "$STATE/cleanup.log" 2>&1; fi
STAGE=CONTAINER_INVENTORY
containers=$(docker_cmd ps -aq --filter "label=com.docker.compose.project=cf-s1c-$RUN_ID" 2>> "$STATE/cleanup.log")
[[ -z "$containers" ]]
STAGE=NETWORK_INVENTORY
networks=$(docker_cmd network ls -q --filter "label=com.docker.compose.project=cf-s1c-$RUN_ID" 2>> "$STATE/cleanup.log")
[[ -z "$networks" ]]
STAGE=IMAGE_INVENTORY
image="cf-s1c-browser:$RUN_ID"
images=$(docker_cmd image ls -q --filter "reference=$image" 2>> "$STATE/cleanup.log")
if [[ -n "$images" ]]; then
 STAGE=IMAGE_OWNERSHIP
 label=$(docker_cmd image inspect --format '{{index .Config.Labels "io.commerceflow.e2e.run"}}' "$image" 2>> "$STATE/cleanup.log")
 [[ "$label" == "$RUN_ID" ]]
 STAGE=IMAGE_REMOVAL
 docker_cmd image rm "$image" >> "$STATE/cleanup.log" 2>&1
 STAGE=IMAGE_INVENTORY
 images=$(docker_cmd image ls -q --filter "reference=$image" 2>> "$STATE/cleanup.log")
 [[ -z "$images" ]]
fi
STAGE=SECRET_REMOVAL
# Browser output uses root UID inside a container. Remove only explicitly owned
# secret files with host ownership; preserve allowlisted sanitized evidence.
rm -f -- "$STATE/env" "$STATE/certs/ca.key" "$STATE/certs/server.key" "$STATE/certs/server.csr" "$STATE/certs/ca.srl" "$STATE/certs/server.ext" "$STATE/certs/ca.crt" "$STATE/certs/server.crt"
rm -rf -- "$STATE/buildx"
rmdir "$STATE/certs" 2>/dev/null || true
rm -f -- "$STATE/build.log" "$STATE/compose.log" "$STATE/cert-generation.log" "$STATE/cleanup.log" "$STATE/readiness.log"
STAGE=EVIDENCE
printf '{"status":"PASS","run":"%s","secretsRemoved":true,"ownedInfrastructureRemoved":true}\n' "$RUN_ID" > "$STATE/evidence/cleanup.json"
complete=true
echo "Owned resources cleaned; evidence=e2e/.state/$RUN_ID/evidence"
