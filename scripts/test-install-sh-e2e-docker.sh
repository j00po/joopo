#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/docker-build.sh"
IMAGE_NAME="${JOOPO_INSTALL_E2E_IMAGE:-joopo-install-e2e:local}"
INSTALL_URL="${JOOPO_INSTALL_URL:-https://joopo.bot/install.sh}"

OPENAI_API_KEY="${OPENAI_API_KEY:-}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
ANTHROPIC_API_TOKEN="${ANTHROPIC_API_TOKEN:-}"
JOOPO_E2E_MODELS="${JOOPO_E2E_MODELS:-}"

echo "==> Build image: $IMAGE_NAME"
docker_build_run install-e2e-build \
  -t "$IMAGE_NAME" \
  -f "$ROOT_DIR/scripts/docker/install-sh-e2e/Dockerfile" \
  "$ROOT_DIR/scripts/docker"

echo "==> Run E2E installer test"
docker run --rm \
  -e JOOPO_INSTALL_URL="$INSTALL_URL" \
  -e JOOPO_INSTALL_TAG="${JOOPO_INSTALL_TAG:-latest}" \
  -e JOOPO_E2E_MODELS="$JOOPO_E2E_MODELS" \
  -e JOOPO_INSTALL_E2E_PREVIOUS="${JOOPO_INSTALL_E2E_PREVIOUS:-}" \
  -e JOOPO_INSTALL_E2E_SKIP_PREVIOUS="${JOOPO_INSTALL_E2E_SKIP_PREVIOUS:-0}" \
  -e JOOPO_INSTALL_E2E_AGENT_TURN_TIMEOUT_SECONDS="${JOOPO_INSTALL_E2E_AGENT_TURN_TIMEOUT_SECONDS:-600}" \
  -e JOOPO_INSTALL_E2E_AGENT_TURNS_PARALLEL="${JOOPO_INSTALL_E2E_AGENT_TURNS_PARALLEL:-1}" \
  -e JOOPO_NO_ONBOARD=1 \
  -e OPENAI_API_KEY \
  -e ANTHROPIC_API_KEY \
  -e ANTHROPIC_API_TOKEN \
  "$IMAGE_NAME"
