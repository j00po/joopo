# syntax=docker/dockerfile:1.7
#
# Shared Docker E2E image.
# `bare` is a clean Node/Git runner for install/update lanes. `functional`
# installs the prepared Joopo npm tarball into /app for built-app lanes.

FROM node:24-bookworm-slim@sha256:e8e2e91b1378f83c5b2dd15f0247f34110e2fe895f6ca7719dbb780f929368eb AS e2e-runner

# python3 covers package/plugin install paths that execute helper scripts.
# procps provides pgrep for E2E watchdogs that assert no package-manager work is
# still running after Gateway readiness.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates git procps python3 \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable
RUN npm install -g tsx@4.21.0 --no-fund --no-audit

RUN useradd --create-home --shell /bin/bash appuser \
 && mkdir -p /app \
 && chown appuser:appuser /app

ENV HOME="/home/appuser"
ENV PATH="/home/appuser/.local/bin:${PATH}"
ENV NODE_OPTIONS="--disable-warning=ExperimentalWarning"
# Docker E2E lanes start many loopback gateways concurrently; mDNS advertising
# is unrelated to those checks and can flap under container CPU/network load.
ENV JOOPO_DISABLE_BONJOUR="1"

USER appuser
WORKDIR /app

FROM e2e-runner AS bare

CMD ["bash"]

FROM bare AS build

CMD ["bash"]

FROM bare AS functional

# The app under test enters through the named BuildKit context, not by copying
# checkout sources into the image.
COPY --from=joopo_package --chown=appuser:appuser joopo-current.tgz /tmp/joopo-current.tgz
# Preserve package self-reference imports such as joopo/plugin-sdk/* after
# copying the installed package out of npm's global node_modules tree.
RUN npm install -g --prefix /tmp/joopo-prefix /tmp/joopo-current.tgz --no-fund --no-audit \
 && cp -a /tmp/joopo-prefix/lib/node_modules/joopo/. /app/ \
 && mkdir -p "$HOME/.local/bin" \
 && ln -sf /app/joopo.mjs "$HOME/.local/bin/joopo" \
 && rm -rf /app/node_modules/joopo \
 && ln -sf /app /app/node_modules/joopo \
 && rm -rf /tmp/joopo-prefix /tmp/joopo-current.tgz

CMD ["bash"]
