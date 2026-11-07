#!/usr/bin/env bash
set -euo pipefail
# Fresh disposable container: never use or mount a host browser profile/trust store.
node e2e/support/tls-check.cjs reject
for database in /root/.pki/nssdb /root/.local/share/pki/nssdb; do
 mkdir -p "$database"
 if [[ ! -f "$database/cert9.db" ]]; then certutil -N --empty-password -d "sql:$database"; fi
 certutil -A -d "sql:$database" -n cf-s1c-ca -t 'C,,' -i /ca.crt
done
curl --noproxy localhost,127.0.0.1 --cacert /ca.crt --fail --silent --max-time 10 --output /dev/null https://localhost:8443/api/v1/health
node e2e/support/tls-check.cjs accept
chromium --version > /evidence/browser-version.txt
npm run test:e2e
