import { describePluginRegistrationContract } from "joopo/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  pluginId: "gradium",
  speechProviderIds: ["gradium"],
});
