#!/usr/bin/env bash
set -euo pipefail
npm run docs:check
npx tsc --noEmit
npm test
npm run build
echo "CHECK_OK"
