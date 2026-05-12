import { describeGoogleProviderRuntimeContract } from "joopo/plugin-sdk/provider-test-contracts";

describeGoogleProviderRuntimeContract(() => import("./index.js"));
