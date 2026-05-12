import { describe, expect, it } from "vitest";
import { getChannelPluginCatalogEntry } from "./catalog.js";

describe("channel plugin catalog", () => {
  it("keeps third-party channel ids mapped with catalog install trust", () => {
    const options = {
      workspaceDir: "/tmp/joopo-channel-catalog-empty-workspace",
      env: {},
    };

    expect(getChannelPluginCatalogEntry("wecom", options)).toEqual(
      expect.objectContaining({
        id: "wecom",
        pluginId: "wecom-joopo-plugin",
        trustedSourceLinkedOfficialInstall: true,
        install: expect.objectContaining({
          npmSpec: "@wecom/wecom-joopo-plugin@2026.4.23",
        }),
      }),
    );
    expect(getChannelPluginCatalogEntry("yuanbao", options)).toEqual(
      expect.objectContaining({
        id: "yuanbao",
        pluginId: "joopo-plugin-yuanbao",
        trustedSourceLinkedOfficialInstall: true,
        install: expect.objectContaining({
          npmSpec: "joopo-plugin-yuanbao@2.11.0",
        }),
      }),
    );
  });
});
