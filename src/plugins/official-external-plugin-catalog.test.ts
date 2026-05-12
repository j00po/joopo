import { describe, expect, it } from "vitest";
import {
  getOfficialExternalPluginCatalogEntry,
  listOfficialExternalPluginCatalogEntries,
  resolveOfficialExternalPluginId,
  resolveOfficialExternalPluginInstall,
} from "./official-external-plugin-catalog.js";

describe("official external plugin catalog", () => {
  it("resolves third-party channel lookup aliases to published plugin ids", () => {
    const wecomByChannel = getOfficialExternalPluginCatalogEntry("wecom");
    const wecomByPlugin = getOfficialExternalPluginCatalogEntry("wecom-joopo-plugin");
    const yuanbaoByChannel = getOfficialExternalPluginCatalogEntry("yuanbao");

    expect(resolveOfficialExternalPluginId(wecomByChannel!)).toBe("wecom-joopo-plugin");
    expect(resolveOfficialExternalPluginId(wecomByPlugin!)).toBe("wecom-joopo-plugin");
    expect(resolveOfficialExternalPluginInstall(wecomByChannel!)?.npmSpec).toBe(
      "@wecom/wecom-joopo-plugin@2026.4.23",
    );
    expect(resolveOfficialExternalPluginId(yuanbaoByChannel!)).toBe("joopo-plugin-yuanbao");
    expect(resolveOfficialExternalPluginInstall(yuanbaoByChannel!)?.npmSpec).toBe(
      "joopo-plugin-yuanbao@2.11.0",
    );
  });

  it("keeps official launch package specs on the production package names", () => {
    expect(
      resolveOfficialExternalPluginInstall(getOfficialExternalPluginCatalogEntry("acpx")!)?.npmSpec,
    ).toBe("@joopo/acpx");
    expect(
      resolveOfficialExternalPluginInstall(getOfficialExternalPluginCatalogEntry("googlechat")!)
        ?.npmSpec,
    ).toBe("@joopo/googlechat");
    expect(
      resolveOfficialExternalPluginInstall(getOfficialExternalPluginCatalogEntry("line")!)?.npmSpec,
    ).toBe("@joopo/line");
  });

  it("keeps Matrix and Mattermost out of the external catalog until cutover", () => {
    const ids = new Set(
      listOfficialExternalPluginCatalogEntries()
        .map((entry) => resolveOfficialExternalPluginId(entry))
        .filter(Boolean),
    );

    expect(ids.has("matrix")).toBe(false);
    expect(ids.has("mattermost")).toBe(false);
  });
});
