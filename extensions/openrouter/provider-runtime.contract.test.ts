import { describeOpenRouterProviderRuntimeContract } from "joopo/plugin-sdk/provider-test-contracts";

describeOpenRouterProviderRuntimeContract(() => import("./index.js"));
