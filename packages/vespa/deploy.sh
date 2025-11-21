#!/bin/bash

# Deploy Vespa application package
# Usage: ./deploy.sh [vespa-host] [vespa-port]

set -e

VESPA_HOST="${1:-localhost}"
VESPA_PORT="${2:-19071}"
APP_DIR="${APP_DIR:-./packages/vespa/application}"

echo "Deploying Vespa application to ${VESPA_HOST}:${VESPA_PORT}"

echo "Waiting for Vespa to be healthy..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -sf "http://${VESPA_HOST}:${VESPA_PORT}/state/v1/health" > /dev/null 2>&1; then
    echo "Vespa is healthy"
    break
  fi
  
  attempt=$((attempt + 1))
  echo "   Attempt $attempt/$max_attempts..."
  sleep 5
done

if [ $attempt -eq $max_attempts ]; then
  echo "Timeout waiting for Vespa to become healthy"
  exit 1
fi

# Create application zip
echo "Creating application package..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR_FULL="$SCRIPT_DIR/application"
if [ ! -d "$APP_DIR_FULL" ]; then
  echo "Application directory not found at $APP_DIR_FULL"
  exit 1
fi
TEMP_DIR=$(mktemp -d)
# Copy contents of application directory directly to temp dir (not the directory itself)
cp -r "$APP_DIR_FULL"/* "$TEMP_DIR/"
cd "$TEMP_DIR"
# Create zip with files at root level
zip -r openplane-app.zip . -x "*.DS_Store" > /dev/null

# Deploy to Vespa
echo "Deploying application..."
DEPLOY_URL="http://${VESPA_HOST}:${VESPA_PORT}/application/v2/tenant/default/prepareandactivate"
DEPLOY_RESPONSE=$(curl -s \
  --header "Content-Type:application/zip" \
  --data-binary @openplane-app.zip \
  --write-out "\nHTTP_STATUS:%{http_code}" \
  "$DEPLOY_URL" 2>&1)

HTTP_STATUS=$(echo "$DEPLOY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$DEPLOY_RESPONSE" | grep -v "HTTP_STATUS")

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "Application deployed successfully (HTTP $HTTP_STATUS)"
  echo "$RESPONSE_BODY" | head -10
else
  echo "Application deployment failed (HTTP $HTTP_STATUS):"
  echo "$RESPONSE_BODY"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo "Vespa deployment complete"

