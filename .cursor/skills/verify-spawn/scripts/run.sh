#!/usr/bin/env bash
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR/../../../.."
cleanup_on_exit() {
  "$DIR/cleanup.sh" || true
}
trap cleanup_on_exit EXIT
"$DIR/launch.sh"
status=0
"$DIR/doctor.sh" || status=$?
if [[ $status -eq 0 ]]; then
  node "$DIR/theme-check.mjs" || status=$?
fi
if [[ $status -eq 0 ]]; then
  node "$DIR/drive.mjs" all || status=$?
fi
if [[ $status -eq 0 ]]; then
  node "$DIR/preview.mjs" --from-env || status=$?
fi
if [[ $status -eq 0 ]]; then
  node "$DIR/finalize.mjs" || status=$?
fi
exit "$status"
