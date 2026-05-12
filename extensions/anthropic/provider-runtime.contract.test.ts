import { describeAnthropicProviderRuntimeContract } from "joopo/plugin-sdk/provider-test-contracts";

describeAnthropicProviderRuntimeContract(() => import("./index.js"));
