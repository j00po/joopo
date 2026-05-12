import { describePluginRegistrationContract } from "joopo/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  pluginId: "xai",
  providerIds: ["xai"],
  webSearchProviderIds: ["grok"],
  mediaUnderstandingProviderIds: ["xai"],
  videoGenerationProviderIds: ["xai"],
  toolNames: ["code_execution", "x_search"],
  requireGenerateVideo: true,
});
