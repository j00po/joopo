import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { validateExternalCodePluginPackageJson } from "../../packages/plugin-package-contract/src/index.ts";
import {
  collectExtensionPackageJsonCandidates,
  collectChangedPathsFromGitRange,
  collectChangedExtensionIdsFromPaths,
  collectPublishablePluginPackageErrors,
  parsePluginReleaseArgs,
  resolvePublishablePluginVersion,
  resolveGitCommitSha,
  resolveChangedPublishablePluginPackages,
  resolveSelectedPublishablePluginPackages,
  type GitRangeSelection,
  type PluginReleaseSelectionMode,
} from "./plugin-npm-release.ts";

export { parsePluginReleaseArgs };

type PluginPackageJson = {
  name?: string;
  version?: string;
  private?: boolean;
  joopo?: {
    extensions?: string[];
    install?: {
      npmSpec?: string;
    };
    compat?: {
      pluginApi?: string;
      minGatewayVersion?: string;
    };
    build?: {
      joopoVersion?: string;
      pluginSdkVersion?: string;
    };
    release?: {
      publishToJoopoHub?: boolean;
      publishToNpm?: boolean;
    };
  };
};

export type PublishablePluginPackage = {
  extensionId: string;
  packageDir: string;
  packageName: string;
  version: string;
  channel: "stable" | "alpha" | "beta";
  publishTag: "latest" | "alpha" | "beta";
};

type PluginReleasePlanItem = PublishablePluginPackage & {
  alreadyPublished: boolean;
};

type PluginReleasePlan = {
  all: PluginReleasePlanItem[];
  candidates: PluginReleasePlanItem[];
  skippedPublished: PluginReleasePlanItem[];
};

type JoopoHubPackageOwnerDetail = {
  owner?: {
    handle?: unknown;
  } | null;
};

type JoopoHubPublishablePluginPackageFilters = {
  extensionIds?: readonly string[];
  packageNames?: readonly string[];
};

const JOOPOHUB_DEFAULT_REGISTRY = "https://joopohub.ai";
const SAFE_EXTENSION_ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
const JOOPOHUB_SHARED_RELEASE_INPUT_PATHS = [
  ".github/workflows/plugin-joopohub-release.yml",
  ".github/actions/setup-node-env",
  "package.json",
  "pnpm-lock.yaml",
  "packages/plugin-package-contract/src/index.ts",
  "scripts/lib/npm-publish-plan.mjs",
  "scripts/lib/plugin-npm-release.ts",
  "scripts/lib/plugin-joopohub-release.ts",
  "scripts/plugin-joopohub-owner-preflight.ts",
  "scripts/joopo-npm-release-check.ts",
  "scripts/plugin-joopohub-publish.sh",
  "scripts/plugin-joopohub-release-check.ts",
  "scripts/plugin-joopohub-release-plan.ts",
] as const;

function getRegistryBaseUrl(explicit?: string) {
  return (
    explicit?.trim() ||
    process.env.JOOPOHUB_REGISTRY?.trim() ||
    process.env.JOOPOHUB_SITE?.trim() ||
    JOOPOHUB_DEFAULT_REGISTRY
  );
}

export function collectJoopoHubPublishablePluginPackages(
  rootDir = resolve("."),
  filters: JoopoHubPublishablePluginPackageFilters = {},
): PublishablePluginPackage[] {
  const publishable: PublishablePluginPackage[] = [];
  const validationErrors: string[] = [];
  const selectedExtensionIds = new Set(filters.extensionIds ?? []);
  const selectedPackageNames = new Set(filters.packageNames ?? []);
  const hasSelectedExtensionIds = Array.isArray(filters.extensionIds);
  const hasSelectedPackageNames = Array.isArray(filters.packageNames);

  for (const candidate of collectExtensionPackageJsonCandidates(rootDir)) {
    const { extensionId, packageDir, packageJson } = candidate;
    if (hasSelectedExtensionIds && !selectedExtensionIds.has(extensionId)) {
      continue;
    }
    const packageName = packageJson.name?.trim() ?? "";
    if (hasSelectedPackageNames && !selectedPackageNames.has(packageName)) {
      continue;
    }
    if (packageJson.joopo?.release?.publishToJoopoHub !== true) {
      continue;
    }
    if (!SAFE_EXTENSION_ID_RE.test(extensionId)) {
      validationErrors.push(
        `${extensionId}: extension directory name must match ^[a-z0-9][a-z0-9._-]*$ for JoopoHub publish.`,
      );
      continue;
    }

    const errors = collectPublishablePluginPackageErrors({
      extensionId,
      packageDir,
      packageJson,
    });
    if (errors.length > 0) {
      validationErrors.push(...errors.map((error) => `${extensionId}: ${error}`));
      continue;
    }
    const contractValidation = validateExternalCodePluginPackageJson(packageJson);
    if (contractValidation.issues.length > 0) {
      validationErrors.push(
        ...contractValidation.issues.map((issue) => `${extensionId}: ${issue.message}`),
      );
      continue;
    }

    const resolvedVersion = resolvePublishablePluginVersion({
      extensionId,
      packageJson,
      validationErrors,
    });
    if (!resolvedVersion) {
      continue;
    }
    const { version, parsedVersion } = resolvedVersion;

    publishable.push({
      extensionId,
      packageDir,
      packageName,
      version,
      channel: parsedVersion.channel,
      publishTag:
        parsedVersion.channel === "alpha"
          ? "alpha"
          : parsedVersion.channel === "beta"
            ? "beta"
            : "latest",
    });
  }

  if (validationErrors.length > 0) {
    throw new Error(
      `Publishable JoopoHub plugin metadata validation failed:\n${validationErrors.map((error) => `- ${error}`).join("\n")}`,
    );
  }

  return publishable.toSorted((left, right) => left.packageName.localeCompare(right.packageName));
}

