#!/usr/bin/env bash
# One-time: create the long-lived Apple Distribution certificate and store it as GitHub secrets.
#   bash tools/setup-signing-secrets.sh
# Needs: gh logged in with access to the repo. Prints no secret values.
set -euo pipefail
REPO=Naidan504/trustchain-keyboard
W="Create distribution certificate (one-time)"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; umask 077

echo "1/4 storing a random p12 password as DIST_P12_PASSWORD"
head -c 48 /dev/urandom | base64 | tr -dc A-Za-z0-9 | head -c 32 | gh secret set DIST_P12_PASSWORD -R $REPO

echo "2/4 creating the certificate on GitHub Actions (about 1 minute)"
gh workflow run signing-cert.yml -R $REPO --ref main
sleep 8
RUN=$(gh run list -R $REPO -w "$W" -L 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN" -R $REPO --exit-status --interval 10 > /dev/null

echo "3/4 storing DIST_P12_BASE64 and DIST_CERT_ID"
gh run download "$RUN" -R $REPO -n dist-cert -D "$TMP"
base64 -w0 "$TMP/dist.p12" | gh secret set DIST_P12_BASE64 -R $REPO
gh secret set DIST_CERT_ID -R $REPO < "$TMP/cert-id.txt"

echo "4/4 deleting the downloaded files and the artifact"
for id in $(gh api "repos/$REPO/actions/runs/$RUN/artifacts" -q '.artifacts[].id'); do
  gh api -X DELETE "repos/$REPO/actions/artifacts/$id"
done
gh secret list -R $REPO | grep -E "^DIST_" | cut -f1
echo "done"
