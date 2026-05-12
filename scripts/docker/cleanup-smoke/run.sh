#!/usr/bin/env bash
set -euo pipefail

cd /repo

export JOOPO_STATE_DIR="/tmp/joopo-test"
export JOOPO_CONFIG_PATH="${JOOPO_STATE_DIR}/joopo.json"

echo "==> Build"
if ! pnpm build >/tmp/joopo-cleanup-build.log 2>&1; then
  cat /tmp/joopo-cleanup-build.log
  exit 1
fi

echo "==> Seed state"
mkdir -p "${JOOPO_STATE_DIR}/credentials"
mkdir -p "${JOOPO_STATE_DIR}/agents/main/sessions"
echo '{}' >"${JOOPO_CONFIG_PATH}"
echo 'creds' >"${JOOPO_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${JOOPO_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
if ! pnpm joopo reset --scope config+creds+sessions --yes --non-interactive >/tmp/joopo-cleanup-reset.log 2>&1; then
  cat /tmp/joopo-cleanup-reset.log
  exit 1
fi

test ! -f "${JOOPO_CONFIG_PATH}"
test ! -d "${JOOPO_STATE_DIR}/credentials"
test ! -d "${JOOPO_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${JOOPO_STATE_DIR}/credentials"
echo '{}' >"${JOOPO_CONFIG_PATH}"

echo "==> Uninstall (state only)"
if ! pnpm joopo uninstall --state --yes --non-interactive >/tmp/joopo-cleanup-uninstall.log 2>&1; then
  cat /tmp/joopo-cleanup-uninstall.log
  exit 1
fi

test ! -d "${JOOPO_STATE_DIR}"

echo "OK"
