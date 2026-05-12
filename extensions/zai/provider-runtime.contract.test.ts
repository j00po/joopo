import { describeZAIProviderRuntimeContract } from "joopo/plugin-sdk/provider-test-contracts";

describeZAIProviderRuntimeContract(() => import("./index.js"));
