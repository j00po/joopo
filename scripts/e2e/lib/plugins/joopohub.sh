run_plugins_joopohub_scenario() {
  if [ "${JOOPO_PLUGINS_E2E_JOOPOHUB:-1}" = "0" ]; then
    echo "Skipping JoopoHub plugin install and uninstall (JOOPO_PLUGINS_E2E_JOOPOHUB=0)."
  else
    echo "Testing JoopoHub plugin install and uninstall..."
    JOOPOHUB_PLUGIN_SPEC="${JOOPO_PLUGINS_E2E_JOOPOHUB_SPEC:-joopohub:@joopo/kitchen-sink}"
    JOOPOHUB_PLUGIN_ID="${JOOPO_PLUGINS_E2E_JOOPOHUB_ID:-joopo-kitchen-sink-fixture}"
    export JOOPOHUB_PLUGIN_SPEC JOOPOHUB_PLUGIN_ID

    start_joopohub_fixture_server() {
      local fixture_dir="$1"
      local server_log="$fixture_dir/joopohub-fixture.log"
      local server_port_file="$fixture_dir/joopohub-fixture-port"
      local server_pid_file="$fixture_dir/joopohub-fixture-pid"

      node scripts/e2e/lib/joopohub-fixture-server.cjs plugins "$server_port_file" >"$server_log" 2>&1 &
      local server_pid="$!"
      echo "$server_pid" >"$server_pid_file"

      for _ in $(seq 1 100); do
        if [[ -s "$server_port_file" ]]; then
          export JOOPO_JOOPOHUB_URL="http://127.0.0.1:$(cat "$server_port_file")"
          trap 'if [[ -f "'"$server_pid_file"'" ]]; then kill "$(cat "'"$server_pid_file"'")" 2>/dev/null || true; fi' EXIT
          return 0
        fi
        if ! kill -0 "$server_pid" 2>/dev/null; then
          cat "$server_log"
          return 1
        fi
        sleep 0.1
      done

      cat "$server_log"
      echo "Timed out waiting for JoopoHub fixture server." >&2
      return 1
    }

    if [[ "${JOOPO_PLUGINS_E2E_LIVE_JOOPOHUB:-0}" = "1" ]]; then
      export JOOPO_JOOPOHUB_URL="${JOOPO_JOOPOHUB_URL:-${JOOPOHUB_URL:-https://joopohub.ai}}"
      export NPM_CONFIG_REGISTRY="${JOOPO_PLUGINS_E2E_LIVE_NPM_REGISTRY:-https://registry.npmjs.org/}"
    else
      # Keep the release-path smoke hermetic; live JoopoHub can rate-limit CI.
      if [[ -n "${JOOPO_JOOPOHUB_URL:-}" || -n "${JOOPOHUB_URL:-}" ]]; then
        echo "Ignoring ambient JoopoHub URL for fixture-mode plugin E2E; set JOOPO_PLUGINS_E2E_LIVE_JOOPOHUB=1 for live JoopoHub."
      fi
      unset JOOPO_JOOPOHUB_URL JOOPOHUB_URL
      joopohub_fixture_dir="$(mktemp -d "/tmp/joopo-joopohub-fixture.XXXXXX")"
      start_joopohub_fixture_server "$joopohub_fixture_dir"
    fi

    node scripts/e2e/lib/plugins/assertions.mjs joopohub-preflight

    run_logged install-joopohub node "$JOOPO_ENTRY" plugins install "$JOOPOHUB_PLUGIN_SPEC"
    node "$JOOPO_ENTRY" plugins list --json >/tmp/plugins-joopohub-installed.json
    node "$JOOPO_ENTRY" plugins inspect "$JOOPOHUB_PLUGIN_ID" --json >/tmp/plugins-joopohub-inspect.json

    node scripts/e2e/lib/plugins/assertions.mjs joopohub-installed

    node "$JOOPO_ENTRY" plugins update "$JOOPOHUB_PLUGIN_ID" >/tmp/plugins-joopohub-update.log 2>&1
    node "$JOOPO_ENTRY" plugins list --json >/tmp/plugins-joopohub-updated.json
    node "$JOOPO_ENTRY" plugins inspect "$JOOPOHUB_PLUGIN_ID" --json >/tmp/plugins-joopohub-updated-inspect.json

    node scripts/e2e/lib/plugins/assertions.mjs joopohub-updated

    run_logged uninstall-joopohub node "$JOOPO_ENTRY" plugins uninstall "$JOOPOHUB_PLUGIN_SPEC" --force
    node "$JOOPO_ENTRY" plugins list --json >/tmp/plugins-joopohub-uninstalled.json

    node scripts/e2e/lib/plugins/assertions.mjs joopohub-removed
  fi
}
