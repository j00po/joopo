import { describeVeniceProviderRuntimeContract } from "joopo/plugin-sdk/provider-test-contracts";

describeVeniceProviderRuntimeContract(() => import("./index.js"));
