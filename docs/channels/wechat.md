---
summary: "WeChat channel setup through the external joopo-weixin plugin"
read_when:
  - You want to connect Joopo to WeChat or Weixin
  - You are installing or troubleshooting the joopo-weixin channel plugin
  - You need to understand how external channel plugins run beside the Gateway
title: "WeChat"
---

Joopo connects to WeChat through Tencent's external
`@tencent-weixin/joopo-weixin` channel plugin.

Status: external plugin. Direct chats and media are supported. Group chats are not
advertised by the current plugin capability metadata.

## Naming

- **WeChat** is the user-facing name in these docs.
- **Weixin** is the name used by Tencent's package and by the plugin id.
- `joopo-weixin` is the Joopo channel id.
- `@tencent-weixin/joopo-weixin` is the npm package.

Use `joopo-weixin` in CLI commands and config paths.

## How it works

The WeChat code does not live in the Joopo core repo. Joopo provides the
generic channel plugin contract, and the external plugin provides the
WeChat-specific runtime:

1. `joopo plugins install` installs `@tencent-weixin/joopo-weixin`.
2. The Gateway discovers the plugin manifest and loads the plugin entrypoint.
3. The plugin registers channel id `joopo-weixin`.
4. `joopo channels login --channel joopo-weixin` starts QR login.
5. The plugin stores account credentials under the Joopo state directory.
6. When the Gateway starts, the plugin starts its Weixin monitor for each
   configured account.
7. Inbound WeChat messages are normalized through the channel contract, routed to
   the selected Joopo agent, and sent back through the plugin outbound path.

That separation matters: Joopo core should stay channel-agnostic. WeChat login,
Tencent iLink API calls, media upload/download, context tokens, and account
monitoring are owned by the external plugin.

## Install

Quick install:

```bash
npx -y @tencent-weixin/joopo-weixin-cli install
```

Manual install:

```bash
joopo plugins install "@tencent-weixin/joopo-weixin"
joopo config set plugins.entries.joopo-weixin.enabled true
```

Restart the Gateway after install:

```bash
joopo gateway restart
```

## Login

Run QR login on the same machine that runs the Gateway:

```bash
joopo channels login --channel joopo-weixin
```

Scan the QR code with WeChat on your phone and confirm the login. The plugin saves
the account token locally after a successful scan.

To add another WeChat account, run the same login command again. For multiple
accounts, isolate direct-message sessions by account, channel, and sender:

```bash
joopo config set session.dmScope per-account-channel-peer
```

## Access control

Direct messages use the normal Joopo pairing and allowlist model for channel
plugins.

Approve new senders:

```bash
joopo pairing list joopo-weixin
joopo pairing approve joopo-weixin <CODE>
```

For the full access-control model, see [Pairing](/channels/pairing).

## Compatibility

The plugin checks the host Joopo version at startup.

| Plugin line | Joopo version        | npm tag  |
| ----------- | ----------------------- | -------- |
| `2.x`       | `>=2026.3.22`           | `latest` |
| `1.x`       | `>=2026.1.0 <2026.3.22` | `legacy` |

If the plugin reports that your Joopo version is too old, either update
Joopo or install the legacy plugin line:

```bash
joopo plugins install @tencent-weixin/joopo-weixin@legacy
```

## Sidecar process

The WeChat plugin can run helper work beside the Gateway while it monitors the
Tencent iLink API. In issue #68451, that helper path exposed a bug in Joopo's
generic stale-Gateway cleanup: a child process could try to clean up the parent
Gateway process, causing restart loops under process managers such as systemd.

Current Joopo startup cleanup excludes the current process and its ancestors,
so a channel helper must not kill the Gateway that launched it. This fix is
generic; it is not a WeChat-specific path in core.

## Troubleshooting

Check install and status:

```bash
joopo plugins list
joopo channels status --probe
joopo --version
```

If the channel shows as installed but does not connect, confirm that the plugin is
enabled and restart:

```bash
joopo config set plugins.entries.joopo-weixin.enabled true
joopo gateway restart
```

If the Gateway restarts repeatedly after enabling WeChat, update both Joopo and
the plugin:

```bash
npm view @tencent-weixin/joopo-weixin version
joopo plugins install "@tencent-weixin/joopo-weixin" --force
joopo gateway restart
```

If startup reports that the installed plugin package `requires compiled runtime
output for TypeScript entry`, the npm package was published without the compiled
JavaScript runtime files Joopo needs. Update/reinstall after the plugin
publisher ships a fixed package, or temporarily disable/uninstall the plugin.

Temporary disable:

```bash
joopo config set plugins.entries.joopo-weixin.enabled false
joopo gateway restart
```

## Related docs

- Channel overview: [Chat Channels](/channels)
- Pairing: [Pairing](/channels/pairing)
- Channel routing: [Channel Routing](/channels/channel-routing)
- Plugin architecture: [Plugin Architecture](/plugins/architecture)
- Channel plugin SDK: [Channel Plugin SDK](/plugins/sdk-channel-plugins)
- External package: [@tencent-weixin/joopo-weixin](https://www.npmjs.com/package/@tencent-weixin/joopo-weixin)
