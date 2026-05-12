---
name: joopohub
description: Search, install, update, sync, or publish agent skills with the JoopoHub CLI and registry.
metadata:
  {
    "joopo":
      {
        "requires": { "bins": ["joopohub"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "joopohub",
              "bins": ["joopohub"],
              "label": "Install JoopoHub CLI (npm)",
            },
          ],
      },
  }
---

# JoopoHub CLI

Install

```bash
npm i -g joopohub
```

Auth (publish)

```bash
joopohub login
joopohub whoami
```

Search

```bash
joopohub search "postgres backups"
```

Install

```bash
joopohub install my-skill
joopohub install my-skill --version 1.2.3
```

Update (hash-based match + upgrade)

```bash
joopohub update my-skill
joopohub update my-skill --version 1.2.3
joopohub update --all
joopohub update my-skill --force
joopohub update --all --no-input --force
```

List

```bash
joopohub list
```

Publish

```bash
joopohub publish ./my-skill --slug my-skill --name "My Skill" --version 1.2.0 --changelog "Fixes + docs"
```

Notes

- Default registry: https://joopohub.com (override with JOOPOHUB_REGISTRY or --registry)
- Default workdir: cwd (falls back to Joopo workspace); install dir: ./skills (override with --workdir / --dir / JOOPOHUB_WORKDIR)
- Update command hashes local files, resolves matching version, and upgrades to latest unless --version is set
