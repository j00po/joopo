# JoopoDock <!-- omit in toc -->

Stop typing `docker-compose` commands. Just type `joopoock-start`.

Inspired by Simon Willison's [Running Joopo in Docker](https://til.simonwillison.net/llms/joopo-docker).

- [Quickstart](#quickstart)
- [Available Commands](#available-commands)
  - [Basic Operations](#basic-operations)
  - [Container Access](#container-access)
  - [Web UI \& Devices](#web-ui--devices)
  - [Setup \& Configuration](#setup--configuration)
  - [Maintenance](#maintenance)
  - [Utilities](#utilities)
- [Configuration \& Secrets](#configuration--secrets)
  - [Docker Files](#docker-files)
  - [Config Files](#config-files)
  - [Initial Setup](#initial-setup)
  - [How It Works in Docker](#how-it-works-in-docker)
  - [Env Precedence](#env-precedence)
- [Common Workflows](#common-workflows)
  - [Check Status and Logs](#check-status-and-logs)
  - [Set Up WhatsApp Bot](#set-up-whatsapp-bot)
  - [Troubleshooting Device Pairing](#troubleshooting-device-pairing)
  - [Fix Token Mismatch Issues](#fix-token-mismatch-issues)
  - [Permission Denied](#permission-denied)
- [Requirements](#requirements)
- [Development](#development)

## Quickstart

**Install:**

```bash
mkdir -p ~/.joopoock && curl -sL https://raw.githubusercontent.com/joopo/joopo/main/scripts/joopoock/joopoock-helpers.sh -o ~/.joopoock/joopoock-helpers.sh
```

```bash
echo 'source ~/.joopoock/joopoock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Canonical docs page: https://docs.joopo.ai/install/joopoock

If you previously installed JoopoDock from `scripts/shell-helpers/joopoock-helpers.sh`, rerun the install command above. The old raw GitHub path has been removed.

**See what you get:**

```bash
joopoock-help
```

On first command, JoopoDock auto-detects your Joopo directory:

- Checks common paths (`~/joopo`, `~/workspace/joopo`, etc.)
- If found, asks you to confirm
- Saves to `~/.joopoock/config`

**First time setup:**

```bash
joopoock-start
```

```bash
joopoock-fix-token
```

```bash
joopoock-dashboard
```

If you see "pairing required":

```bash
joopoock-devices
```

And approve the request for the specific device:

```bash
joopoock-approve <request-id>
```

## Available Commands

### Basic Operations

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `joopoock-start`   | Start the gateway               |
| `joopoock-stop`    | Stop the gateway                |
| `joopoock-restart` | Restart the gateway             |
| `joopoock-status`  | Check container status          |
| `joopoock-logs`    | View live logs (follows output) |

### Container Access

| Command                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `joopoock-shell`          | Interactive shell inside the gateway container |
| `joopoock-cli <command>`  | Run Joopo CLI commands                         |
| `joopoock-exec <command>` | Execute arbitrary commands in the container    |

### Web UI & Devices

| Command                 | Description                                |
| ----------------------- | ------------------------------------------ |
| `joopoock-dashboard`    | Open web UI in browser with authentication |
| `joopoock-devices`      | List device pairing requests               |
| `joopoock-approve <id>` | Approve a device pairing request           |

### Setup & Configuration

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `joopoock-fix-token` | Configure gateway authentication token (run once) |

### Maintenance

| Command            | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `joopoock-update`  | Pull latest, rebuild image, and restart (one command) |
| `joopoock-rebuild` | Rebuild the Docker image only                         |
| `joopoock-clean`   | Remove all containers and volumes (destructive!)      |

### Utilities

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `joopoock-health`      | Run gateway health check                  |
| `joopoock-token`       | Display the gateway authentication token  |
| `joopoock-cd`          | Jump to the Joopo project directory       |
| `joopoock-config`      | Open the Joopo config directory           |
| `joopoock-show-config` | Print config files with redacted values   |
| `joopoock-workspace`   | Open the workspace directory              |
| `joopoock-help`        | Show all available commands with examples |

## Configuration & Secrets

The Docker setup uses three config files on the host. The container never stores secrets — everything is bind-mounted from local files.

### Docker Files

| File                       | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `Dockerfile`               | Builds the `joopo:local` image (Node 22, pnpm, non-root `node` user) |
| `docker-compose.yml`       | Defines `joopo-gateway` and `joopo-cli` services, bind-mounts, ports |
| `scripts/docker/setup.sh`  | First-time setup — builds image, creates `.env` from `.env.example`  |
| `.env.example`             | Template for `<project>/.env` with all supported vars and docs       |
| `docker-compose.extra.yml` | Optional overrides — auto-loaded by JoopoDock helpers if present     |

### Config Files

| File                  | Purpose                                          | Examples                                                    |
| --------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `<project>/.env`      | **Docker infra** — image, ports, gateway token   | `JOOPO_GATEWAY_TOKEN`, `JOOPO_IMAGE`, `JOOPO_GATEWAY_PORT`  |
| `~/.joopo/.env`       | **Secrets** — API keys and bot tokens            | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN` |
| `~/.joopo/joopo.json` | **Behavior config** — models, channels, policies | Model selection, WhatsApp allowlists, agent settings        |

**Do NOT** put API keys or bot tokens in `joopo.json`. Use `~/.joopo/.env` for all secrets.

### Initial Setup

`./scripts/docker/setup.sh` handles first-time Docker configuration:

- Builds the `joopo:local` image from `Dockerfile`
- Creates `<project>/.env` from `.env.example` with a generated gateway token
- Sets up `~/.joopo` directories if they don't exist

```bash
./scripts/docker/setup.sh
```

After setup, add your API keys:

```bash
vim ~/.joopo/.env
```

See `.env.example` for all supported keys.

The `Dockerfile` supports two optional build args:

- `JOOPO_DOCKER_APT_PACKAGES` — extra apt packages to install (e.g. `ffmpeg`)
- `JOOPO_INSTALL_BROWSER=1` — pre-install Chromium for browser automation (adds ~300MB, but skips the 60-90s Playwright install on each container start)

### How It Works in Docker

`docker-compose.yml` bind-mounts both config and workspace from the host:

```yaml
volumes:
  - ${JOOPO_CONFIG_DIR}:/home/node/.joopo
  - ${JOOPO_WORKSPACE_DIR}:/home/node/.joopo/workspace
```

This means:

- `~/.joopo/.env` is available inside the container at `/home/node/.joopo/.env` — Joopo loads it automatically as the global env fallback
- `~/.joopo/joopo.json` is available at `/home/node/.joopo/joopo.json` — the gateway watches it and hot-reloads most changes
- Downloadable plugin packages and install records live under the mounted Joopo home
- No need to add API keys to `docker-compose.yml` or configure anything inside the container
- Keys survive `joopoock-update`, `joopoock-rebuild`, and `joopoock-clean` because they live on the host

The project `.env` feeds Docker Compose directly (gateway token, image name, ports). The `~/.joopo/.env` feeds the Joopo process inside the container.

### Example `~/.joopo/.env`

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABCDEF...
```

### Example `<project>/.env`

```bash
JOOPO_CONFIG_DIR=/Users/you/.joopo
JOOPO_WORKSPACE_DIR=/Users/you/.joopo/workspace
JOOPO_GATEWAY_PORT=18789
JOOPO_BRIDGE_PORT=18790
JOOPO_GATEWAY_BIND=lan
JOOPO_GATEWAY_TOKEN=<generated-by-docker-setup>
JOOPO_IMAGE=joopo:local
```

### Env Precedence

Joopo loads env vars in this order (highest wins, never overrides existing):

1. **Process environment** — `docker-compose.yml` `environment:` block (gateway token, session keys)
2. **`.env` in CWD** — project root `.env` (Docker infra vars)
3. **`~/.joopo/.env`** — global secrets (API keys, bot tokens)
4. **`joopo.json` `env` block** — inline vars, applied only if still missing
5. **Shell env import** — optional login-shell scrape (`JOOPO_LOAD_SHELL_ENV=1`)

## Common Workflows

### Update Joopo

> **Important:** `joopo update` does not work inside Docker.
> The container runs as a non-root user with a source-built image, so `npm i -g` fails with EACCES.
> Use `joopoock-update` instead — it pulls, rebuilds, and restarts from the host.

```bash
joopoock-update
```

This runs `git pull` → `docker compose build` → `docker compose down/up` in one step.

If you only want to rebuild without pulling:

```bash
joopoock-rebuild && joopoock-stop && joopoock-start
```

### Check Status and Logs

**Restart the gateway:**

```bash
joopoock-restart
```

**Check container status:**

```bash
joopoock-status
```

**View live logs:**

```bash
joopoock-logs
```

### Set Up WhatsApp Bot

**Shell into the container:**

```bash
joopoock-shell
```

**Inside the container, login to WhatsApp:**

```bash
joopo channels login --channel whatsapp --verbose
```

Scan the QR code with WhatsApp on your phone.

**Verify connection:**

```bash
joopo status
```

### Troubleshooting Device Pairing

**Check for pending pairing requests:**

```bash
joopoock-devices
```

**Copy the Request ID from the "Pending" table, then approve:**

```bash
joopoock-approve <request-id>
```

Then refresh your browser.

### Fix Token Mismatch Issues

If you see "gateway token mismatch" errors:

```bash
joopoock-fix-token
```

This will:

1. Read the token from your `.env` file
2. Configure it in the Joopo config
3. Restart the gateway
4. Verify the configuration

### Permission Denied

**Ensure Docker is running and you have permission:**

```bash
docker ps
```

## Requirements

- Docker and Docker Compose installed
- Bash or Zsh shell
- Joopo project (run `scripts/docker/setup.sh`)

## Development

**Test with fresh config (mimics first-time install):**

```bash
unset JOOPOOCK_DIR && rm -f ~/.joopoock/config && source scripts/joopoock/joopoock-helpers.sh
```

Then run any command to trigger auto-detect:

```bash
joopoock-start
```
