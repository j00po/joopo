---
summary: "CLI reference for `joopo docs` (search the live docs index)"
read_when:
  - You want to search the live Joopo docs from the terminal
title: "Docs"
---

# `joopo docs`

Search the live docs index.

Arguments:

- `[query...]`: search terms to send to the live docs index

Examples:

```bash
joopo docs
joopo docs browser existing-session
joopo docs sandbox allowHostControl
joopo docs gateway token secretref
```

Notes:

- With no query, `joopo docs` opens the live docs search entrypoint.
- Multi-word queries are passed through as one search request.

## Related

- [CLI reference](/cli)
