#!/usr/bin/env bash
# JoopoDock - Docker helpers for Joopo
# Inspired by Simon Willison's "Running Joopo in Docker"
# https://til.simonwillison.net/llms/joopo-docker
#
# Installation:
#   mkdir -p ~/.joopoock && curl -sL https://raw.githubusercontent.com/joopo/joopo/main/scripts/joopoock/joopoock-helpers.sh -o ~/.joopoock/joopoock-helpers.sh
#   echo 'source ~/.joopoock/joopoock-helpers.sh' >> ~/.zshrc
#
# Usage:
#   joopoock-help    # Show all available commands

# =============================================================================
# Colors
# =============================================================================
_CLR_RESET='\033[0m'
_CLR_BOLD='\033[1m'
_CLR_DIM='\033[2m'
_CLR_GREEN='\033[0;32m'
_CLR_YELLOW='\033[1;33m'
_CLR_BLUE='\033[0;34m'
_CLR_MAGENTA='\033[0;35m'
_CLR_CYAN='\033[0;36m'
_CLR_RED='\033[0;31m'

# Styled command output (green + bold)
_clr_cmd() {
  echo -e "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# Inline command for use in sentences
_cmd() {
  echo "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# =============================================================================
# Config
# =============================================================================
JOOPOOCK_CONFIG="${HOME}/.joopoock/config"

# Common paths to check for Joopo
JOOPOOCK_COMMON_PATHS=(
  "${HOME}/joopo"
  "${HOME}/workspace/joopo"
  "${HOME}/projects/joopo"
  "${HOME}/dev/joopo"
  "${HOME}/code/joopo"
  "${HOME}/src/joopo"
)

_joopoock_filter_warnings() {
  grep -v "^WARN\|^time="
}

_joopoock_trim_quotes() {
  local value="$1"
  value="${value#\"}"
  value="${value%\"}"
  printf "%s" "$value"
}

_joopoock_mask_value() {
  local value="$1"
  local length=${#value}
  if (( length == 0 )); then
    printf "%s" "<empty>"
    return 0
  fi
  if (( length == 1 )); then
    printf "%s" "<redacted:1 char>"
    return 0
  fi
  printf "%s" "<redacted:${length} chars>"
}

_joopoock_read_config_dir() {
  if [[ ! -f "$JOOPOOCK_CONFIG" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^JOOPOOCK_DIR=//p' "$JOOPOOCK_CONFIG" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _joopoock_trim_quotes "$raw"
}

# Ensure JOOPOOCK_DIR is set and valid
_joopoock_ensure_dir() {
  # Already set and valid?
  if [[ -n "$JOOPOOCK_DIR" && -f "${JOOPOOCK_DIR}/docker-compose.yml" ]]; then
    return 0
  fi

  # Try loading from config
  local config_dir
  config_dir=$(_joopoock_read_config_dir)
  if [[ -n "$config_dir" && -f "${config_dir}/docker-compose.yml" ]]; then
    JOOPOOCK_DIR="$config_dir"
    return 0
  fi

  # Auto-detect from common paths
  local found_path=""
  for path in "${JOOPOOCK_COMMON_PATHS[@]}"; do
    if [[ -f "${path}/docker-compose.yml" ]]; then
      found_path="$path"
      break
    fi
  done

  if [[ -n "$found_path" ]]; then
    echo ""
    echo "🦞 Found Joopo at: $found_path"
    echo -n "   Use this location? [Y/n] "
    read -r response
    if [[ "$response" =~ ^[Nn] ]]; then
      echo ""
      echo "Set JOOPOOCK_DIR manually:"
      echo "  export JOOPOOCK_DIR=/path/to/joopo"
      return 1
    fi
    JOOPOOCK_DIR="$found_path"
  else
    echo ""
    echo "❌ Joopo not found in common locations."
    echo ""
    echo "Clone it first:"
    echo ""
    echo "  git clone https://github.com/joopo/joopo.git ~/joopo"
    echo "  cd ~/joopo && ./scripts/docker/setup.sh"
    echo ""
    echo "Or set JOOPOOCK_DIR if it's elsewhere:"
    echo ""
    echo "  export JOOPOOCK_DIR=/path/to/joopo"
    echo ""
    return 1
  fi

  # Save to config
  if [[ ! -d "${HOME}/.joopoock" ]]; then
    /bin/mkdir -p "${HOME}/.joopoock"
  fi
  echo "JOOPOOCK_DIR=\"$JOOPOOCK_DIR\"" > "$JOOPOOCK_CONFIG"
  echo "✅ Saved to $JOOPOOCK_CONFIG"
  echo ""
  return 0
}

# Wrapper to run docker compose commands
_joopoock_compose() {
  _joopoock_ensure_dir || return 1
  local compose_args=(-f "${JOOPOOCK_DIR}/docker-compose.yml")
  if [[ -f "${JOOPOOCK_DIR}/docker-compose.extra.yml" ]]; then
    compose_args+=(-f "${JOOPOOCK_DIR}/docker-compose.extra.yml")
  fi
  command docker compose "${compose_args[@]}" "$@"
}

_joopoock_read_env_token() {
  _joopoock_ensure_dir || return 1
  if [[ ! -f "${JOOPOOCK_DIR}/.env" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^JOOPO_GATEWAY_TOKEN=//p' "${JOOPOOCK_DIR}/.env" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _joopoock_trim_quotes "$raw"
}

# Basic Operations
joopoock-start() {
  _joopoock_compose up -d joopo-gateway
}

joopoock-stop() {
  _joopoock_compose down
}

joopoock-restart() {
  _joopoock_compose restart joopo-gateway
}

joopoock-logs() {
  _joopoock_compose logs -f joopo-gateway
}

joopoock-status() {
  _joopoock_compose ps
}

# Navigation
joopoock-cd() {
  _joopoock_ensure_dir || return 1
  cd "${JOOPOOCK_DIR}"
}

joopoock-config() {
  cd ~/.joopo
}

joopoock-show-config() {
  _joopoock_ensure_dir >/dev/null 2>&1 || true
  local config_dir="${HOME}/.joopo"
  echo -e "${_CLR_BOLD}Config directory:${_CLR_RESET} ${_CLR_CYAN}${config_dir}${_CLR_RESET}"
  echo ""

  # Show joopo.json
  if [[ -f "${config_dir}/joopo.json" ]]; then
    echo -e "${_CLR_BOLD}${config_dir}/joopo.json${_CLR_RESET}"
    echo -e "${_CLR_DIM}$(cat "${config_dir}/joopo.json")${_CLR_RESET}"
  else
    echo -e "${_CLR_YELLOW}No joopo.json found${_CLR_RESET}"
  fi
  echo ""

  # Show .env (mask secret values)
  if [[ -f "${config_dir}/.env" ]]; then
    echo -e "${_CLR_BOLD}${config_dir}/.env${_CLR_RESET}"
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      elif [[ "$line" == *=* ]]; then
        local key="${line%%=*}"
        local val="${line#*=}"
        echo -e "${_CLR_CYAN}${key}${_CLR_RESET}=${_CLR_DIM}$(_joopoock_mask_value "$val")${_CLR_RESET}"
      else
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      fi
    done < "${config_dir}/.env"
  else
    echo -e "${_CLR_YELLOW}No .env found${_CLR_RESET}"
  fi
  echo ""

  # Show project .env if available
  if [[ -n "$JOOPOOCK_DIR" && -f "${JOOPOOCK_DIR}/.env" ]]; then
    echo -e "${_CLR_BOLD}${JOOPOOCK_DIR}/.env${_CLR_RESET}"
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      elif [[ "$line" == *=* ]]; then
        local key="${line%%=*}"
        local val="${line#*=}"
        echo -e "${_CLR_CYAN}${key}${_CLR_RESET}=${_CLR_DIM}$(_joopoock_mask_value "$val")${_CLR_RESET}"
      else
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      fi
    done < "${JOOPOOCK_DIR}/.env"
  fi
  echo ""
}

joopoock-workspace() {
  cd ~/.joopo/workspace
}

# Container Access
joopoock-shell() {
  _joopoock_compose exec joopo-gateway \
    bash -c 'echo "alias joopo=\"./joopo.mjs\"" > /tmp/.bashrc_joopo && bash --rcfile /tmp/.bashrc_joopo'
}

joopoock-exec() {
  _joopoock_compose exec joopo-gateway "$@"
}

joopoock-cli() {
  _joopoock_compose run --rm joopo-cli "$@"
}

# Maintenance
joopoock-update() {
  _joopoock_ensure_dir || return 1

  echo "🔄 Updating Joopo..."

  echo ""
  echo "📥 Pulling latest source..."
  git -C "${JOOPOOCK_DIR}" pull || { echo "❌ git pull failed"; return 1; }

  echo ""
  echo "🔨 Rebuilding Docker image (this may take a few minutes)..."
  _joopoock_compose build joopo-gateway || { echo "❌ Build failed"; return 1; }

  echo ""
  echo "♻️  Recreating container with new image..."
  _joopoock_compose down 2>&1 | _joopoock_filter_warnings
  _joopoock_compose up -d joopo-gateway 2>&1 | _joopoock_filter_warnings

  echo ""
  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Update complete!"
  echo -e "   Verify: $(_cmd joopoock-cli status)"
}

joopoock-rebuild() {
  _joopoock_compose build joopo-gateway
}

joopoock-clean() {
  _joopoock_compose down -v --remove-orphans
}

# Health check
joopoock-health() {
  _joopoock_ensure_dir || return 1
  local token
  token=$(_joopoock_read_env_token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${JOOPOOCK_DIR}/.env"
    return 1
  fi
  _joopoock_compose exec -e "JOOPO_GATEWAY_TOKEN=$token" joopo-gateway \
    node dist/index.js health
}

# Show gateway token
joopoock-token() {
  _joopoock_read_env_token
}

# Fix token configuration (run this once after setup)
joopoock-fix-token() {
  _joopoock_ensure_dir || return 1

  echo "🔧 Configuring gateway token..."
  local token
  token=$(joopoock-token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${JOOPOOCK_DIR}/.env"
    return 1
  fi

  echo "📝 Setting token: ${token:0:20}..."

  _joopoock_compose exec -e "TOKEN=$token" joopo-gateway \
    bash -c './joopo.mjs config set gateway.remote.token "$TOKEN" && ./joopo.mjs config set gateway.auth.token "$TOKEN"' 2>&1 | _joopoock_filter_warnings

  echo "🔍 Verifying token was saved..."
  local saved_token
  saved_token=$(_joopoock_compose exec joopo-gateway \
    bash -c "./joopo.mjs config get gateway.remote.token 2>/dev/null" 2>&1 | _joopoock_filter_warnings | tr -d '\r\n' | head -c 64)

  if [[ "$saved_token" == "$token" ]]; then
    echo "✅ Token saved correctly!"
  else
    echo "⚠️  Token mismatch detected"
    echo "   Expected: ${token:0:20}..."
    echo "   Got: ${saved_token:0:20}..."
  fi

  echo "🔄 Restarting gateway..."
  _joopoock_compose restart joopo-gateway 2>&1 | _joopoock_filter_warnings

  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Configuration complete!"
  echo -e "   Try: $(_cmd joopoock-devices)"
}

# Open dashboard in browser
joopoock-dashboard() {
  _joopoock_ensure_dir || return 1

  echo "🦞 Getting dashboard URL..."
  local output exit_status url
  output=$(_joopoock_compose run --rm joopo-cli dashboard --no-open 2>&1)
  exit_status=$?
  url=$(printf "%s\n" "$output" | _joopoock_filter_warnings | grep -o 'http[s]\?://[^[:space:]]*' | head -n 1)
  if [[ $exit_status -ne 0 ]]; then
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd joopoock-restart)"
    return 1
  fi

  if [[ -n "$url" ]]; then
    echo -e "✅ Opening: ${_CLR_CYAN}${url}${_CLR_RESET}"
    open "$url" 2>/dev/null || xdg-open "$url" 2>/dev/null || echo -e "   Please open manually: ${_CLR_CYAN}${url}${_CLR_RESET}"
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see ${_CLR_RED}'pairing required'${_CLR_CYAN} error:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd joopoock-devices)"
    echo "   2. Copy the Request ID from the Pending table"
    echo -e "   3. Run: $(_cmd 'joopoock-approve <request-id>')"
  else
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd joopoock-restart)"
  fi
}

# List device pairings
joopoock-devices() {
  _joopoock_ensure_dir || return 1

  echo "🔍 Checking device pairings..."
  local output exit_status
  output=$(_joopoock_compose exec joopo-gateway node dist/index.js devices list 2>&1)
  exit_status=$?
  printf "%s\n" "$output" | _joopoock_filter_warnings
  if [ $exit_status -ne 0 ]; then
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see token errors above:${_CLR_RESET}"
    echo -e "   1. Verify token is set: $(_cmd joopoock-token)"
    echo -e "   2. Try fixing the token automatically: $(_cmd joopoock-fix-token)"
    echo "   3. If you still see errors, try manual config inside container:"
    echo -e "      $(_cmd joopoock-shell)"
    echo -e "      $(_cmd 'joopo config get gateway.remote.token')"
    return 1
  fi

  echo ""
  echo -e "${_CLR_CYAN}💡 To approve a pairing request:${_CLR_RESET}"
  echo -e "   $(_cmd 'joopoock-approve <request-id>')"
}

# Approve device pairing request
joopoock-approve() {
  _joopoock_ensure_dir || return 1

  if [[ -z "$1" ]]; then
    echo -e "❌ Usage: $(_cmd 'joopoock-approve <request-id>')"
    echo ""
    echo -e "${_CLR_CYAN}💡 How to approve a device:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd joopoock-devices)"
    echo "   2. Find the Request ID in the Pending table (long UUID)"
    echo -e "   3. Run: $(_cmd 'joopoock-approve <that-request-id>')"
    echo ""
    echo "Example:"
    echo -e "   $(_cmd 'joopoock-approve 6f9db1bd-a1cc-4d3f-b643-2c195262464e')"
    return 1
  fi

  echo "✅ Approving device: $1"
  _joopoock_compose exec joopo-gateway \
    node dist/index.js devices approve "$1" 2>&1 | _joopoock_filter_warnings

  echo ""
  echo "✅ Device approved! Refresh your browser."
}

# Show all available joopoock helper commands
joopoock-help() {
  echo -e "\n${_CLR_BOLD}${_CLR_CYAN}🦞 JoopoDock - Docker Helpers for Joopo${_CLR_RESET}\n"

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚡ Basic Operations${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-start)       ${_CLR_DIM}Start the gateway${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-stop)        ${_CLR_DIM}Stop the gateway${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-restart)     ${_CLR_DIM}Restart the gateway${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-status)      ${_CLR_DIM}Check container status${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-logs)        ${_CLR_DIM}View live logs (follows)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🐚 Container Access${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-shell)       ${_CLR_DIM}Shell into container (joopo alias ready)${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-cli)         ${_CLR_DIM}Run CLI commands (e.g., joopoock-cli status)${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-exec) ${_CLR_CYAN}<cmd>${_CLR_RESET}  ${_CLR_DIM}Execute command in gateway container${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🌐 Web UI & Devices${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-dashboard)   ${_CLR_DIM}Open web UI in browser ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-devices)     ${_CLR_DIM}List device pairings ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-approve) ${_CLR_CYAN}<id>${_CLR_RESET} ${_CLR_DIM}Approve device pairing ${_CLR_CYAN}(with examples)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚙️  Setup & Configuration${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-fix-token)   ${_CLR_DIM}Configure gateway token ${_CLR_CYAN}(run once)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🔧 Maintenance${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-update)      ${_CLR_DIM}Pull, rebuild, and restart ${_CLR_CYAN}(one-command update)${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-rebuild)     ${_CLR_DIM}Rebuild Docker image only${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-clean)       ${_CLR_RED}⚠️  Remove containers & volumes (nuclear)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🛠️  Utilities${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-health)      ${_CLR_DIM}Run health check${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-token)       ${_CLR_DIM}Show gateway auth token${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-cd)          ${_CLR_DIM}Jump to joopo project directory${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-config)      ${_CLR_DIM}Open config directory (~/.joopo)${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-show-config) ${_CLR_DIM}Print config files with redacted values${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-workspace)   ${_CLR_DIM}Open workspace directory${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo -e "${_CLR_BOLD}${_CLR_GREEN}🚀 First Time Setup${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  1.${_CLR_RESET} $(_cmd joopoock-start)          ${_CLR_DIM}# Start the gateway${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  2.${_CLR_RESET} $(_cmd joopoock-fix-token)      ${_CLR_DIM}# Configure token${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  3.${_CLR_RESET} $(_cmd joopoock-dashboard)      ${_CLR_DIM}# Open web UI${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  4.${_CLR_RESET} $(_cmd joopoock-devices)        ${_CLR_DIM}# If pairing needed${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  5.${_CLR_RESET} $(_cmd joopoock-approve) ${_CLR_CYAN}<id>${_CLR_RESET}   ${_CLR_DIM}# Approve pairing${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_GREEN}💬 WhatsApp Setup${_CLR_RESET}"
  echo -e "  $(_cmd joopoock-shell)"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'joopo channels login --channel whatsapp')"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'joopo status')"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_CYAN}💡 All commands guide you through next steps!${_CLR_RESET}"
  echo -e "${_CLR_BLUE}📚 Docs: ${_CLR_RESET}${_CLR_CYAN}https://docs.joopo.ai${_CLR_RESET}"
  echo ""
}
