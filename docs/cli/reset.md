---
summary: "CLI reference for `joopo reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "Reset"
---

# `joopo reset`

Reset local config/state (keeps the CLI installed).

Options:

- `--scope <scope>`: `config`, `config+creds+sessions`, or `full`
- `--yes`: skip confirmation prompts
- `--non-interactive`: disable prompts; requires `--scope` and `--yes`
- `--dry-run`: print actions without removing files

Examples:

```bash
joopo backup create
joopo reset
joopo reset --dry-run
joopo reset --scope config --yes --non-interactive
joopo reset --scope config+creds+sessions --yes --non-interactive
joopo reset --scope full --yes --non-interactive
```

Notes:

- Run `joopo backup create` first if you want a restorable snapshot before removing local state.
- If you omit `--scope`, `joopo reset` uses an interactive prompt to choose what to remove.
- `--non-interactive` is only valid when both `--scope` and `--yes` are set.

## Related

- [CLI reference](/cli)
