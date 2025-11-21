#!/bin/bash

# Deploy Vespa application package
# This script waits for Vespa to be healthy and then deploys the application

set -e

VESPA_HOST="${VESPA_HOST:-localhost}"
VESPA_CONFIG_PORT="${VESPA_CONFIG_PORT:-19071}"
APP_DIR="${APP_DIR:-./packages/vespa/application}"

echo "Waiting for Vespa to be healthy..."

# Wait for Vespa to be ready
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -sf "http://${VESPA_HOST}:${VESPA_CONFIG_PORT}/state/v1/health" > /dev/null 2>&1; then
    echo "Vespa is healthy"
    break
  fi
  
  attempt=$((attempt + 1))
  echo "Waiting for Vespa... (attempt $attempt/$max_attempts)"
  sleep 5
done

if [ $attempt -eq $max_attempts ]; then
  echo "Timeout waiting for Vespa to become healthy"
  exit 1
fi

# Deploy the application
echo "Deploying application package from $APP_DIR"

# Zip the application directory
cd "$(dirname "$APP_DIR")"
APP_NAME=$(basename "$APP_DIR")
zip -r openplane-app.zip "$APP_NAME" -x "*.DS_Store"

# Deploy to Vespa
curl -sf \
  --header "Content-Type:application/zip" \
  --data-binary @openplane-app.zip \
  "http://${VESPA_HOST}:19071/application/v2/tenant/default/prepareandactivate"

if [ $? -eq 0 ]; then
  echo "Application deployed successfully"
  rm openplane-app.zip
else
  echo "Application deployment failed"
  rm openplane-app.zip
  exit 1
fi

echo "Vespa deployment complete"

