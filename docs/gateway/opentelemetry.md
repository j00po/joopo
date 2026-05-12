---
summary: "Export Joopo diagnostics to any OpenTelemetry collector via the diagnostics-otel plugin (OTLP/HTTP)"
title: "OpenTelemetry export"
read_when:
  - You want to send Joopo model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

Joopo exports diagnostics through the official `diagnostics-otel` plugin
using **OTLP/HTTP (protobuf)**. Any collector or backend that accepts OTLP/HTTP
works without code changes. For local file logs and how to read them, see
[Logging](/logging).

## How it fits together

- **Diagnostics events** are structured, in-process records emitted by the
  Gateway and bundled plugins for model runs, message flow, sessions, queues,
  and exec.
- **`diagnostics-otel` plugin** subscribes to those events and exports them as
  OpenTelemetry **metrics**, **traces**, and **logs** over OTLP/HTTP.
- **Provider calls** receive a W3C `traceparent` header from Joopo's
  trusted model-call span context when the provider transport accepts custom
  headers. Plugin-emitted trace context is not propagated.
- Exporters only attach when both the diagnostics surface and the plugin are
  enabled, so the in-process cost stays near zero by default.

## Quick start

For packaged installs, install the plugin first:

```bash
joopo plugins install joopohub:@joopo/diagnostics-otel
```

```json5
{
  plugins: {
    allow: ["diagnostics-otel"],
    entries: {
      "diagnostics-otel": { enabled: true },
    },
  },
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      protocol: "http/protobuf",
      serviceName: "joopo-gateway",
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2,
      flushIntervalMs: 60000,
    },
  },
}
```

You can also enable the plugin from the CLI:

```bash
joopo plugins enable diagnostics-otel
```

<Note>
`protocol` currently supports `http/protobuf` only. `grpc` is ignored.
</Note>

## Signals exported

| Signal      | What goes in it                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Metrics** | Counters and histograms for token usage, cost, run duration, message flow, Talk events, queue lanes, session state/recovery, exec, and memory pressure. |
| **Traces**  | Spans for model usage, model calls, harness lifecycle, tool execution, exec, webhook/message processing, context assembly, and tool loops.              |
| **Logs**    | Structured `logging.file` records exported over OTLP when `diagnostics.otel.logs` is enabled.                                                           |

Toggle `traces`, `metrics`, and `logs` independently. All three default to on
when `diagnostics.otel.enabled` is true.

## Configuration reference

```json5
{
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      tracesEndpoint: "http://otel-collector:4318/v1/traces",
      metricsEndpoint: "http://otel-collector:4318/v1/metrics",
      logsEndpoint: "http://otel-collector:4318/v1/logs",
      protocol: "http/protobuf", // grpc is ignored
      serviceName: "joopo-gateway",
      headers: { "x-collector-token": "..." },
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2, // root-span sampler, 0.0..1.0
      flushIntervalMs: 60000, // metric export interval (min 1000ms)
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
      },
    },
  },
}
```

### Environment variables

| Variable                                                                                                          | Purpose                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | Override `diagnostics.otel.endpoint`. If the value already contains `/v1/traces`, `/v1/metrics`, or `/v1/logs`, it is used as-is.                                                                                                          |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Signal-specific endpoint overrides used when the matching `diagnostics.otel.*Endpoint` config key is unset. Signal-specific config wins over signal-specific env, which wins over the shared endpoint.                                     |
| `OTEL_SERVICE_NAME`                                                                                               | Override `diagnostics.otel.serviceName`.                                                                                                                                                                                                   |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | Override the wire protocol (only `http/protobuf` is honored today).                                                                                                                                                                        |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | Set to `gen_ai_latest_experimental` to emit the latest experimental GenAI span attribute (`gen_ai.provider.name`) instead of the legacy `gen_ai.system`. GenAI metrics always use bounded, low-cardinality semantic attributes regardless. |
| `JOOPO_OTEL_PRELOADED`                                                                                            | Set to `1` when another preload or host process already registered the global OpenTelemetry SDK. The plugin then skips its own NodeSDK lifecycle but still wires diagnostic listeners and honors `traces`/`metrics`/`logs`.                |

## Privacy and content capture

Raw model/tool content is **not** exported by default. Spans carry bounded
identifiers (channel, provider, model, error category, hash-only request ids)
and never include prompt text, response text, tool inputs, tool outputs, or
session keys.
Talk metrics export only bounded event metadata such as mode, transport,
provider, and event type. They do not include transcripts, audio payloads,
session ids, turn ids, call ids, room ids, or handoff tokens.

