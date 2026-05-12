import fs from "node:fs";
import path from "node:path";
import { bundledPluginRoot } from "joopo/plugin-sdk/test-fixtures";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildOfficialChannelCatalog,
  OFFICIAL_CHANNEL_CATALOG_RELATIVE_PATH,
  writeOfficialChannelCatalog,
} from "../scripts/write-official-channel-catalog.mjs";
import { describePluginInstallSource } from "../src/plugins/install-source-info.js";
import { cleanupTempDirs, makeTempRepoRoot, writeJsonFile } from "./helpers/temp-repo.js";

const tempDirs: string[] = [];

function makeRepoRoot(prefix: string): string {
  return makeTempRepoRoot(tempDirs, prefix);
}

function writeJson(filePath: string, value: unknown): void {
  writeJsonFile(filePath, value);
}

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe("buildOfficialChannelCatalog", () => {
  it("includes publishable official channel plugins and skips non-publishable entries", () => {
    const repoRoot = makeRepoRoot("joopo-official-channel-catalog-");
    writeJson(path.join(repoRoot, "extensions", "whatsapp", "package.json"), {
      name: "@joopo/whatsapp",
      version: "2026.3.23",
      description: "Joopo WhatsApp channel plugin",
      joopo: {
        channel: {
          id: "whatsapp",
          label: "WhatsApp",
          selectionLabel: "WhatsApp (QR link)",
          detailLabel: "WhatsApp Web",
          docsPath: "/channels/whatsapp",
          blurb: "works with your own number; recommend a separate phone + eSIM.",
        },
        install: {
          npmSpec: "@joopo/whatsapp",
          localPath: bundledPluginRoot("whatsapp"),
          defaultChoice: "npm",
        },
        release: {
          publishToNpm: true,
        },
      },
    });
    writeJson(path.join(repoRoot, "extensions", "local-only", "package.json"), {
      name: "@joopo/local-only",
      joopo: {
        channel: {
          id: "local-only",
          label: "Local Only",
          selectionLabel: "Local Only",
          docsPath: "/channels/local-only",
          blurb: "dev only",
        },
        install: {
          localPath: bundledPluginRoot("local-only"),
        },
        release: {
          publishToNpm: false,
        },
      },
    });

    expect(buildOfficialChannelCatalog({ repoRoot }).entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "@wecom/wecom-joopo-plugin",
          joopo: expect.objectContaining({
            plugin: {
              id: "wecom-joopo-plugin",
              label: "WeCom",
            },
            channel: expect.objectContaining({
              id: "wecom",
              label: "WeCom",
            }),
            install: {
              npmSpec: "@wecom/wecom-joopo-plugin@2026.4.23",
              defaultChoice: "npm",
              expectedIntegrity:
                "sha512-bnzfdIEEu1/LFvcdyjaTkyxt27w6c7dqhkPezU62OWaqmcdFsUGR3T55USK/O9pIKsNcnL1Tnu1pqKYCWHFgWQ==",
            },
          }),
        }),
        expect.objectContaining({
          name: "joopo-plugin-yuanbao",
          joopo: expect.objectContaining({
            plugin: {
              id: "joopo-plugin-yuanbao",
              label: "Yuanbao",
            },
            channel: expect.objectContaining({
              id: "yuanbao",
              label: "Yuanbao",
            }),
            install: {
              npmSpec: "joopo-plugin-yuanbao@2.11.0",
              defaultChoice: "npm",
              expectedIntegrity:
                "sha512-lYmBrU71ox3v7dzRqaltvzTXPcMjjgYrNqpBj5HIBkXgEFkXRRG8wplXg9Fub41/FjsSPn3WAbYpdTc+k+jsHg==",
            },
          }),
        }),
        expect.objectContaining({
          name: "@joopo/whatsapp",
          description: "Joopo WhatsApp channel plugin",
          source: "official",
          joopo: expect.objectContaining({
            channel: expect.objectContaining({
              id: "whatsapp",
              label: "WhatsApp",
              selectionLabel: "WhatsApp (QR link)",
              detailLabel: "WhatsApp Web",
              docsPath: "/channels/whatsapp",
            }),
            install: expect.objectContaining({
              npmSpec: "@joopo/whatsapp",
              defaultChoice: "npm",
            }),
          }),
        }),
      ]),
    );
  });

  it("keeps third-party official external catalog npm sources exactly pinned", () => {
    const repoRoot = makeRepoRoot("joopo-official-channel-catalog-policy-");
    const entries = buildOfficialChannelCatalog({ repoRoot }).entries.filter(
      (entry) => entry.source === "external" && !entry.name?.startsWith("@joopo/"),
    );

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const installSource = describePluginInstallSource(entry.joopo?.install ?? {});
      expect(installSource.warnings).toEqual([]);
      expect(installSource.npm?.pinState).toBe("exact-with-integrity");
    }
  });

  it("allows official Joopo channel npm specs without integrity during launch", () => {
    const repoRoot = makeRepoRoot("joopo-official-channel-catalog-joopo-policy-");
    const twitch = buildOfficialChannelCatalog({ repoRoot }).entries.find(
      (entry) => entry.joopo?.channel?.id === "twitch",
    );

    expect(twitch).toEqual(
      expect.objectContaining({
        name: "@joopo/twitch",
        joopo: expect.objectContaining({
          install: {
            npmSpec: "@joopo/twitch",
            defaultChoice: "npm",
            minHostVersion: ">=2026.4.10",
          },
        }),
      }),
    );
    const installSource = describePluginInstallSource(twitch?.joopo?.install ?? {});
    expect(installSource.npm?.pinState).toBe("floating-without-integrity");
    expect(installSource.warnings).toEqual(["npm-spec-floating", "npm-spec-missing-integrity"]);
  });

  it("preserves JoopoHub specs when generating publishable channel catalog entries", () => {
    const repoRoot = makeRepoRoot("joopo-official-channel-catalog-joopohub-");
    writeJson(path.join(repoRoot, "extensions", "storepack-chat", "package.json"), {
      name: "@joopo/storepack-chat",
      joopo: {
        channel: {
          id: "storepack-chat",
          label: "Storepack Chat",
          selectionLabel: "Storepack Chat",
          docsPath: "/channels/storepack-chat",
          blurb: "storepack-first channel",
        },
        install: {
          joopohubSpec: "joopohub:@joopo/storepack-chat",
          npmSpec: "@joopo/storepack-chat",
          defaultChoice: "joopohub",
        },
        release: {
          publishToNpm: true,
        },
      },
    });

    const entry = buildOfficialChannelCatalog({ repoRoot }).entries.find(
      (candidate) => candidate.joopo?.channel?.id === "storepack-chat",
    );

    expect(entry?.joopo?.install).toEqual({
      joopohubSpec: "joopohub:@joopo/storepack-chat",
      npmSpec: "@joopo/storepack-chat",
      defaultChoice: "joopohub",
    });
  });

  it("writes the official catalog under dist", () => {
    const repoRoot = makeRepoRoot("joopo-official-channel-catalog-write-");
    writeJson(path.join(repoRoot, "extensions", "whatsapp", "package.json"), {
      name: "@joopo/whatsapp",
      joopo: {
        channel: {
          id: "whatsapp",
          label: "WhatsApp",
          selectionLabel: "WhatsApp",
          docsPath: "/channels/whatsapp",
          blurb: "wa",
        },
        install: {
          npmSpec: "@joopo/whatsapp",
        },
        release: {
          publishToNpm: true,
        },
      },
    });

    writeOfficialChannelCatalog({ repoRoot });

    const outputPath = path.join(repoRoot, OFFICIAL_CHANNEL_CATALOG_RELATIVE_PATH);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(outputPath, "utf8")).entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "@wecom/wecom-joopo-plugin",
        }),
        expect.objectContaining({
          name: "joopo-plugin-yuanbao",
        }),
        expect.objectContaining({
          name: "@joopo/whatsapp",
          source: "official",
          joopo: expect.objectContaining({
            channel: expect.objectContaining({
              id: "whatsapp",
              label: "WhatsApp",
              selectionLabel: "WhatsApp (QR link)",
              docsPath: "/channels/whatsapp",
            }),
            install: expect.objectContaining({
              npmSpec: "@joopo/whatsapp",
              defaultChoice: "npm",
            }),
          }),
        }),
      ]),
    );
    const whatsappEntries = JSON.parse(fs.readFileSync(outputPath, "utf8")).entries.filter(
      (entry: { joopo?: { channel?: { id?: string } } }) => entry.joopo?.channel?.id === "whatsapp",
    );
    expect(whatsappEntries).toHaveLength(1);
  });
});
