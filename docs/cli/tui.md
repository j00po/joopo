---
summary: "CLI reference for `joopo tui` (Gateway-backed or local embedded terminal UI)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
  - You want to run the TUI in local embedded mode without a Gateway
  - You want to use joopo chat or joopo tui --local
title: "TUI"
---

# `joopo tui`

Open the terminal UI connected to the Gateway, or run it in local embedded
mode.

Related:

- TUI guide: [TUI](/web/tui)

Notes:

- `chat` and `terminal` are aliases for `joopo tui --local`.
- `--local` cannot be combined with `--url`, `--token`, or `--password`.
- `tui` resolves configured gateway auth SecretRefs for token/password auth when possible (`env`/`file`/`exec` providers).
- When launched from inside a configured agent workspace directory, TUI auto-selects that agent for the session key default (unless `--session` is explicitly `agent:<id>:...`).
- Local mode uses the embedded agent runtime directly. Most local tools work, but Gateway-only features are unavailable.
- Local mode adds `/auth [provider]` inside the TUI command surface.
- Plugin approval gates still apply in local mode. Tools that require approval prompt for a decision in the terminal; nothing is silently auto-approved because the Gateway is not involved.

## Examples

```bash
joopo chat
joopo tui --local
joopo tui
joopo tui --url ws://127.0.0.1:18789 --token <token>
joopo tui --session main --deliver
joopo chat --message "Compare my config to the docs and tell me what to fix"
# when run inside an agent workspace, infers that agent automatically
joopo tui --session bugfix
```

## Config repair loop

Use local mode when the current config already validates and you want the
embedded agent to inspect it, compare it against the docs, and help repair it
from the same terminal:

If `joopo config validate` is already failing, use `joopo configure` or
`joopo doctor --fix` first. `joopo chat` does not bypass the invalid-
config guard.

```bash
joopo chat
```

Then inside the TUI:

```text
!joopo config file
!joopo docs gateway auth token secretref
!joopo config validate
!joopo doctor
```

Apply targeted fixes with `joopo config set` or `joopo configure`, then
rerun `joopo config validate`. See [TUI](/web/tui) and [Config](/cli/config).

## Related

- [CLI reference](/cli)
- [TUI](/web/tui)
