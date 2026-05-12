import { beforeEach, describe, expect, it, vi } from "vitest";

type LoadJoopoProviderIndex =
  typeof import("../model-catalog/index.js").loadJoopoProviderIndex;
type LoadPluginRegistrySnapshot = typeof import("./plugin-registry.js").loadPluginRegistrySnapshot;
type ResolveManifestProviderAuthChoices =
  typeof import("./provider-auth-choices.js").resolveManifestProviderAuthChoices;
type ListOfficialExternalProviderCatalogEntries =
  typeof import("./official-external-plugin-catalog.js").listOfficialExternalProviderCatalogEntries;

const loadJoopoProviderIndex = vi.hoisted(() =>
  vi.fn<LoadJoopoProviderIndex>(() => ({ version: 1, providers: {} })),
);
vi.mock("../model-catalog/index.js", async () => {
  const actual = await vi.importActual<typeof import("../model-catalog/index.js")>(
    "../model-catalog/index.js",
  );
  return {
    ...actual,
    loadJoopoProviderIndex,
  };
});

const loadPluginRegistrySnapshot = vi.hoisted(() =>
  vi.fn<LoadPluginRegistrySnapshot>(() => ({
    version: 1,
    hostContractVersion: "test",
    compatRegistryVersion: "test",
    migrationVersion: 1,
    policyHash: "test",
    generatedAtMs: 0,
    installRecords: {},
    plugins: [],
    diagnostics: [],
  })),
);
vi.mock("./plugin-registry.js", () => ({
  loadPluginRegistrySnapshot,
}));

const resolveManifestProviderAuthChoices = vi.hoisted(() =>
  vi.fn<ResolveManifestProviderAuthChoices>(() => []),
);
vi.mock("./provider-auth-choices.js", () => ({
  resolveManifestProviderAuthChoices,
}));

const listOfficialExternalProviderCatalogEntries = vi.hoisted(() =>
  vi.fn<ListOfficialExternalProviderCatalogEntries>(() => []),
);
vi.mock("./official-external-plugin-catalog.js", async () => {
  const actual = await vi.importActual<typeof import("./official-external-plugin-catalog.js")>(
    "./official-external-plugin-catalog.js",
  );
  return {
    ...actual,
    listOfficialExternalProviderCatalogEntries,
  };
});

import {
  resolveProviderInstallCatalogEntries,
  resolveProviderInstallCatalogEntry,
} from "./provider-install-catalog.js";

