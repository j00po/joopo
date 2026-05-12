#!/usr/bin/env bash
set -euo pipefail

source scripts/lib/joopo-e2e-instance.sh
source scripts/e2e/lib/plugins/fixtures.sh

joopo_e2e_eval_test_state_from_b64 "${JOOPO_TEST_STATE_SCRIPT_B64:?missing JOOPO_TEST_STATE_SCRIPT_B64}"

export npm_config_loglevel=error
export npm_config_fund=false
export npm_config_audit=false
export npm_config_prefix=/tmp/npm-prefix
export NPM_CONFIG_PREFIX=/tmp/npm-prefix
export PATH="/tmp/npm-prefix/bin:$PATH"
export CI=true
export JOOPO_DISABLE_BUNDLED_PLUGINS=1
export JOOPO_NO_ONBOARD=1
export JOOPO_NO_PROMPT=1

baseline="${JOOPO_UPDATE_CORRUPT_PLUGIN_BASELINE:-joopo@latest}"
echo "Installing baseline Joopo package: $baseline"
if ! npm install -g --prefix /tmp/npm-prefix --omit=optional "$baseline" >/tmp/joopo-update-corrupt-baseline-install.log 2>&1; then
  cat /tmp/joopo-update-corrupt-baseline-install.log >&2 || true
  exit 1
fi

package_root="$(joopo_e2e_package_root /tmp/npm-prefix)"
entry="$(joopo_e2e_package_entrypoint "$package_root")"
export JOOPO_ENTRY="$entry"

npm_pack_dir="$(mktemp -d "/tmp/joopo-corrupt-plugin-pack.XXXXXX")"
npm_registry_dir="$(mktemp -d "/tmp/joopo-corrupt-plugin-registry.XXXXXX")"
pack_fixture_plugin "$npm_pack_dir" /tmp/demo-corrupt-plugin.tgz demo-corrupt-plugin 0.0.1 demo.corrupt "Demo Corrupt Plugin"
start_npm_fixture_registry "@joopo/demo-corrupt-plugin" "0.0.1" /tmp/demo-corrupt-plugin.tgz "$npm_registry_dir"

echo "Installing managed external plugin..."
node "$entry" plugins install "npm:@joopo/demo-corrupt-plugin@0.0.1" >/tmp/joopo-corrupt-plugin-install.log 2>&1
node "$entry" plugins inspect demo-corrupt-plugin --runtime --json >/tmp/joopo-corrupt-plugin-before.json
unset NPM_CONFIG_REGISTRY npm_config_registry

plugin_dir="$(
  node -e '
    const fs = require("node:fs");
    const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const installPath = payload.install?.installPath ?? payload.plugin?.rootDir;
    if (!installPath) {
      throw new Error("missing plugin install path in inspect output");
    }
    process.stdout.write(installPath);
  ' /tmp/joopo-corrupt-plugin-before.json
)"
rm -f "$plugin_dir/package.json"
if [ -f "$plugin_dir/package.json" ]; then
  echo "Expected corrupt plugin package.json to be removed before update." >&2
  exit 1
fi

echo "Updating Joopo with corrupt plugin present..."
set +e
node "$entry" update --channel beta --tag "${JOOPO_CURRENT_PACKAGE_TGZ:?missing JOOPO_CURRENT_PACKAGE_TGZ}" --yes --no-restart --json >/tmp/joopo-update-corrupt-plugin.json 2>/tmp/joopo-update-corrupt-plugin.err
update_status=$?
set -e
if [ "$update_status" -ne 0 ]; then
  if ! node scripts/e2e/lib/plugin-update/probe.mjs assert-legacy-post-update-plugin-failure /tmp/joopo-update-corrupt-plugin.json; then
    echo "joopo update failed with corrupt plugin present" >&2
    cat /tmp/joopo-update-corrupt-plugin.err >&2 || true
    cat /tmp/joopo-update-corrupt-plugin.json >&2 || true
    exit "$update_status"
  fi
  echo "Legacy updater reported post-update plugin failure after installing the new core; verifying updated entrypoint..."
  set +e
  JOOPO_UPDATE_POST_CORE=1 \
    JOOPO_UPDATE_POST_CORE_CHANNEL=beta \
    JOOPO_UPDATE_POST_CORE_RESULT_PATH=/tmp/joopo-update-corrupt-plugin-post-core.json \
    node "$entry" update --yes --no-restart --json >/tmp/joopo-update-corrupt-plugin-post-core.stdout 2>/tmp/joopo-update-corrupt-plugin-post-core.err
  post_core_status=$?
  set -e
  if [ "$post_core_status" -ne 0 ]; then
    echo "updated Joopo entry failed post-core plugin verification" >&2
    cat /tmp/joopo-update-corrupt-plugin-post-core.err >&2 || true
    cat /tmp/joopo-update-corrupt-plugin-post-core.stdout >&2 || true
    cat /tmp/joopo-update-corrupt-plugin-post-core.json >&2 || true
    exit "$post_core_status"
  fi
  node scripts/e2e/lib/plugin-update/probe.mjs assert-corrupt-plugin-result /tmp/joopo-update-corrupt-plugin-post-core.json demo-corrupt-plugin
  exit 0
fi

if ! node scripts/e2e/lib/plugin-update/probe.mjs assert-corrupt-update /tmp/joopo-update-corrupt-plugin.json demo-corrupt-plugin; then
  echo "corrupt update JSON payload:" >&2
  cat /tmp/joopo-update-corrupt-plugin.json >&2 || true
  echo "corrupt update stderr:" >&2
  cat /tmp/joopo-update-corrupt-plugin.err >&2 || true
  exit 1
fi
