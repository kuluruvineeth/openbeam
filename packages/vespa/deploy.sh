#!/bin/sh

set -e

VESPA_HOST="${1:-localhost}"
VESPA_PORT="${2:-19071}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/application"

if [ ! -d "$APP_DIR" ]; then
  echo "Application directory not found: $APP_DIR"
  exit 1
fi

echo "Waiting for Vespa..."
for i in $(seq 1 60); do
  if curl -sf "http://${VESPA_HOST}:${VESPA_PORT}/state/v1/health" > /dev/null 2>&1; then
    break
  fi
  [ $i -eq 60 ] && echo "Timeout" && exit 1
  sleep 5
done

TEMP_DIR=$(mktemp -d)
cp -r "$APP_DIR"/* "$TEMP_DIR/"
cd "$TEMP_DIR"
zip -r app.zip . -x "*.DS_Store" > /dev/null

RESPONSE=$(curl -s \
  --header "Content-Type:application/zip" \
  --data-binary @app.zip \
  --write-out "\n%{http_code}" \
  "http://${VESPA_HOST}:${VESPA_PORT}/application/v2/tenant/default/prepareandactivate" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

rm -rf "$TEMP_DIR"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "Deployed successfully"
else
  echo "Deployment failed (HTTP $HTTP_CODE):"
  echo "$BODY"
  exit 1
fi