export function collectPluginJoopoHubReleasePathsFromGitRange(params: {
  rootDir?: string;
  gitRange: GitRangeSelection;
}): string[] {
  return collectPluginJoopoHubReleasePathsFromGitRangeForPathspecs(params, ["extensions"]);
}

function collectPluginJoopoHubRelevantPathsFromGitRange(params: {
  rootDir?: string;
  gitRange: GitRangeSelection;
}): string[] {
  return collectPluginJoopoHubReleasePathsFromGitRangeForPathspecs(params, [
    "extensions",
    ...JOOPOHUB_SHARED_RELEASE_INPUT_PATHS,
  ]);
}

function collectPluginJoopoHubReleasePathsFromGitRangeForPathspecs(
  params: {
    rootDir?: string;
    gitRange: GitRangeSelection;
  },
  pathspecs: readonly string[],
): string[] {
  return collectChangedPathsFromGitRange({
    rootDir: params.rootDir,
    gitRange: params.gitRange,
    pathspecs,
  });
}

function hasSharedJoopoHubReleaseInputChanges(changedPaths: readonly string[]) {
  return changedPaths.some((path) =>
    JOOPOHUB_SHARED_RELEASE_INPUT_PATHS.some(
      (sharedPath) => path === sharedPath || path.startsWith(`${sharedPath}/`),
    ),
  );
}

export function resolveChangedJoopoHubPublishablePluginPackages(params: {
  plugins: PublishablePluginPackage[];
  changedPaths: readonly string[];
}): PublishablePluginPackage[] {
  return resolveChangedPublishablePluginPackages({
    plugins: params.plugins,
    changedExtensionIds: collectChangedExtensionIdsFromPaths(params.changedPaths),
  });
}

export function resolveSelectedJoopoHubPublishablePluginPackages(params: {
  plugins: PublishablePluginPackage[];
  selection?: string[];
  selectionMode?: PluginReleaseSelectionMode;
  gitRange?: GitRangeSelection;
  rootDir?: string;
}): PublishablePluginPackage[] {
  if (params.selectionMode === "all-publishable") {
    return params.plugins;
  }
  if (params.selection && params.selection.length > 0) {
    return resolveSelectedPublishablePluginPackages({
      plugins: params.plugins,
      selection: params.selection,
    });
  }
  if (params.gitRange) {
    const changedPaths = collectPluginJoopoHubRelevantPathsFromGitRange({
      rootDir: params.rootDir,
      gitRange: params.gitRange,
    });
    if (hasSharedJoopoHubReleaseInputChanges(changedPaths)) {
      return params.plugins;
    }
    return resolveChangedJoopoHubPublishablePluginPackages({
      plugins: params.plugins,
      changedPaths,
    });
  }
  return params.plugins;
}

