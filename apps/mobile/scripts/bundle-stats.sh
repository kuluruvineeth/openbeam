#!/bin/bash
set -euo pipefail

echo "Generating bundle stats..."
npx react-native-bundle-visualizer --entry-file index.ts --platform ios --dev false 2>/dev/null || {
  echo "Install react-native-bundle-visualizer: bunx react-native-bundle-visualizer"
  exit 1
}
