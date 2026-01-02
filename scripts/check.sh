#!/usr/bin/env bash
set -euo pipefail
npx tsc --noEmit
npm test
npm run build
echo "CHECK_OK"