Outbound model requests may include a W3C `traceparent` header. That header is
generated only from Joopo-owned diagnostic trace context for the active model
call. Existing caller-supplied `traceparent` headers are replaced, so plugins or
custom provider options cannot spoof cross-service trace ancestry.

Set `diagnostics.otel.captureContent.*` to `true` only when your collector and
retention policy are approved for prompt, response, tool, or system-prompt
text. Each subkey is opt-in independently:

- `inputMessages` - user prompt content.
- `outputMessages` - model response content.
- `toolInputs` - tool argument payloads.
- `toolOutputs` - tool result payloads.
- `systemPrompt` - assembled system/developer prompt.

When any subkey is enabled, model and tool spans get bounded, redacted
`joopo.content.*` attributes for that class only.

## Sampling and flushing

- **Traces:** `diagnostics.otel.sampleRate` (root-span only, `0.0` drops all,
  `1.0` keeps all).
- **Metrics:** `diagnostics.otel.flushIntervalMs` (minimum `1000`).
- **Logs:** OTLP logs respect `logging.level` (file log level). They use the
  diagnostic log-record redaction path, not console formatting. High-volume
  installs should prefer OTLP collector sampling/filtering over local sampling.
- **File-log correlation:** JSONL file logs include top-level `traceId`,
  `spanId`, `parentSpanId`, and `traceFlags` when the log call carries a valid
  diagnostic trace context, which lets log processors join local log lines with
  exported spans.
- **Request correlation:** Gateway HTTP requests and WebSocket frames create an
  internal request trace scope. Logs and diagnostic events inside that scope
  inherit the request trace by default, while agent run and model-call spans are
  created as children so provider `traceparent` headers stay on the same trace.

## Exported metrics

### Model usage

- `joopo.tokens` (counter, attrs: `joopo.token`, `joopo.channel`, `joopo.provider`, `joopo.model`, `joopo.agent`)
- `joopo.cost.usd` (counter, attrs: `joopo.channel`, `joopo.provider`, `joopo.model`)
- `joopo.run.duration_ms` (histogram, attrs: `joopo.channel`, `joopo.provider`, `joopo.model`)
- `joopo.context.tokens` (histogram, attrs: `joopo.context`, `joopo.channel`, `joopo.provider`, `joopo.model`)
- `gen_ai.client.token.usage` (histogram, GenAI semantic-conventions metric, attrs: `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogram, seconds, GenAI semantic-conventions metric, attrs: `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, optional `error.type`)
- `joopo.model_call.duration_ms` (histogram, attrs: `joopo.provider`, `joopo.model`, `joopo.api`, `joopo.transport`, plus `joopo.errorCategory` and `joopo.failureKind` on classified errors)
- `joopo.model_call.request_bytes` (histogram, UTF-8 byte size of the final model request payload; no raw payload content)
- `joopo.model_call.response_bytes` (histogram, UTF-8 byte size of streamed model response events; no raw response content)
- `joopo.model_call.time_to_first_byte_ms` (histogram, elapsed time before the first streamed response event)

### Message flow

- `joopo.webhook.received` (counter, attrs: `joopo.channel`, `joopo.webhook`)
- `joopo.webhook.error` (counter, attrs: `joopo.channel`, `joopo.webhook`)
- `joopo.webhook.duration_ms` (histogram, attrs: `joopo.channel`, `joopo.webhook`)
- `joopo.message.queued` (counter, attrs: `joopo.channel`, `joopo.source`)
- `joopo.message.processed` (counter, attrs: `joopo.channel`, `joopo.outcome`)
- `joopo.message.duration_ms` (histogram, attrs: `joopo.channel`, `joopo.outcome`)
- `joopo.message.delivery.started` (counter, attrs: `joopo.channel`, `joopo.delivery.kind`)
- `joopo.message.delivery.duration_ms` (histogram, attrs: `joopo.channel`, `joopo.delivery.kind`, `joopo.outcome`, `joopo.errorCategory`)

### Talk

- `joopo.talk.event` (counter, attrs: `joopo.talk.event_type`, `joopo.talk.mode`, `joopo.talk.transport`, `joopo.talk.brain`, `joopo.talk.provider`)
- `joopo.talk.event.duration_ms` (histogram, attrs: same as `joopo.talk.event`; emitted when a Talk event reports duration)
- `joopo.talk.audio.bytes` (histogram, attrs: same as `joopo.talk.event`; emitted for Talk audio frame events that report byte length)

### Queues and sessions

