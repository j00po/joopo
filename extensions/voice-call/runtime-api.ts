// Private runtime barrel for the bundled Voice Call extension.
// Keep this barrel thin and aligned with the local extension surface.

export { definePluginEntry } from "joopo/plugin-sdk/plugin-entry";
export type { JoopoPluginApi } from "joopo/plugin-sdk/plugin-entry";
export type { GatewayRequestHandlerOptions } from "joopo/plugin-sdk/gateway-runtime";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "joopo/plugin-sdk/webhook-request-guards";
export { fetchWithSsrFGuard, isBlockedHostnameOrIp } from "joopo/plugin-sdk/ssrf-runtime";
export type { SessionEntry } from "joopo/plugin-sdk/session-store-runtime";
export {
  TtsAutoSchema,
  TtsConfigSchema,
  TtsModeSchema,
  TtsProviderSchema,
} from "joopo/plugin-sdk/tts-runtime";
export { sleep } from "joopo/plugin-sdk/runtime-env";
