import type { PluginRuntime } from "joopo/plugin-sdk/core";
import { createPluginRuntimeStore } from "joopo/plugin-sdk/runtime-store";

const { setRuntime: setIMessageRuntime } = createPluginRuntimeStore<PluginRuntime>({
  pluginId: "imessage",
  errorMessage: "iMessage runtime not initialized",
});
export { setIMessageRuntime };