describe("provider install catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadJoopoProviderIndex.mockReturnValue({ version: 1, providers: {} });
    loadPluginRegistrySnapshot.mockReturnValue({
      version: 1,
      hostContractVersion: "test",
      compatRegistryVersion: "test",
      migrationVersion: 1,
      policyHash: "test",
      generatedAtMs: 0,
      installRecords: {},
      plugins: [],
      diagnostics: [],
    });
    resolveManifestProviderAuthChoices.mockReturnValue([]);
    listOfficialExternalProviderCatalogEntries.mockReturnValue([]);
  });

  it("merges manifest auth-choice metadata with registry install metadata", () => {
    loadPluginRegistrySnapshot.mockReturnValue({
      version: 1,
      hostContractVersion: "test",
      compatRegistryVersion: "test",
      migrationVersion: 1,
      policyHash: "test",
      generatedAtMs: 0,
      installRecords: {},
      plugins: [
        {
          pluginId: "openai",
          origin: "bundled",
          manifestPath: "/repo/extensions/openai/joopo.plugin.json",
          manifestHash: "hash",
          rootDir: "/repo/extensions/openai",
          enabled: true,
          startup: {
            sidecar: false,
            memory: false,
            deferConfiguredChannelFullLoadUntilAfterListen: false,
            agentHarnesses: [],
          },
          compat: [],
          packageName: "@joopo/openai",
          packageInstall: {
            defaultChoice: "npm",
            npm: {
              spec: "@joopo/openai@1.2.3",
              packageName: "@joopo/openai",
              selector: "1.2.3",
              selectorKind: "exact-version",
              exactVersion: true,
              expectedIntegrity: "sha512-openai",
              pinState: "exact-with-integrity",
            },
            local: {
              path: "extensions/openai",
            },
            warnings: [],
          },
        },
      ],
      diagnostics: [],
    });
    resolveManifestProviderAuthChoices.mockReturnValue([
      {
        pluginId: "openai",
        providerId: "openai",
        methodId: "api-key",
        choiceId: "openai-api-key",
        choiceLabel: "OpenAI API key",
        groupId: "openai",
        groupLabel: "OpenAI",
      },
    ]);

    expect(resolveProviderInstallCatalogEntries()).toEqual([
      {
        pluginId: "openai",
        providerId: "openai",
        methodId: "api-key",
        choiceId: "openai-api-key",
        choiceLabel: "OpenAI API key",
        groupId: "openai",
        groupLabel: "OpenAI",
        label: "OpenAI",
        origin: "bundled",
        install: {
          npmSpec: "@joopo/openai@1.2.3",
          localPath: "extensions/openai",
          defaultChoice: "npm",
          expectedIntegrity: "sha512-openai",
        },
        installSource: {
          defaultChoice: "npm",
          npm: {
            spec: "@joopo/openai@1.2.3",
            packageName: "@joopo/openai",
            selector: "1.2.3",
            selectorKind: "exact-version",
            exactVersion: true,
            expectedIntegrity: "sha512-openai",
            pinState: "exact-with-integrity",
          },
          local: {
            path: "extensions/openai",
          },
          warnings: [],
        },
      },
    ]);
  });

  it("prefers durable install records over package-authored install intent", () => {
    loadPluginRegistrySnapshot.mockReturnValue({
      version: 1,
      hostContractVersion: "test",
      compatRegistryVersion: "test",
      migrationVersion: 1,
      policyHash: "test",
      generatedAtMs: 0,
      installRecords: {
        vllm: {
          source: "npm",
          spec: "@joopo/vllm",
          resolvedSpec: "@joopo/vllm@2.0.0",
          integrity: "sha512-vllm",
        },
      },
      plugins: [
        {
          pluginId: "vllm",
          origin: "global",
          manifestPath: "/Users/test/.joopo/plugins/vllm/joopo.plugin.json",
          manifestHash: "hash",
          rootDir: "/Users/test/.joopo/plugins/vllm",
          enabled: true,
          startup: {
            sidecar: false,
            memory: false,
            deferConfiguredChannelFullLoadUntilAfterListen: false,
            agentHarnesses: [],
          },
          compat: [],
          packageName: "@joopo/vllm",
          packageInstall: {
            npm: {
              spec: "@joopo/vllm-fork@1.0.0",
              packageName: "@joopo/vllm-fork",
              selector: "1.0.0",
              selectorKind: "exact-version",
              exactVersion: true,
              expectedIntegrity: "sha512-old",
              pinState: "exact-with-integrity",
            },
            warnings: [],
          },
        },
      ],
      diagnostics: [],
    });
    resolveManifestProviderAuthChoices.mockReturnValue([
      {
        pluginId: "vllm",
        providerId: "vllm",
        methodId: "server",
        choiceId: "vllm",
        choiceLabel: "vLLM",
        groupLabel: "vLLM",
      },
    ]);

    expect(resolveProviderInstallCatalogEntry("vllm")).toEqual({
      pluginId: "vllm",
      providerId: "vllm",
      methodId: "server",
      choiceId: "vllm",
      choiceLabel: "vLLM",
      groupLabel: "vLLM",
      label: "vLLM",
      origin: "global",
      install: {
        npmSpec: "@joopo/vllm@2.0.0",
        expectedIntegrity: "sha512-vllm",
        defaultChoice: "npm",
      },
      installSource: {
        defaultChoice: "npm",
        npm: {
          spec: "@joopo/vllm@2.0.0",
          packageName: "@joopo/vllm",
          selector: "2.0.0",
          selectorKind: "exact-version",
          exactVersion: true,
          expectedIntegrity: "sha512-vllm",
          pinState: "exact-with-integrity",
        },
        warnings: [],
      },
    });
  });

  it("preserves durable ClawHub install records for provider setup reinstall hints", () => {
    loadPluginRegistrySnapshot.mockReturnValue({
      version: 1,
      hostContractVersion: "test",
      compatRegistryVersion: "test",
      migrationVersion: 1,
      policyHash: "test",
      generatedAtMs: 0,
      installRecords: {
        vllm: {
          source: "clawhub",
          spec: "clawhub:joopo/vllm@2026.5.2",
          integrity: "sha256-clawpack",
          clawhubPackage: "joopo/vllm",
        },
      },
      plugins: [
        {
          pluginId: "vllm",
          origin: "global",
          manifestPath: "/Users/test/.joopo/plugins/vllm/joopo.plugin.json",
          manifestHash: "hash",
          rootDir: "/Users/test/.joopo/plugins/vllm",
          enabled: true,
          startup: {
            sidecar: false,
            memory: false,
            deferConfiguredChannelFullLoadUntilAfterListen: false,
            agentHarnesses: [],
          },
          compat: [],
          packageName: "@joopo/vllm",
          packageInstall: {
            npm: {
              spec: "@joopo/vllm-fork@1.0.0",
              packageName: "@joopo/vllm-fork",
              selector: "1.0.0",
              selectorKind: "exact-version",
              exactVersion: true,
              expectedIntegrity: "sha512-old",
              pinState: "exact-with-integrity",
            },
            warnings: [],
          },
        },
      ],
      diagnostics: [],
    });
    resolveManifestProviderAuthChoices.mockReturnValue([
      {
        pluginId: "vllm",
        providerId: "vllm",
        methodId: "server",
        choiceId: "vllm",
        choiceLabel: "vLLM",
        groupLabel: "vLLM",
      },
    ]);

    expect(resolveProviderInstallCatalogEntry("vllm")).toMatchObject({
      install: {
        clawhubSpec: "clawhub:joopo/vllm@2026.5.2",
        defaultChoice: "clawhub",
      },
      installSource: {
        defaultChoice: "clawhub",
        clawhub: {
          spec: "clawhub:joopo/vllm@2026.5.2",
          packageName: "joopo/vllm",
          version: "2026.5.2",
          exactVersion: true,
        },
        warnings: [],
      },
    });
  });

  it("does not expose untrusted global package install intent without an install record", () => {
    loadPluginRegistrySnapshot.mockReturnValue({
      version: 1,
      hostContractVersion: "test",
      compatRegistryVersion: "test",
      migrationVersion: 1,
      policyHash: "test",
      generatedAtMs: 0,
      installRecords: {},
      plugins: [
        {
          pluginId: "demo-provider",
          origin: "global",
          manifestPath: "/Users/test/.joopo/plugins/demo-provider/joopo.plugin.json",
          manifestHash: "hash",
          rootDir: "/Users/test/.joopo/plugins/demo-provider",
          enabled: true,
          startup: {
            sidecar: false,
            memory: false,
            deferConfiguredChannelFullLoadUntilAfterListen: false,
            agentHarnesses: [],
          },
          compat: [],
          packageName: "@vendor/demo-provider",
          packageInstall: {
            npm: {
              spec: "@vendor/demo-provider@1.2.3",
              packageName: "@vendor/demo-provider",
              selector: "1.2.3",
              selectorKind: "exact-version",
              exactVersion: true,
              expectedIntegrity: "sha512-demo",
              pinState: "exact-with-integrity",
            },
            warnings: [],
          },
        },
      ],
      diagnostics: [],
    });
    resolveManifestProviderAuthChoices.mockReturnValue([
      {
        pluginId: "demo-provider",
        providerId: "demo-provider",
        methodId: "api-key",
        choiceId: "demo-provider-api-key",
        choiceLabel: "Demo Provider API key",
      },
    ]);

    expect(resolveProviderInstallCatalogEntries()).toEqual([]);
  });

  it("skips untrusted workspace package install metadata when the plugin is disabled", () => {
    loadPluginRegistrySnapshot.mockReturnValue({
      version: 1,
      hostContractVersion: "test",
      compatRegistryVersion: "test",
      migrationVersion: 1,
      policyHash: "test",
      generatedAtMs: 0,
      installRecords: {},
      plugins: [
        {
          pluginId: "demo-provider",
          origin: "workspace",
          manifestPath: "/repo/extensions/demo-provider/joopo.plugin.json",
          manifestHash: "hash",
          rootDir: "/repo/extensions/demo-provider",
          enabled: false,
          startup: {
            sidecar: false,
            memory: false,
            deferConfiguredChannelFullLoadUntilAfterListen: false,
            agentHarnesses: [],
          },
          compat: [],
          packageInstall: {
            local: {
              path: "extensions/demo-provider",
            },
            warnings: [],
          },
        },
      ],
      diagnostics: [],
    });
    resolveManifestProviderAuthChoices.mockReturnValue([
      {
        pluginId: "demo-provider",
        providerId: "demo-provider",
        methodId: "api-key",
        choiceId: "demo-provider-api-key",
        choiceLabel: "Demo Provider API key",
      },
    ]);

    expect(
      resolveProviderInstallCatalogEntries({
        config: {
          plugins: {
            enabled: false,
          },
        },
        includeUntrustedWorkspacePlugins: false,
      }),
    ).toEqual([]);
  });

  it("surfaces provider-index install metadata when the provider plugin is not installed", () => {
    loadJoopoProviderIndex.mockReturnValue({
      version: 1,
      providers: {
        moonshot: {
          id: "moonshot",
          name: "Moonshot AI",
          plugin: {
            id: "moonshot",
            package: "@joopo/plugin-moonshot",
            install: {
              npmSpec: "@joopo/plugin-moonshot@1.2.3",
              defaultChoice: "npm",
              expectedIntegrity: "sha512-moonshot",
            },
          },
          authChoices: [
            {
              method: "api-key",
              choiceId: "moonshot-api-key",
              choiceLabel: "Moonshot API key",
              groupId: "moonshot",
              groupLabel: "Moonshot AI",
              onboardingScopes: ["text-inference"],
            },
          ],
        },
      },
    });

    expect(resolveProviderInstallCatalogEntry("moonshot-api-key")).toEqual({
      pluginId: "moonshot",
      providerId: "moonshot",
      methodId: "api-key",
      choiceId: "moonshot-api-key",
      choiceLabel: "Moonshot API key",
      groupId: "moonshot",
      groupLabel: "Moonshot AI",
      onboardingScopes: ["text-inference"],
      label: "Moonshot AI",
      origin: "bundled",
      install: {
        npmSpec: "@joopo/plugin-moonshot@1.2.3",
        defaultChoice: "npm",
        expectedIntegrity: "sha512-moonshot",
      },
      installSource: {
        defaultChoice: "npm",
        npm: {
          spec: "@joopo/plugin-moonshot@1.2.3",
          packageName: "@joopo/plugin-moonshot",
          selector: "1.2.3",
          selectorKind: "exact-version",
          exactVersion: true,
          expectedIntegrity: "sha512-moonshot",
          pinState: "exact-with-integrity",
        },
        warnings: [],
      },
    });
  });

  it("surfaces official external provider install metadata when the provider plugin is not installed", () => {
    listOfficialExternalProviderCatalogEntries.mockReturnValue([
      {
        name: "@joopo/codex",
        source: "official",
        kind: "provider",
        joopo: {
          plugin: { id: "codex", label: "Codex" },
          providers: [
            {
              id: "codex",
              name: "Codex",
              authChoices: [
                {
                  method: "app-server",
                  choiceId: "codex",
                  choiceLabel: "Codex app-server",
                  choiceHint: "Use the Codex app-server runtime.",
                  groupId: "codex",
                  groupLabel: "Codex",
                  onboardingScopes: ["text-inference"],
                },
              ],
            },
          ],
          install: {
            npmSpec: "@joopo/codex",
            defaultChoice: "npm",
          },
        },
      },
    ]);

    expect(resolveProviderInstallCatalogEntry("codex")).toMatchObject({
      pluginId: "codex",
      providerId: "codex",
      methodId: "app-server",
      choiceId: "codex",
      choiceLabel: "Codex app-server",
      choiceHint: "Use the Codex app-server runtime.",
      groupId: "codex",
      groupLabel: "Codex",
      onboardingScopes: ["text-inference"],
      label: "Codex",
      install: {
        npmSpec: "@joopo/codex",
        defaultChoice: "npm",
      },
    });
  });

  it("surfaces provider-index ClawHub install metadata as the preferred source", () => {
    loadJoopoProviderIndex.mockReturnValue({
      version: 1,
      providers: {
        moonshot: {
          id: "moonshot",
          name: "Moonshot AI",
          plugin: {
            id: "moonshot",
            package: "@joopo/plugin-moonshot",
            install: {
              clawhubSpec: "clawhub:joopo/moonshot@2026.5.2",
              npmSpec: "@joopo/plugin-moonshot@2026.5.2",
              defaultChoice: "clawhub",
              expectedIntegrity: "sha512-moonshot",
            },
          },
          authChoices: [
            {
              method: "api-key",
              choiceId: "moonshot-api-key",
              choiceLabel: "Moonshot API key",
              groupId: "moonshot",
              groupLabel: "Moonshot AI",
            },
          ],
        },
      },
    });

    expect(resolveProviderInstallCatalogEntry("moonshot-api-key")).toEqual({
      pluginId: "moonshot",
      providerId: "moonshot",
      methodId: "api-key",
      choiceId: "moonshot-api-key",
      choiceLabel: "Moonshot API key",
      groupId: "moonshot",
      groupLabel: "Moonshot AI",
      label: "Moonshot AI",
      origin: "bundled",
      install: {
        clawhubSpec: "clawhub:joopo/moonshot@2026.5.2",
        npmSpec: "@joopo/plugin-moonshot@2026.5.2",
        defaultChoice: "clawhub",
        expectedIntegrity: "sha512-moonshot",
      },
      installSource: {
        defaultChoice: "clawhub",
        clawhub: {
          spec: "clawhub:joopo/moonshot@2026.5.2",
          packageName: "joopo/moonshot",
          version: "2026.5.2",
          exactVersion: true,
        },
        npm: {
          spec: "@joopo/plugin-moonshot@2026.5.2",
          packageName: "@joopo/plugin-moonshot",
          selector: "2026.5.2",
          selectorKind: "exact-version",
          exactVersion: true,
          expectedIntegrity: "sha512-moonshot",
          pinState: "exact-with-integrity",
        },
        warnings: [],
      },
    });
  });

  it("keeps provider-index entries hidden when the plugin is already installed", () => {
    loadPluginRegistrySnapshot.mockReturnValue({
      version: 1,
      hostContractVersion: "test",
      compatRegistryVersion: "test",
      migrationVersion: 1,
      policyHash: "test",
      generatedAtMs: 0,
      installRecords: {},
      plugins: [
        {
          pluginId: "moonshot",
          origin: "bundled",
          manifestPath: "/repo/extensions/moonshot/joopo.plugin.json",
          manifestHash: "hash",
          rootDir: "/repo/extensions/moonshot",
          enabled: true,
          startup: {
            sidecar: false,
            memory: false,
            deferConfiguredChannelFullLoadUntilAfterListen: false,
            agentHarnesses: [],
          },
          compat: [],
        },
      ],
      diagnostics: [],
    });
    loadJoopoProviderIndex.mockReturnValue({
      version: 1,
      providers: {
        moonshot: {
          id: "moonshot",
          name: "Moonshot AI",
          plugin: {
            id: "moonshot",
            package: "@joopo/plugin-moonshot",
            install: {
              npmSpec: "@joopo/plugin-moonshot@1.2.3",
              expectedIntegrity: "sha512-moonshot",
            },
          },
          authChoices: [
            {
              method: "api-key",
              choiceId: "moonshot-api-key",
              choiceLabel: "Moonshot API key",
            },
          ],
        },
      },
    });

    expect(resolveProviderInstallCatalogEntry("moonshot-api-key")).toBeUndefined();
  });

  it("keeps missing provider-index entries visible when only some provider plugins are installed", () => {
    loadPluginRegistrySnapshot.mockReturnValue({
      version: 1,
      hostContractVersion: "test",
      compatRegistryVersion: "test",
      migrationVersion: 1,
      policyHash: "test",
      generatedAtMs: 0,
      installRecords: {},
      plugins: [
        {
          pluginId: "moonshot",
          origin: "bundled",
          manifestPath: "/repo/extensions/moonshot/joopo.plugin.json",
          manifestHash: "hash",
          rootDir: "/repo/extensions/moonshot",
          enabled: true,
          startup: {
            sidecar: false,
            memory: false,
            deferConfiguredChannelFullLoadUntilAfterListen: false,
            agentHarnesses: [],
          },
          compat: [],
        },
      ],
      diagnostics: [],
    });
    loadJoopoProviderIndex.mockReturnValue({
      version: 1,
      providers: {
        groq: {
          id: "groq",
          name: "Groq",
          plugin: {
            id: "groq",
            package: "@joopo/plugin-groq",
            install: {
              npmSpec: "@joopo/plugin-groq@1.0.0",
              defaultChoice: "npm",
            },
          },
          authChoices: [
            {
              method: "api-key",
              choiceId: "groq-api-key",
              choiceLabel: "Groq API key",
            },
          ],
        },
        moonshot: {
          id: "moonshot",
          name: "Moonshot AI",
          plugin: {
            id: "moonshot",
            package: "@joopo/plugin-moonshot",
            install: {
              clawhubSpec: "clawhub:joopo/moonshot@2026.5.2",
              npmSpec: "@joopo/plugin-moonshot@2026.5.2",
              defaultChoice: "clawhub",
            },
          },
          authChoices: [
            {
              method: "api-key",
              choiceId: "moonshot-api-key",
              choiceLabel: "Moonshot API key",
            },
          ],
        },
        vllm: {
          id: "vllm",
          name: "vLLM",
          plugin: {
            id: "vllm",
            package: "@joopo/plugin-vllm",
            install: {
              clawhubSpec: "clawhub:joopo/vllm@2026.5.2",
              npmSpec: "@joopo/plugin-vllm@2026.5.2",
              defaultChoice: "clawhub",
            },
          },
          authChoices: [
            {
              method: "server",
              choiceId: "vllm-server",
              choiceLabel: "vLLM server",
            },
          ],
        },
      },
    });

    const entries = resolveProviderInstallCatalogEntries();

    expect(entries.map((entry) => entry.choiceId)).toEqual(["groq-api-key", "vllm-server"]);
    expect(resolveProviderInstallCatalogEntry("moonshot-api-key")).toBeUndefined();
    expect(resolveProviderInstallCatalogEntry("vllm-server")).toMatchObject({
      pluginId: "vllm",
      install: {
        clawhubSpec: "clawhub:joopo/vllm@2026.5.2",
        npmSpec: "@joopo/plugin-vllm@2026.5.2",
        defaultChoice: "clawhub",
      },
      installSource: {
        defaultChoice: "clawhub",
        clawhub: {
          spec: "clawhub:joopo/vllm@2026.5.2",
        },
        npm: {
          spec: "@joopo/plugin-vllm@2026.5.2",
        },
      },
    });
  });
});
