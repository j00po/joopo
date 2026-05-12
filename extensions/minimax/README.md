# MiniMax (Joopo plugin)

Bundled MiniMax plugin for both:

- API-key provider setup (`minimax`)
- Token Plan OAuth setup (`minimax-portal`)

## Enable

```bash
joopo plugins enable minimax
```

Restart the Gateway after enabling.

```bash
joopo gateway restart
```

## Authenticate

OAuth:

```bash
joopo models auth login --provider minimax-portal --set-default
```

API key:

```bash
joopo setup --wizard --auth-choice minimax-global-api
```

## Notes

- MiniMax OAuth uses a user-code login flow.
- OAuth currently targets the Token Plan path.
