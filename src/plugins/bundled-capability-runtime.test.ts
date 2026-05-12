import { describe, expect, it } from "vitest";
import { buildVitestCapabilityShimAliasMap } from "./bundled-capability-runtime.js";

describe("buildVitestCapabilityShimAliasMap", () => {
  it("keeps scoped and unscoped capability shim aliases aligned", () => {
    const aliasMap = buildVitestCapabilityShimAliasMap();

    expect(aliasMap["joopo/plugin-sdk/config-runtime"]).toBe(
      aliasMap["@joopo/plugin-sdk/config-runtime"],
    );
    expect(aliasMap["joopo/plugin-sdk/media-runtime"]).toBe(
      aliasMap["@joopo/plugin-sdk/media-runtime"],
    );
    expect(aliasMap["joopo/plugin-sdk/provider-onboard"]).toBe(
      aliasMap["@joopo/plugin-sdk/provider-onboard"],
    );
    expect(aliasMap["joopo/plugin-sdk/speech-core"]).toBe(
      aliasMap["@joopo/plugin-sdk/speech-core"],
    );
  });
});
