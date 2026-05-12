import { defineBundledChannelSetupEntry } from "joopo/plugin-sdk/channel-entry-contract";

export default defineBundledChannelSetupEntry({
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./api.js",
    exportName: "lineSetupPlugin",
  },
});
