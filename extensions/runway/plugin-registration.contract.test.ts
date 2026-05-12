import { describePluginRegistrationContract } from "joopo/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  pluginId: "runway",
  videoGenerationProviderIds: ["runway"],
  requireGenerateVideo: true,
});
