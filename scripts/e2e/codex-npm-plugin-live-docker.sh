#!/usr/bin/env bash
# Installs Joopo from a prepared package tarball, installs @joopo/codex
# from the real npm registry, and verifies a live Codex app-server turn.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/lib/docker-e2e-image.sh"
source "$ROOT_DIR/scripts/lib/docker-e2e-package.sh"

IMAGE_NAME="$(docker_e2e_resolve_image "joopo-codex-npm-plugin-live-e2e" JOOPO_CODEX_NPM_PLUGIN_E2E_IMAGE)"
DOCKER_TARGET="${JOOPO_CODEX_NPM_PLUGIN_DOCKER_TARGET:-bare}"
HOST_BUILD="${JOOPO_CODEX_NPM_PLUGIN_HOST_BUILD:-1}"
PACKAGE_TGZ="${JOOPO_CURRENT_PACKAGE_TGZ:-}"
PROFILE_FILE="${JOOPO_CODEX_NPM_PLUGIN_PROFILE_FILE:-${JOOPO_TESTBOX_PROFILE_FILE:-$HOME/.joopo-testbox-live.profile}}"

docker_e2e_build_or_reuse "$IMAGE_NAME" codex-npm-plugin-live "$ROOT_DIR/scripts/e2e/Dockerfile" "$ROOT_DIR" "$DOCKER_TARGET"

prepare_package_tgz() {
  if [ -n "$PACKAGE_TGZ" ]; then
    PACKAGE_TGZ="$(docker_e2e_prepare_package_tgz codex-npm-plugin-live "$PACKAGE_TGZ")"
    return 0
  fi
  if [ "$HOST_BUILD" = "0" ] && [ -z "${JOOPO_CURRENT_PACKAGE_TGZ:-}" ]; then
    echo "JOOPO_CODEX_NPM_PLUGIN_HOST_BUILD=0 requires JOOPO_CURRENT_PACKAGE_TGZ" >&2
    exit 1
  fi
  PACKAGE_TGZ="$(docker_e2e_prepare_package_tgz codex-npm-plugin-live)"
}

prepare_package_tgz

PROFILE_MOUNT=()
PROFILE_STATUS="none"
if [ -f "$PROFILE_FILE" ] && [ -r "$PROFILE_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$PROFILE_FILE"
  set +a
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/appuser/.profile:ro)
  PROFILE_STATUS="$PROFILE_FILE"
fi

docker_e2e_package_mount_args "$PACKAGE_TGZ"
run_log="$(docker_e2e_run_log codex-npm-plugin-live)"
JOOPO_TEST_STATE_SCRIPT_B64="$(docker_e2e_test_state_shell_b64 codex-npm-plugin-live empty)"

echo "Running Codex npm plugin live Docker E2E..."
echo "Profile file: $PROFILE_STATUS"
if ! docker_e2e_run_with_harness \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e JOOPO_CODEX_NPM_PLUGIN_ALLOW_BETA_COMPAT_DIAGNOSTICS="${JOOPO_CODEX_NPM_PLUGIN_ALLOW_BETA_COMPAT_DIAGNOSTICS:-0}" \
  -e JOOPO_CODEX_NPM_PLUGIN_FORCE_UNSAFE_INSTALL="${JOOPO_CODEX_NPM_PLUGIN_FORCE_UNSAFE_INSTALL:-0}" \
  -e JOOPO_CODEX_NPM_PLUGIN_MODEL="${JOOPO_CODEX_NPM_PLUGIN_MODEL:-codex/gpt-5.4}" \
  -e JOOPO_CODEX_NPM_PLUGIN_SPEC="${JOOPO_CODEX_NPM_PLUGIN_SPEC:-npm:@joopo/codex}" \
  -e OPENAI_API_KEY \
  -e OPENAI_BASE_URL \
  -e "JOOPO_TEST_STATE_SCRIPT_B64=$JOOPO_TEST_STATE_SCRIPT_B64" \
  "${DOCKER_E2E_PACKAGE_ARGS[@]}" \
  "${PROFILE_MOUNT[@]}" \
  -i "$IMAGE_NAME" bash -s >"$run_log" 2>&1 <<'EOF'; then
set -euo pipefail

source scripts/lib/joopo-e2e-instance.sh
joopo_e2e_eval_test_state_from_b64 "${JOOPO_TEST_STATE_SCRIPT_B64:?missing JOOPO_TEST_STATE_SCRIPT_B64}"
export NPM_CONFIG_PREFIX="$HOME/.npm-global"
export npm_config_prefix="$NPM_CONFIG_PREFIX"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
export NPM_CONFIG_CACHE="${NPM_CONFIG_CACHE:-$XDG_CACHE_HOME/npm}"
export npm_config_cache="$NPM_CONFIG_CACHE"
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"
export JOOPO_AGENT_HARNESS_FALLBACK=none

for profile_path in "$HOME/.profile" /home/appuser/.profile; do
  if [ -f "$profile_path" ] && [ -r "$profile_path" ]; then
    set +e +u
    source "$profile_path"
    set -euo pipefail
    break
  fi
done
if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "ERROR: OPENAI_API_KEY was not available after sourcing ~/.profile." >&2
  exit 1
fi
export OPENAI_API_KEY
if [ -n "${OPENAI_BASE_URL:-}" ]; then
  export OPENAI_BASE_URL
fi

