import { describeOpenAIProviderRuntimeContract } from "joopo/plugin-sdk/provider-test-contracts";

describeOpenAIProviderRuntimeContract(() => import("./index.js"));