function readPackageManifestAtGitRef(params: {
  rootDir?: string;
  ref: string;
  packageDir: string;
}): PluginPackageJson | null {
  const rootDir = params.rootDir ?? resolve(".");
  const commitSha = resolveGitCommitSha(rootDir, params.ref, "ref");
  try {
    const raw = execFileSync("git", ["show", `${commitSha}:${params.packageDir}/package.json`], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(raw) as PluginPackageJson;
  } catch {
    return null;
  }
}

export function collectJoopoHubVersionGateErrors(params: {
  plugins: PublishablePluginPackage[];
  gitRange: GitRangeSelection;
  rootDir?: string;
}): string[] {
  const changedPaths = collectPluginJoopoHubReleasePathsFromGitRange({
    rootDir: params.rootDir,
    gitRange: params.gitRange,
  });
  const changedPlugins = resolveChangedJoopoHubPublishablePluginPackages({
    plugins: params.plugins,
    changedPaths,
  });

  const errors: string[] = [];
  for (const plugin of changedPlugins) {
    const baseManifest = readPackageManifestAtGitRef({
      rootDir: params.rootDir,
      ref: params.gitRange.baseRef,
      packageDir: plugin.packageDir,
    });
    if (baseManifest?.joopo?.release?.publishToJoopoHub !== true) {
      continue;
    }
    const baseVersion =
      typeof baseManifest.version === "string" && baseManifest.version.trim()
        ? baseManifest.version.trim()
        : null;
    if (baseVersion === null || baseVersion !== plugin.version) {
      continue;
    }
    errors.push(
      `${plugin.packageName}@${plugin.version}: changed publishable plugin still has the same version in package.json.`,
    );
  }

  return errors;
}

async function isPluginVersionPublishedOnJoopoHub(
  packageName: string,
  version: string,
  options: {
    fetchImpl?: typeof fetch;
    registryBaseUrl?: string;
  } = {},
): Promise<boolean> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(
    `/api/v1/packages/${encodeURIComponent(packageName)}/versions/${encodeURIComponent(version)}`,
    getRegistryBaseUrl(options.registryBaseUrl),
  );
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return false;
  }
  if (response.ok) {
    return true;
  }

  throw new Error(
    `Failed to query JoopoHub for ${packageName}@${version}: ${response.status} ${response.statusText}`,
  );
}

export async function collectJoopoHubJoopoOwnerErrors(params: {
  plugins: readonly Pick<PublishablePluginPackage, "packageName">[];
  requiredOwnerHandle?: string;
  registryBaseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<string[]> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const requiredOwnerHandle = params.requiredOwnerHandle ?? "joopo";
  const errors: string[] = [];

  await Promise.all(
    params.plugins.map(async (plugin) => {
      if (!plugin.packageName.startsWith("@joopo/")) {
        return;
      }

      const url = new URL(
        `/api/v1/packages/${encodeURIComponent(plugin.packageName)}`,
        getRegistryBaseUrl(params.registryBaseUrl),
      );
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 404) {
        errors.push(
          `${plugin.packageName}: JoopoHub package row must already exist under @${requiredOwnerHandle} before Joopo release publish.`,
        );
        return;
      }
      if (!response.ok) {
        errors.push(
          `${plugin.packageName}: failed to query JoopoHub owner: ${response.status} ${response.statusText}`,
        );
        return;
      }

      const detail = (await response.json()) as JoopoHubPackageOwnerDetail;
      const ownerHandle = typeof detail.owner?.handle === "string" ? detail.owner.handle : null;
      if (ownerHandle !== requiredOwnerHandle) {
        errors.push(
          `${plugin.packageName}: JoopoHub package owner must be @${requiredOwnerHandle}; got ${ownerHandle ? `@${ownerHandle}` : "<missing>"}.`,
        );
      }
    }),
  );

  return errors.toSorted();
}

export async function collectPluginJoopoHubReleasePlan(params?: {
  rootDir?: string;
  selection?: string[];
  selectionMode?: PluginReleaseSelectionMode;
  gitRange?: GitRangeSelection;
  registryBaseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<PluginReleasePlan> {
  const rootDir = params?.rootDir;
  const selection = params?.selection ?? [];
  const changedPaths = params?.gitRange
    ? collectPluginJoopoHubRelevantPathsFromGitRange({
        rootDir,
        gitRange: params.gitRange,
      })
    : [];
  const sharedInputChanged = hasSharedJoopoHubReleaseInputChanges(changedPaths);
  const extensionIds =
    params?.selectionMode === "all-publishable" || !params?.gitRange || sharedInputChanged
      ? undefined
      : collectChangedExtensionIdsFromPaths(changedPaths);
  const allPublishable = collectJoopoHubPublishablePluginPackages(rootDir, {
    extensionIds,
    packageNames: selection.length > 0 ? selection : undefined,
  });
  const selectedPublishable = resolveSelectedJoopoHubPublishablePluginPackages({
    plugins: allPublishable,
    selection,
    selectionMode: params?.selectionMode,
    gitRange: params?.gitRange,
    rootDir,
  });

  const all = await Promise.all(
    selectedPublishable.map(async (plugin) =>
      Object.assign({}, plugin, {
        alreadyPublished: await isPluginVersionPublishedOnJoopoHub(
          plugin.packageName,
          plugin.version,
          { registryBaseUrl: params?.registryBaseUrl, fetchImpl: params?.fetchImpl },
        ),
      }),
    ),
  );

  return {
    all,
    candidates: all.filter((plugin) => !plugin.alreadyPublished),
    skippedPublished: all.filter((plugin) => plugin.alreadyPublished),
  };
}
