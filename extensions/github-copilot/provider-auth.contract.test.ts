import { describeGithubCopilotProviderAuthContract } from "joopo/plugin-sdk/provider-test-contracts";

describeGithubCopilotProviderAuthContract(() => import("./index.js"));
