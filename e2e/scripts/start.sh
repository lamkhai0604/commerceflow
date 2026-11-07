#!/usr/bin/env bash
source "$(dirname -- "$0")/common.sh"
RUN_ID=${1:?Supply a fresh run ID}; validate_id "$RUN_ID"
[[ ! -L "$ROOT/e2e/.state" ]] || { echo "Refusing linked state root"; exit 1; }
STATE="$ROOT/e2e/.state/$RUN_ID"
[[ -f "$ROOT/build/index.html" && -f "$ROOT/backend/target/backend-0.0.1-SNAPSHOT.jar" ]] || { echo 'Build frontend and backend first'; exit 1; }
docker_cmd info > /dev/null
if ! containers=$(docker_cmd ps -aq --filter "label=com.docker.compose.project=cf-s1c-$RUN_ID" 2>/dev/null); then
  echo 'Container inventory failed' >&2; exit 1
fi
[[ -z "$containers" ]] || { echo 'Project collision'; exit 1; }
if ! networks=$(docker_cmd network ls -q --filter "label=com.docker.compose.project=cf-s1c-$RUN_ID" 2>/dev/null); then
  echo 'Network inventory failed' >&2; exit 1
fi
[[ -z "$networks" ]] || { echo 'Network collision'; exit 1; }
python3 - <<'PY'
import socket
with socket.socket() as s: s.bind(('127.0.0.1',8443))
PY
umask 077
mkdir -p "$ROOT/e2e/.state"
mkdir "$STATE"
printf '%s\n' "cf-s1c-$RUN_ID" > "$STATE/owner"
mkdir "$STATE/certs" "$STATE/evidence"
# Evidence is a non-secret, container-writable directory; all secrets stay private.
chmod 777 "$STATE/evidence"
STAGE=PREPARE
failure() {
  printf '{"status":"BLOCKED","stage":"%s"}\n' "$STAGE" > "$STATE/evidence/setup.json"
  bash "$ROOT/e2e/scripts/cleanup.sh" "$RUN_ID" || true
  echo "Integration setup failed at $STAGE; sanitized evidence retained" >&2
}
trap 'status=$?; if [[ $status != 0 ]]; then failure; fi' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf 'REPO_DIR=%s\nSTATE_DIR=%s\nRUN_ID=%s\nBROWSER_IMAGE=cf-s1c-browser:%s\nTEST_DB_PASSWORD=%s\n' \
 "$ROOT" "$STATE" "$RUN_ID" "$RUN_ID" "$(openssl rand -hex 24)" > "$STATE/env"
openssl req -x509 -newkey rsa:2048 -nodes -days 2 -keyout "$STATE/certs/ca.key" -out "$STATE/certs/ca.crt" -subj '/CN=CommerceFlow disposable E2E CA' > "$STATE/cert-generation.log" 2>&1
openssl req -newkey rsa:2048 -nodes -keyout "$STATE/certs/server.key" -out "$STATE/certs/server.csr" -subj '/CN=localhost' >> "$STATE/cert-generation.log" 2>&1
printf 'subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth\n' > "$STATE/certs/server.ext"
openssl x509 -req -in "$STATE/certs/server.csr" -CA "$STATE/certs/ca.crt" -CAkey "$STATE/certs/ca.key" -CAcreateserial -days 2 -out "$STATE/certs/server.crt" -extfile "$STATE/certs/server.ext" >> "$STATE/cert-generation.log" 2>&1
STAGE=IMAGE_BUILD
args=()
if [[ -n "${CODEX_PROXY_CERT:-}" ]]; then args+=(--secret "id=proxy_ca,src=$CODEX_PROXY_CERT"); fi
BUILDX_CONFIG="$STATE/buildx" docker_cmd build "${args[@]}" --label "io.commerceflow.e2e.run=$RUN_ID" -t "cf-s1c-browser:$RUN_ID" -f "$ROOT/e2e/infra/Dockerfile.browser" "$ROOT/e2e/infra" > "$STATE/build.log" 2>&1
STAGE=COMPOSE
compose config --quiet
compose up -d postgres backend caddy > "$STATE/compose.log" 2>&1
STAGE=HTTPS_READINESS
# Probe in the same namespace as Chromium. A nested Docker executor cannot
# necessarily reach the daemon host's 127.0.0.1 publication from its own loopback.
compose run --rm --no-deps --entrypoint bash browser -c '
  for ((attempt=0; attempt<90; attempt++)); do
    if curl --noproxy localhost,127.0.0.1 --cacert /ca.crt --fail --silent --max-time 3 --output /dev/null https://localhost:8443/api/v1/health; then exit 0; fi
    sleep 1
  done
  exit 1
' > "$STATE/readiness.log" 2>&1
STAGE=EVIDENCE
for image in postgres:17 caddy:2-alpine eclipse-temurin:21-jre "cf-s1c-browser:$RUN_ID"; do
 docker_cmd image inspect --format '{{json .RepoTags}} {{json .RepoDigests}} {{.Id}}' "$image"
done > "$STATE/evidence/images.txt"
printf '{"status":"PASS","sha":"%s","run":"%s","origin":"https://localhost:8443"}\n' "$(git -C "$ROOT" rev-parse HEAD)" "$RUN_ID" > "$STATE/evidence/setup.json"
trap - EXIT INT TERM
echo "HTTPS ready; run=$RUN_ID"
