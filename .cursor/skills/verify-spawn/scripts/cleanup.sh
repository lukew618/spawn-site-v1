#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../../.."
exec node .cursor/skills/verify-spawn/scripts/cleanup.mjs
