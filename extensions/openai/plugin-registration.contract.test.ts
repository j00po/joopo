import { pluginRegistrationContractCases } from "joopo/plugin-sdk/plugin-test-contracts";
import { describePluginRegistrationContract } from "joopo/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  ...pluginRegistrationContractCases.openai,
  videoGenerationProviderIds: ["openai"],
  requireGenerateImage: true,
  requireGenerateVideo: true,
});
