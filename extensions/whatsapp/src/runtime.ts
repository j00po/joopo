import type { PluginRuntime } from "joopo/plugin-sdk/core";
import { createPluginRuntimeStore } from "joopo/plugin-sdk/runtime-store";

const { setRuntime: setWhatsAppRuntime, getRuntime: getWhatsAppRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "whatsapp",
    errorMessage: "WhatsApp runtime not initialized",
  });
export { getWhatsAppRuntime, setWhatsAppRuntime };
