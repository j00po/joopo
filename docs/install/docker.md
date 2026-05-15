---
summary: "Optional Docker-based setup and onboarding for Joopo"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

Docker is **optional**. Use it only if you want a containerized gateway or to validate the Docker flow.

## Is Docker right for me?

- **Yes**: you want an isolated, throwaway gateway environment or to run Joopo on a host without local installs.
- **No**: you are running on your own machine and just want the fastest dev loop. Use the normal install flow instead.
- **Sandboxing note**: the default sandbox backend uses Docker when sandboxing is enabled, but sandboxing is off by default and does **not** require the full gateway to run in Docker. SSH and OpenShell sandbox backends are also available. See [Sandboxing](/gateway/sandboxing).

## Prerequisites

- Docker Desktop (or Docker Engine) + Docker Compose v2
- At least 2 GB RAM for image build (`pnpm install` may be OOM-killed on 1 GB hosts with exit 137)
- Enough disk for images and logs
- If running on a VPS/public host, review
  [Security hardening for network exposure](/gateway/security),
  especially Docker `DOCKER-USER` firewall policy.

## Containerized gateway

<Steps>
  <Step title="Build the image">
    From the repo root, run the setup script:

    ```bash
    ./scripts/docker/setup.sh
    ```

    This builds the gateway image locally. To use a pre-built image instead:

    ```bash
    export JOOPO_IMAGE="ghcr.io/joopo/joopo:latest"
    ./scripts/docker/setup.sh
    ```

    Pre-built images are published at the
    [GitHub Container Registry](https://github.com/joopo/joopo/pkgs/container/joopo).
    Common tags: `main`, `latest`, `<version>` (e.g. `2026.2.26`).

  </Step>

  <Step title="Complete onboarding">
    The setup script runs onboarding automatically. It will:

    - prompt for provider API keys
    - generate a gateway token and write it to `.env`
    - start the gateway via Docker Compose

    During setup, pre-start onboarding and config writes run through
    `joopo-gateway` directly. `joopo-cli` is for commands you run after
    the gateway container already exists.

  </Step>

  <Step title="Open the Control UI">
    Open `http://127.0.0.1:18789/` in your browser and paste the configured
    shared secret into Settings. The setup script writes a token to `.env` by
    default; if you switch the container config to password auth, use that
    password instead.

    Need the URL again?

    ```bash
    docker compose run --rm joopo-cli dashboard --no-open
    ```

  </Step>

  <Step title="Configure channels (optional)">
    Use the CLI container to add messaging channels:

    ```bash
    # WhatsApp (QR)
    docker compose run --rm joopo-cli channels login

    # Telegram
    docker compose run --rm joopo-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm joopo-cli channels add --channel discord --token "<token>"
    ```

    Docs: [WhatsApp](/channels/whatsapp), [Telegram](/channels/telegram), [Discord](/channels/discord)

  </Step>
</Steps>

### Manual flow

If you prefer to run each step yourself instead of using the setup script:

```bash
docker build -t joopo:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node joopo-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node joopo-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d joopo-gateway
```

<Note>
Run `docker compose` from the repo root. If you enabled `JOOPO_EXTRA_MOUNTS`
or `JOOPO_HOME_VOLUME`, the setup script writes `docker-compose.extra.yml`;
include it with `-f docker-compose.yml -f docker-compose.extra.yml`.
</Note>

<Note>
Because `joopo-cli` shares `joopo-gateway`'s network namespace, it is a
post-start tool. Before `docker compose up -d joopo-gateway`, run onboarding
and setup-time config writes through `joopo-gateway` with
`--no-deps --entrypoint node`.
</Note>

### Environment variables

The setup script accepts these optional environment variables:

| Variable                                | Purpose                                                         |
| --------------------------------------- | --------------------------------------------------------------- |
| `JOOPO_IMAGE`                           | Use a remote image instead of building locally                  |
| `JOOPO_DOCKER_APT_PACKAGES`             | Install extra apt packages during build (space-separated)       |
| `JOOPO_EXTENSIONS`                      | Include selected bundled plugin helpers at build time           |
| `JOOPO_EXTRA_MOUNTS`                    | Extra host bind mounts (comma-separated `source:target[:opts]`) |
| `JOOPO_HOME_VOLUME`                     | Persist `/home/node` in a named Docker volume                   |
| `JOOPO_SANDBOX`                         | Opt in to sandbox bootstrap (`1`, `true`, `yes`, `on`)          |
| `JOOPO_SKIP_ONBOARDING`                 | Skip the interactive onboarding step (`1`, `true`, `yes`, `on`) |
| `JOOPO_DOCKER_SOCKET`                   | Override Docker socket path                                     |
| `JOOPO_DISABLE_BONJOUR`                 | Disable Bonjour/mDNS advertising (defaults to `1` for Docker)   |
| `JOOPO_DISABLE_BUNDLED_SOURCE_OVERLAYS` | Disable bundled plugin source bind-mount overlays               |
| `OTEL_EXPORTER_OTLP_ENDPOINT`           | Shared OTLP/HTTP collector endpoint for OpenTelemetry export    |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`         | Signal-specific OTLP endpoints for traces, metrics, or logs     |
| `OTEL_EXPORTER_OTLP_PROTOCOL`           | OTLP protocol override. Only `http/protobuf` is supported today |
| `OTEL_SERVICE_NAME`                     | Service name used for OpenTelemetry resources                   |
| `OTEL_SEMCONV_STABILITY_OPT_IN`         | Opt in to latest experimental GenAI semantic attributes         |
| `JOOPO_OTEL_PRELOADED`                  | Skip starting a second OpenTelemetry SDK when one is preloaded  |

Maintainers can test bundled plugin source against a packaged image by mounting
one plugin source directory over its packaged source path, for example
`JOOPO_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`.
That mounted source directory overrides the matching compiled
`/app/dist/extensions/synology-chat` bundle for the same plugin id.

### Observability

OpenTelemetry export is outbound from the Gateway container to your OTLP
collector. It does not require a published Docker port. If you build the image
locally and want the bundled OpenTelemetry exporter available inside the image,
include its runtime dependencies:

```bash
export JOOPO_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="joopo-gateway"
./scripts/docker/setup.sh
```

Install the official `@joopo/diagnostics-otel` plugin from JoopoHub in
packaged Docker installs before enabling export. Custom source-built images can
still include the local plugin source with
`JOOPO_EXTENSIONS=diagnostics-otel`. To enable export, allow and enable the
`diagnostics-otel` plugin in config, then set
`diagnostics.otel.enabled=true` or use the config example in [OpenTelemetry
export](/gateway/opentelemetry). Collector auth headers are configured through
`diagnostics.otel.headers`, not through Docker environment variables.

Prometheus metrics use the already-published Gateway port. Install
`joopohub:@joopo/diagnostics-prometheus`, enable the
`diagnostics-prometheus` plugin, then scrape:

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

The route is protected by Gateway authentication. Do not expose a separate
public `/metrics` port or unauthenticated reverse-proxy path. See
[Prometheus metrics](/gateway/prometheus).

### Health checks

Container probe endpoints (no auth required):

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

The Docker image includes a built-in `HEALTHCHECK` that pings `/healthz`.
If checks keep failing, Docker marks the container as `unhealthy` and
orchestration systems can restart or replace it.

Authenticated deep health snapshot:

```bash
docker compose exec joopo-gateway node dist/index.js health --token "$JOOPO_GATEWAY_TOKEN"
```

### LAN vs loopback

`scripts/docker/setup.sh` defaults `JOOPO_GATEWAY_BIND=lan` so host access to
`http://127.0.0.1:18789` works with Docker port publishing.

- `lan` (default): host browser and host CLI can reach the published gateway port.
- `loopback`: only processes inside the container network namespace can reach
  the gateway directly.

<Note>
Use bind mode values in `gateway.bind` (`lan` / `loopback` / `custom` /
`tailnet` / `auto`), not host aliases like `0.0.0.0` or `127.0.0.1`.
</Note>

### Host Local Providers

When Joopo runs in Docker, `127.0.0.1` inside the container is the container
itself, not your host machine. Use `host.docker.internal` for AI providers that
run on the host:

| Provider  | Host default URL         | Docker setup URL                    |
| --------- | ------------------------ | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

The bundled Docker setup uses those host URLs as the LM Studio and Ollama
onboarding defaults, and `docker-compose.yml` maps `host.docker.internal` to
Docker's host gateway for Linux Docker Engine. Docker Desktop already provides
the same hostname on macOS and Windows.

Host services must also listen on an address reachable from Docker:

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

If you use your own Compose file or `docker run` command, add the same host
mapping yourself, for example
`--add-host=host.docker.internal:host-gateway`.

### Bonjour / mDNS

Docker bridge networking usually does not forward Bonjour/mDNS multicast
(`224.0.0.251:5353`) reliably. The bundled Compose setup therefore defaults
`JOOPO_DISABLE_BONJOUR=1` so the Gateway does not crash-loop or repeatedly
restart advertising when the bridge drops multicast traffic.

Use the published Gateway URL, Tailscale, or wide-area DNS-SD for Docker hosts.
Set `JOOPO_DISABLE_BONJOUR=0` only when running with host networking, macvlan,
or another network where mDNS multicast is known to work.

For gotchas and troubleshooting, see [Bonjour discovery](/gateway/bonjour).

### Storage and persistence

Docker Compose bind-mounts `JOOPO_CONFIG_DIR` to `/home/node/.joopo` and
`JOOPO_WORKSPACE_DIR` to `/home/node/.joopo/workspace`, so those paths
survive container replacement. When either variable is unset, the bundled
`docker-compose.yml` falls back to `${HOME}/.joopo` (and
`${HOME}/.joopo/workspace` for the workspace mount), or `/tmp/.joopo`
when `HOME` itself is also missing. That keeps `docker compose up` from
emitting an empty-source volume spec on bare environments.

That mounted config directory is where Joopo keeps:

- `joopo.json` for behavior config
- `agents/<agentId>/agent/auth-profiles.json` for stored provider OAuth/API-key auth
- `.env` for env-backed runtime secrets such as `JOOPO_GATEWAY_TOKEN`

Installed downloadable plugins store their package state under the mounted
Joopo home, so plugin install records and package roots survive container
replacement. Gateway startup does not generate bundled-plugin dependency trees.

For full persistence details on VM deployments, see
[Docker VM Runtime - What persists where](/install/docker-vm-runtime#what-persists-where).

**Disk growth hotspots:** watch `media/`, session JSONL files,
`cron/runs/*.jsonl`, installed plugin package roots, and rolling file logs
under `/tmp/joopo/`.

### Shell helpers (optional)

For easier day-to-day Docker management, install `JoopoDock`:

```bash
mkdir -p ~/.joopoock && curl -sL https://raw.githubusercontent.com/joopo/joopo/main/scripts/joopoock/joopoock-helpers.sh -o ~/.joopoock/joopoock-helpers.sh
echo 'source ~/.joopoock/joopoock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

If you installed JoopoDock from the older `scripts/shell-helpers/joopoock-helpers.sh` raw path, rerun the install command above so your local helper file tracks the new location.

Then use `joopoock-start`, `joopoock-stop`, `joopoock-dashboard`, etc. Run
`joopoock-help` for all commands.
See [JoopoDock](/install/joopoock) for the full helper guide.

<AccordionGroup>
  <Accordion title="Enable agent sandbox for Docker gateway">
    ```bash
    export JOOPO_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    Custom socket path (e.g. rootless Docker):

    ```bash
    export JOOPO_SANDBOX=1
    export JOOPO_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    The script mounts `docker.sock` only after sandbox prerequisites pass. If
    sandbox setup cannot complete, the script resets `agents.defaults.sandbox.mode`
    to `off`.

  </Accordion>

  <Accordion title="Automation / CI (non-interactive)">
    Disable Compose pseudo-TTY allocation with `-T`:

    ```bash
    docker compose run -T --rm joopo-cli gateway probe
    docker compose run -T --rm joopo-cli devices list --json
    ```

  </Accordion>

  <Accordion title="Shared-network security note">
    `joopo-cli` uses `network_mode: "service:joopo-gateway"` so CLI
    commands can reach the gateway over `127.0.0.1`. Treat this as a shared
    trust boundary. The compose config drops `NET_RAW`/`NET_ADMIN` and enables
    `no-new-privileges` on both `joopo-gateway` and `joopo-cli`.
  </Accordion>

  <Accordion title="Docker Desktop DNS failures in joopo-cli">
    Some Docker Desktop setups fail DNS lookups from the shared-network
    `joopo-cli` sidecar after `NET_RAW` is dropped, which shows up as
    `EAI_AGAIN` during npm-backed commands such as `joopo plugins install`.
    Keep the default hardened compose file for normal gateway operation. The
    local override below loosens the CLI container's security posture by
    restoring Docker's default capabilities, so use it only for the one-off CLI
    command that needs package registry access, not as your default Compose
    invocation:

    ```bash
    printf '%s\n' \
      'services:' \
      '  joopo-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm joopo-cli plugins install <package>
    ```

    If you already created a long-running `joopo-cli` container, recreate it
    with the same override. `docker compose exec` and `docker exec` cannot
    change Linux capabilities on an already-created container.

  </Accordion>

  <Accordion title="Permissions and EACCES">
    The image runs as `node` (uid 1000). If you see permission errors on
    `/home/node/.joopo`, make sure your host bind mounts are owned by uid 1000:

    ```bash
    sudo chown -R 1000:1000 /path/to/joopo-config /path/to/joopo-workspace
    ```

    The same mismatch can show up as a plugin warning such as
    `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
    followed by `plugin present but blocked`. That means the process uid and the
    mounted plugin directory owner disagree. Prefer running the container as the
    default uid 1000 and fixing the bind mount ownership. Only chown
    `/path/to/joopo-config/npm` to `root:root` if you intentionally run
    Joopo as root long term.

  </Accordion>

  <Accordion title="Faster rebuilds">
    Order your Dockerfile so dependency layers are cached. This avoids re-running
    `pnpm install` unless lockfiles change:

    ```dockerfile
    FROM node:24-bookworm
    RUN curl -fsSL https://bun.sh/install | bash
    ENV PATH="/root/.bun/bin:${PATH}"
    RUN corepack enable
    WORKDIR /app
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
    COPY ui/package.json ./ui/package.json
    COPY scripts ./scripts
    RUN pnpm install --frozen-lockfile
    COPY . .
    RUN pnpm build
    RUN pnpm ui:install
    RUN pnpm ui:build
    ENV NODE_ENV=production
    CMD ["node","dist/index.js"]
    ```

  </Accordion>

  <Accordion title="Power-user container options">
    The default image is security-first and runs as non-root `node`. For a more
    full-featured container:

    1. **Persist `/home/node`**: `export JOOPO_HOME_VOLUME="joopo_home"`
    2. **Bake system deps**: `export JOOPO_DOCKER_APT_PACKAGES="git curl jq"`
    3. **Install Playwright browsers**:
       ```bash
       docker compose run --rm joopo-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **Persist browser downloads**: set
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` and use
       `JOOPO_HOME_VOLUME` or `JOOPO_EXTRA_MOUNTS`.

  </Accordion>

  <Accordion title="OpenAI Codex OAuth (headless Docker)">
    If you pick OpenAI Codex OAuth in the wizard, it opens a browser URL. In
    Docker or headless setups, copy the full redirect URL you land on and paste
    it back into the wizard to finish auth.
  </Accordion>

  <Accordion title="Base image metadata">
    The main Docker runtime image uses `node:24-bookworm-slim` and publishes OCI
    base-image annotations including `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source`, and others. The Node base digest is
    refreshed through Dependabot Docker base-image PRs; release builds do not run
    a distro upgrade layer. See
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### Running on a VPS?

See [Hetzner (Docker VPS)](/install/hetzner) and
[Docker VM Runtime](/install/docker-vm-runtime) for shared VM deployment steps
including binary baking, persistence, and updates.

## Agent sandbox

When `agents.defaults.sandbox` is enabled with the Docker backend, the gateway
runs agent tool execution (shell, file read/write, etc.) inside isolated Docker
containers while the gateway itself stays on the host. This gives you a hard wall
around untrusted or multi-tenant agent sessions without containerizing the entire
gateway.

Sandbox scope can be per-agent (default), per-session, or shared. Each scope
gets its own workspace mounted at `/workspace`. You can also configure
allow/deny tool policies, network isolation, resource limits, and browser
containers.

For full configuration, images, security notes, and multi-agent profiles, see:

- [Sandboxing](/gateway/sandboxing) -- complete sandbox reference
- [OpenShell](/gateway/openshell) -- interactive shell access to sandbox containers
- [Multi-Agent Sandbox and Tools](/tools/multi-agent-sandbox-tools) -- per-agent overrides

### Quick enable

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared
      },
    },
  },
}
```

Build the default sandbox image (from a source checkout):

```bash
scripts/sandbox-setup.sh
```

For npm installs without a source checkout, see [Sandboxing § Images and setup](/gateway/sandboxing#images-and-setup) for inline `docker build` commands.

## Troubleshooting

<AccordionGroup>
  <Accordion title="Image missing or sandbox container not starting">
    Build the sandbox image with
    [`scripts/sandbox-setup.sh`](https://github.com/joopo/joopo/blob/main/scripts/sandbox-setup.sh)
    (source checkout) or the inline `docker build` command from [Sandboxing § Images and setup](/gateway/sandboxing#images-and-setup) (npm install),
    or set `agents.defaults.sandbox.docker.image` to your custom image.
    Containers are auto-created per session on demand.
  </Accordion>

  <Accordion title="Permission errors in sandbox">
    Set `docker.user` to a UID:GID that matches your mounted workspace ownership,
    or chown the workspace folder.
  </Accordion>

  <Accordion title="Custom tools not found in sandbox">
    Joopo runs commands with `sh -lc` (login shell), which sources
    `/etc/profile` and may reset PATH. Set `docker.env.PATH` to prepend your
    custom tool paths, or add a script under `/etc/profile.d/` in your Dockerfile.
  </Accordion>

  <Accordion title="OOM-killed during image build (exit 137)">
    The VM needs at least 2 GB RAM. Use a larger machine class and retry.
  </Accordion>

  <Accordion title="Unauthorized or pairing required in Control UI">
    Fetch a fresh dashboard link and approve the browser device:

    ```bash
    docker compose run --rm joopo-cli dashboard --no-open
    docker compose run --rm joopo-cli devices list
    docker compose run --rm joopo-cli devices approve <requestId>
    ```

    More detail: [Dashboard](/web/dashboard), [Devices](/cli/devices).

  </Accordion>

  <Accordion title="Gateway target shows ws://172.x.x.x or pairing errors from Docker CLI">
    Reset gateway mode and bind:

    ```bash
    docker compose run --rm joopo-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm joopo-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## Related

- [Install Overview](/install) — all installation methods
- [Podman](/install/podman) — Podman alternative to Docker
- [JoopoDock](/install/joopoock) — Docker Compose community setup
- [Updating](/install/updating) — keeping Joopo up to date
- [Configuration](/gateway/configuration) — gateway configuration after install
