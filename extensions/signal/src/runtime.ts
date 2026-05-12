import type { PluginRuntime } from "joopo/plugin-sdk/core";
import { createPluginRuntimeStore } from "joopo/plugin-sdk/runtime-store";

const { setRuntime: setSignalRuntime, clearRuntime: clearSignalRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "signal",
    errorMessage: "Signal runtime not initialized",
  });
export { clearSignalRuntime, setSignalRuntime };
