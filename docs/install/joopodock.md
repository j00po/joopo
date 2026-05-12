---
summary: "ClawDock shell helpers for Docker-based Joopo installs"
read_when:
  - You run Joopo with Docker often and want shorter day-to-day commands
  - You want a helper layer for dashboard, logs, token setup, and pairing flows
title: "ClawDock"
---

ClawDock is a small shell-helper layer for Docker-based Joopo installs.

It gives you short commands like `joopoock-start`, `joopoock-dashboard`, and `joopoock-fix-token` instead of longer `docker compose ...` invocations.

If you have not set up Docker yet, start with [Docker](/install/docker).

## Install

Use the canonical helper path:

```bash
mkdir -p ~/.joopoock && curl -sL https://raw.githubusercontent.com/joopo/joopo/main/scripts/joopoock/joopoock-helpers.sh -o ~/.joopoock/joopoock-helpers.sh
echo 'source ~/.joopoock/joopoock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

If you previously installed ClawDock from `scripts/shell-helpers/joopoock-helpers.sh`, reinstall from the new `scripts/joopoock/joopoock-helpers.sh` path. The old raw GitHub path was removed.

## What you get

### Basic operations

| Command            | Description            |
| ------------------ | ---------------------- |
| `joopoock-start`   | Start the gateway      |
| `joopoock-stop`    | Stop the gateway       |
| `joopoock-restart` | Restart the gateway    |
| `joopoock-status`  | Check container status |
| `joopoock-logs`    | Follow gateway logs    |

### Container access

| Command                   | Description                                   |
| ------------------------- | --------------------------------------------- |
| `joopoock-shell`          | Open a shell inside the gateway container     |
| `joopoock-cli <command>`  | Run Joopo CLI commands in Docker              |
| `joopoock-exec <command>` | Execute an arbitrary command in the container |

### Web UI and pairing

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `joopoock-dashboard`    | Open the Control UI URL      |
| `joopoock-devices`      | List pending device pairings |
| `joopoock-approve <id>` | Approve a pairing request    |

### Setup and maintenance

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `joopoock-fix-token` | Configure the gateway token inside the container |
| `joopoock-update`    | Pull, rebuild, and restart                       |
| `joopoock-rebuild`   | Rebuild the Docker image only                    |
| `joopoock-clean`     | Remove containers and volumes                    |

### Utilities

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `joopoock-health`      | Run a gateway health check              |
| `joopoock-token`       | Print the gateway token                 |
| `joopoock-cd`          | Jump to the Joopo project directory     |
| `joopoock-config`      | Open `~/.joopo`                         |
| `joopoock-show-config` | Print config files with redacted values |
| `joopoock-workspace`   | Open the workspace directory            |

## First-time flow

```bash
joopoock-start
joopoock-fix-token
joopoock-dashboard
```

If the browser says pairing is required:

```bash
joopoock-devices
joopoock-approve <request-id>
```

## Config and secrets

ClawDock works with the same Docker config split described in [Docker](/install/docker):

- `<project>/.env` for Docker-specific values like image name, ports, and the gateway token
- `~/.joopo/.env` for env-backed provider keys and bot tokens
- `~/.joopo/agents/<agentId>/agent/auth-profiles.json` for stored provider OAuth/API-key auth
- `~/.joopo/joopo.json` for behavior config

Use `joopoock-show-config` when you want to inspect the `.env` files and `joopo.json` quickly. It redacts `.env` values in its printed output.

## Related

<CardGroup cols={2}>
  <Card title="Docker" href="/install/docker" icon="docker">
    Canonical Docker install for Joopo.
  </Card>
  <Card title="Docker VM runtime" href="/install/docker-vm-runtime" icon="cube">
    Docker-managed VM runtime for hardened isolation.
  </Card>
  <Card title="Updating" href="/install/updating" icon="arrow-up-right-from-square">
    Updating the Joopo package and managed services.
  </Card>
</CardGroup>
