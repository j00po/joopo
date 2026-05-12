import { describeGithubCopilotProviderRuntimeContract } from "joopo/plugin-sdk/provider-test-contracts";

describeGithubCopilotProviderRuntimeContract(() => import("./index.js"));