CODEX_PLUGIN_SPEC="${JOOPO_CODEX_NPM_PLUGIN_SPEC:?missing JOOPO_CODEX_NPM_PLUGIN_SPEC}"
MODEL_REF="${JOOPO_CODEX_NPM_PLUGIN_MODEL:?missing JOOPO_CODEX_NPM_PLUGIN_MODEL}"
SESSION_ID="codex-npm-plugin-live"
SUCCESS_MARKER="JOOPO-CODEX-NPM-PLUGIN-LIVE-OK"
PLUGIN_INSTALL_FLAGS=(--force)
if [ "${JOOPO_CODEX_NPM_PLUGIN_FORCE_UNSAFE_INSTALL:-0}" = "1" ]; then
  PLUGIN_INSTALL_FLAGS+=(--dangerously-force-unsafe-install)
fi

dump_debug_logs() {
  local status="$1"
  echo "Codex npm plugin live scenario failed with exit code $status" >&2
  joopo_e2e_dump_logs \
    /tmp/joopo-install.log \
    /tmp/joopo-codex-plugin-install.log \
    /tmp/joopo-codex-plugin-enable.log \
    /tmp/joopo-codex-plugins-list.json \
    /tmp/joopo-codex-plugin-inspect.json \
    /tmp/joopo-codex-preflight.log \
    /tmp/joopo-codex-agent.json \
    /tmp/joopo-codex-agent.err \
    /tmp/joopo-codex-plugin-uninstall.log \
    /tmp/joopo-codex-plugins-list-after-uninstall.json \
    /tmp/joopo-codex-agent-after-uninstall.json \
    /tmp/joopo-codex-agent-after-uninstall.err
}
trap 'status=$?; dump_debug_logs "$status"; exit "$status"' ERR

mkdir -p "$NPM_CONFIG_PREFIX" "$XDG_CACHE_HOME" "$NPM_CONFIG_CACHE"
chmod 700 "$XDG_CACHE_HOME" "$NPM_CONFIG_CACHE" || true

joopo_e2e_install_package /tmp/joopo-install.log
command -v joopo >/dev/null

echo "Installing Codex plugin from npm: $CODEX_PLUGIN_SPEC"
joopo plugins install "$CODEX_PLUGIN_SPEC" "${PLUGIN_INSTALL_FLAGS[@]}" >/tmp/joopo-codex-plugin-install.log 2>&1

node scripts/e2e/lib/codex-npm-plugin-live/assertions.mjs configure "$MODEL_REF"

echo "Enabling Codex plugin..."
joopo plugins enable codex >/tmp/joopo-codex-plugin-enable.log 2>&1

joopo plugins list --json >/tmp/joopo-codex-plugins-list.json
joopo plugins inspect codex --runtime --json >/tmp/joopo-codex-plugin-inspect.json
node scripts/e2e/lib/codex-npm-plugin-live/assertions.mjs assert-plugin "$CODEX_PLUGIN_SPEC"
node scripts/e2e/lib/codex-npm-plugin-live/assertions.mjs assert-npm-deps

CODEX_BIN="$(node scripts/e2e/lib/codex-npm-plugin-live/assertions.mjs print-codex-bin)"
printf '%s\n' "$OPENAI_API_KEY" | "$CODEX_BIN" login --with-api-key >/dev/null

echo "Running Codex CLI preflight via managed npm dependency..."
"$CODEX_BIN" exec \
  --json \
  --color never \
  --skip-git-repo-check \
  "Reply exactly: ${SUCCESS_MARKER}-PREFLIGHT" >/tmp/joopo-codex-preflight.log 2>&1
node scripts/e2e/lib/codex-npm-plugin-live/assertions.mjs assert-preflight "${SUCCESS_MARKER}-PREFLIGHT"

echo "Running Joopo local agent turn through npm-installed Codex plugin..."
joopo agent --local \
  --agent main \
  --session-id "$SESSION_ID" \
  --model "$MODEL_REF" \
  --message "Reply exactly: $SUCCESS_MARKER" \
  --thinking low \
  --timeout 420 \
  --json >/tmp/joopo-codex-agent.json 2>/tmp/joopo-codex-agent.err

node scripts/e2e/lib/codex-npm-plugin-live/assertions.mjs assert-agent-turn "$SUCCESS_MARKER" "$SESSION_ID" "$MODEL_REF"

echo "Uninstalling Codex plugin and verifying the configured harness now fails..."
joopo plugins uninstall codex --force >/tmp/joopo-codex-plugin-uninstall.log 2>&1
joopo plugins list --json >/tmp/joopo-codex-plugins-list-after-uninstall.json
node scripts/e2e/lib/codex-npm-plugin-live/assertions.mjs assert-uninstalled

set +e
joopo agent --local \
  --agent main \
  --session-id "${SESSION_ID}-after-uninstall" \
  --model "$MODEL_REF" \
  --message "Reply exactly: ${SUCCESS_MARKER}-AFTER-UNINSTALL" \
  --thinking low \
  --timeout 120 \
  --json >/tmp/joopo-codex-agent-after-uninstall.json 2>/tmp/joopo-codex-agent-after-uninstall.err
after_uninstall_status=$?
set -e
node scripts/e2e/lib/codex-npm-plugin-live/assertions.mjs assert-agent-error "$after_uninstall_status"

echo "Codex npm plugin live Docker E2E passed"
EOF
  docker_e2e_print_log "$run_log"
  rm -f "$run_log"
  exit 1
fi

rm -f "$run_log"
echo "Codex npm plugin live Docker E2E passed"