- `joopo.queue.lane.enqueue` (counter, attrs: `joopo.lane`)
- `joopo.queue.lane.dequeue` (counter, attrs: `joopo.lane`)
- `joopo.queue.depth` (histogram, attrs: `joopo.lane` or `joopo.channel=heartbeat`)
- `joopo.queue.wait_ms` (histogram, attrs: `joopo.lane`)
- `joopo.session.state` (counter, attrs: `joopo.state`, `joopo.reason`)
- `joopo.session.stuck` (counter, attrs: `joopo.state`; emitted only for stale session bookkeeping with no active work)
- `joopo.session.stuck_age_ms` (histogram, attrs: `joopo.state`; emitted only for stale session bookkeeping with no active work)
- `joopo.session.recovery.requested` (counter, attrs: `joopo.state`, `joopo.action`, `joopo.active_work_kind`, `joopo.reason`)
- `joopo.session.recovery.completed` (counter, attrs: `joopo.state`, `joopo.action`, `joopo.status`, `joopo.active_work_kind`, `joopo.reason`)
- `joopo.session.recovery.age_ms` (histogram, attrs: same as the matching recovery counter)
- `joopo.run.attempt` (counter, attrs: `joopo.attempt`)

### Session liveness telemetry

`diagnostics.stuckSessionWarnMs` is the no-progress age threshold for session
liveness diagnostics. A `processing` session does not age toward this threshold
while Joopo observes reply, tool, status, block, or ACP runtime progress.
Typing keepalives are not counted as progress, so a silent model or harness can
still be detected.

Joopo classifies sessions by the work it can still observe:

- `session.long_running`: active embedded work, model calls, or tool calls are
  still making progress.
- `session.stalled`: active work exists, but the active run has not reported
  recent progress. Stalled embedded runs stay observe-only at first, then
  abort-drain after `diagnostics.stuckSessionAbortMs` with no progress so queued
  turns behind the lane can resume. When unset, the abort threshold defaults to
  the safer extended window of at least 10 minutes and 5x
  `diagnostics.stuckSessionWarnMs`.
- `session.stuck`: stale session bookkeeping with no active work. This releases
  the affected session lane immediately.

Recovery emits structured `session.recovery.requested` and
`session.recovery.completed` events. Diagnostic session state is marked idle
only after a mutating recovery outcome (`aborted` or `released`) and only if the
same processing generation is still current.

Only `session.stuck` emits the `joopo.session.stuck` counter, the
`joopo.session.stuck_age_ms` histogram, and the `joopo.session.stuck`
span. Repeated `session.stuck` diagnostics back off while the session remains
unchanged, so dashboards should alert on sustained increases rather than every
heartbeat tick. For the config knob and defaults, see
[Configuration reference](/gateway/configuration-reference#diagnostics).

### Harness lifecycle

- `joopo.harness.duration_ms` (histogram, attrs: `joopo.harness.id`, `joopo.harness.plugin`, `joopo.outcome`, `joopo.harness.phase` on errors)

### Exec

- `joopo.exec.duration_ms` (histogram, attrs: `joopo.exec.target`, `joopo.exec.mode`, `joopo.outcome`, `joopo.failureKind`)

### Diagnostics internals (memory and tool loop)

- `joopo.memory.heap_used_bytes` (histogram, attrs: `joopo.memory.kind`)
- `joopo.memory.rss_bytes` (histogram)
- `joopo.memory.pressure` (counter, attrs: `joopo.memory.level`)
- `joopo.tool.loop.iterations` (counter, attrs: `joopo.toolName`, `joopo.outcome`)
- `joopo.tool.loop.duration_ms` (histogram, attrs: `joopo.toolName`, `joopo.outcome`)

## Exported spans

- `joopo.model.usage`
  - `joopo.channel`, `joopo.provider`, `joopo.model`
  - `joopo.tokens.*` (input/output/cache_read/cache_write/total)
  - `gen_ai.system` by default, or `gen_ai.provider.name` when the latest GenAI semantic conventions are opted in
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `joopo.run`
  - `joopo.outcome`, `joopo.channel`, `joopo.provider`, `joopo.model`, `joopo.errorCategory`
- `joopo.model.call`
  - `gen_ai.system` by default, or `gen_ai.provider.name` when the latest GenAI semantic conventions are opted in
  - `gen_ai.request.model`, `gen_ai.operation.name`, `joopo.provider`, `joopo.model`, `joopo.api`, `joopo.transport`
  - `joopo.errorCategory` and optional `joopo.failureKind` on errors
  - `joopo.model_call.request_bytes`, `joopo.model_call.response_bytes`, `joopo.model_call.time_to_first_byte_ms`
  - `joopo.provider.request_id_hash` (bounded SHA-based hash of the upstream provider request id; raw ids are not exported)
- `joopo.harness.run`
  - `joopo.harness.id`, `joopo.harness.plugin`, `joopo.outcome`, `joopo.provider`, `joopo.model`, `joopo.channel`
  - On completion: `joopo.harness.result_classification`, `joopo.harness.yield_detected`, `joopo.harness.items.started`, `joopo.harness.items.completed`, `joopo.harness.items.active`
  - On error: `joopo.harness.phase`, `joopo.errorCategory`, optional `joopo.harness.cleanup_failed`
- `joopo.tool.execution`
  - `gen_ai.tool.name`, `joopo.toolName`, `joopo.errorCategory`, `joopo.tool.params.*`
- `joopo.exec`
  - `joopo.exec.target`, `joopo.exec.mode`, `joopo.outcome`, `joopo.failureKind`, `joopo.exec.command_length`, `joopo.exec.exit_code`, `joopo.exec.timed_out`
- `joopo.webhook.processed`
  - `joopo.channel`, `joopo.webhook`
- `joopo.webhook.error`
  - `joopo.channel`, `joopo.webhook`, `joopo.error`
- `joopo.message.processed`
  - `joopo.channel`, `joopo.outcome`, `joopo.reason`
- `joopo.message.delivery`
  - `joopo.channel`, `joopo.delivery.kind`, `joopo.outcome`, `joopo.errorCategory`, `joopo.delivery.result_count`
- `joopo.session.stuck`
  - `joopo.state`, `joopo.ageMs`, `joopo.queueDepth`
- `joopo.context.assembled`
  - `joopo.prompt.size`, `joopo.history.size`, `joopo.context.tokens`, `joopo.errorCategory` (no prompt, history, response, or session-key content)
- `joopo.tool.loop`
  - `joopo.toolName`, `joopo.outcome`, `joopo.iterations`, `joopo.errorCategory` (no loop messages, params, or tool output)
- `joopo.memory.pressure`
  - `joopo.memory.level`, `joopo.memory.heap_used_bytes`, `joopo.memory.rss_bytes`

When content capture is explicitly enabled, model and tool spans can also
include bounded, redacted `joopo.content.*` attributes for the specific
content classes you opted into.

## Diagnostic event catalog

The events below back the metrics and spans above. Plugins can also subscribe
to them directly without OTLP export.

**Model usage**

- `model.usage` - tokens, cost, duration, context, provider/model/channel,
  session ids. `usage` is provider/turn accounting for cost and telemetry;
  `context.used` is the current prompt/context snapshot and can be lower than
  provider `usage.total` when cached input or tool-loop calls are involved.

**Message flow**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**Queue and session**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `diagnostic.heartbeat` (aggregate counters: webhooks/queue/session)

**Harness lifecycle**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` -
  per-run lifecycle for the agent harness. Includes `harnessId`, optional
  `pluginId`, provider/model/channel, and run id. Completion adds
  `durationMs`, `outcome`, optional `resultClassification`, `yieldDetected`,
  and `itemLifecycle` counts. Errors add `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`), `errorCategory`, and
  optional `cleanupFailed`.

**Exec**

- `exec.process.completed` - terminal outcome, duration, target, mode, exit
  code, and failure kind. Command text and working directories are not
  included.

## Without an exporter

You can keep diagnostics events available to plugins or custom sinks without
running `diagnostics-otel`:

```json5
{
  diagnostics: { enabled: true },
}
```

For targeted debug output without raising `logging.level`, use diagnostics
flags. Flags are case-insensitive and support wildcards (e.g. `telegram.*` or
`*`):

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

Or as a one-off env override:

```bash
JOOPO_DIAGNOSTICS=telegram.http,telegram.payload joopo gateway
```

Flag output goes to the standard log file (`logging.file`) and is still
redacted by `logging.redactSensitive`. Full guide:
[Diagnostics flags](/diagnostics/flags).

## Disable

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

You can also leave `diagnostics-otel` out of `plugins.allow`, or run
`joopo plugins disable diagnostics-otel`.

## Related

- [Logging](/logging) - file logs, console output, CLI tailing, and the Control UI Logs tab
- [Gateway logging internals](/gateway/logging) - WS log styles, subsystem prefixes, and console capture
- [Diagnostics flags](/diagnostics/flags) - targeted debug-log flags
- [Diagnostics export](/gateway/diagnostics) - operator support-bundle tool (separate from OTEL export)
- [Configuration reference](/gateway/configuration-reference#diagnostics) - full `diagnostics.*` field reference
