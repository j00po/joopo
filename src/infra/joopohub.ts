import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  normalizeLowercaseStringOrEmpty,
  normalizeOptionalString,
} from "../shared/string-coerce.js";
import { isAtLeast, parseSemver } from "./runtime-guard.js";
import { compareComparableSemver, parseComparableSemver } from "./semver-compare.js";
import { createTempDownloadTarget } from "./temp-download.js";
export { parseJoopoHubPluginSpec } from "./joopohub-spec.js";

const DEFAULT_JOOPOHUB_URL = "https://joopohub.ai";
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

export type JoopoHubPackageFamily = "skill" | "code-plugin" | "bundle-plugin";
export type JoopoHubPackageChannel = "official" | "community" | "private";
// Keep aligned with @joopo/plugin-package-contract ExternalPluginCompatibility.
export type JoopoHubPackageCompatibility = {
  pluginApiRange?: string;
  builtWithJoopoVersion?: string;
  pluginSdkVersion?: string;
  minGatewayVersion?: string;
};
export type JoopoHubPackageHostTarget = {
  os?: string | null;
  arch?: string | null;
  libc?: string | null;
  key?: string | null;
};
export type JoopoHubPackageEnvironmentSummary = {
  requiresLocalDesktop?: boolean;
  requiresBrowser?: boolean;
  requiresAudioDevice?: boolean;
  requiresNetwork?: boolean;
  requiresExternalServices?: string[];
  requiresOsPermissions?: string[];
  supportsRemoteHost?: boolean;
  knownUnsupported?: string[];
};
export type JoopoHubPackageArtifactSummary = {
  kind?: string | null;
  sha256?: string | null;
  size?: number | null;
  format?: string | null;
  npmIntegrity?: string | null;
  npmShasum?: string | null;
  npmTarballName?: string | null;
  npmUnpackedSize?: number | null;
  npmFileCount?: number | null;
  downloadUrl?: string | null;
  tarballUrl?: string | null;
  legacyDownloadUrl?: string | null;
};
export type JoopoHubArtifactKind = "legacy-zip" | "npm-pack";
export type JoopoHubArtifactScanState =
  | "pending"
  | "clean"
  | "suspicious"
  | "malicious"
  | "not-run"
  | (string & {});
export type JoopoHubArtifactModerationState =
  | "approved"
  | "quarantined"
  | "revoked"
  | (string & {});
export type JoopoHubPackageSecurityState =
  | "pending"
  | "approved"
  | "limited"
  | "quarantined"
  | "rejected"
  | "revoked"
  | (string & {});
export type JoopoHubResolvedArtifact =
  | {
      source: "joopohub";
      artifactKind: "legacy-zip";
      packageName: string;
      version: string;
      downloadUrl?: string | null;
      artifactSha256?: string | null;
      scanState?: JoopoHubArtifactScanState | null;
      moderationState?: JoopoHubArtifactModerationState | null;
    }
  | {
      source: "joopohub";
      artifactKind: "npm-pack";
      packageName: string;
      version: string;
      downloadUrl?: string | null;
      npmIntegrity: string;
      npmShasum?: string | null;
      artifactSha256?: string | null;
      scanState?: JoopoHubArtifactScanState | null;
      moderationState?: JoopoHubArtifactModerationState | null;
    };
export type JoopoHubPackageArtifactResolverResponse = {
  package?: {
    name?: string | null;
    displayName?: string | null;
    family?: JoopoHubPackageFamily | (string & {}) | null;
  } | null;
  version?:
    | ({
        version?: string | null;
        createdAt?: number | null;
        changelog?: string | null;
        distTags?: string[];
        files?: unknown[];
        sha256hash?: string | null;
        compatibility?: JoopoHubPackageCompatibility | null;
        artifact?: JoopoHubPackageArtifactSummary | null;
        clawpack?: JoopoHubPackageClawPackSummary | null;
      } & Record<string, unknown>)
    | string
    | null;
  artifact?: JoopoHubResolvedArtifact | null;
};
export type JoopoHubPackageSecurityResponse = {
  packageId?: string | null;
  releaseId?: string | null;
  state: JoopoHubPackageSecurityState;
  reasonCode?: string | null;
  moderatorNote?: string | null;
  actorId?: string | null;
  createdAt?: number | null;
  scanState?: JoopoHubArtifactScanState | null;
  moderationState?: JoopoHubArtifactModerationState | null;
};
export type JoopoHubPackageClawPackSummary = {
  available: boolean;
  specVersion?: number | null;
  format?: string | null;
  sha256?: string | null;
  size?: number | null;
  fileCount?: number | null;
  manifestSha256?: string | null;
  npmIntegrity?: string | null;
  npmShasum?: string | null;
  npmTarballName?: string | null;
  builtAt?: number | null;
  buildVersion?: string | null;
  hostTargets?: JoopoHubPackageHostTarget[];
  environment?: JoopoHubPackageEnvironmentSummary | null;
  runtimeBundles?: unknown[];
};
export type JoopoHubPackageReadinessPhase =
  | "planned"
  | "published"
  | "clawpack-ready"
  | "legacy-zip-only"
  | "metadata-ready"
  | "blocked"
  | "ready-for-joopo"
  | (string & {});
export type JoopoHubPackageReadiness = {
  ready?: boolean | null;
  readyForJoopo?: boolean | null;
  installReady?: boolean | null;
  phase?: JoopoHubPackageReadinessPhase | null;
  status?: JoopoHubPackageReadinessPhase | null;
  package?: {
    name?: string | null;
    family?: JoopoHubPackageFamily | (string & {}) | null;
    channel?: JoopoHubPackageChannel | (string & {}) | null;
    isOfficial?: boolean | null;
  } | null;
  packageName?: string | null;
  artifactKind?: JoopoHubArtifactKind | (string & {}) | null;
  blockers?: string[];
  scanState?: JoopoHubArtifactScanState | null;
  moderationState?: JoopoHubArtifactModerationState | null;
};
export type JoopoHubPackageListItem = {
  name: string;
  displayName: string;
  family: JoopoHubPackageFamily;
  runtimeId?: string | null;
  channel: JoopoHubPackageChannel;
  isOfficial: boolean;
  summary?: string | null;
  ownerHandle?: string | null;
  createdAt: number;
  updatedAt: number;
  latestVersion?: string | null;
  capabilityTags?: string[];
  executesCode?: boolean;
  verificationTier?: string | null;
  clawpackAvailable?: boolean;
  hostTargetKeys?: string[];
  environmentFlags?: string[];
  artifact?: JoopoHubPackageArtifactSummary | null;
  clawpack?: JoopoHubPackageClawPackSummary;
};
export type JoopoHubPackageDetail = {
  package:
    | (JoopoHubPackageListItem & {
        tags?: Record<string, string>;
        compatibility?: JoopoHubPackageCompatibility | null;
        capabilities?: {
          executesCode?: boolean;
          runtimeId?: string;
          capabilityTags?: string[];
          bundleFormat?: string;
          hostTargets?: string[];
          pluginKind?: string;
          channels?: string[];
          providers?: string[];
          hooks?: string[];
          bundledSkills?: string[];
        } | null;
        verification?: {
          tier?: string;
          scope?: string;
          summary?: string;
          sourceRepo?: string;
          sourceCommit?: string;
          hasProvenance?: boolean;
          scanStatus?: string;
        } | null;
        artifact?: JoopoHubPackageArtifactSummary | null;
        clawpack?: JoopoHubPackageClawPackSummary;
      })
    | null;
  owner?: {
    handle?: string | null;
    displayName?: string | null;
    image?: string | null;
  } | null;
};

export type JoopoHubPackageVersion = {
  package: {
    name: string;
    displayName: string;
    family: JoopoHubPackageFamily;
  } | null;
  version: {
    version: string;
    createdAt: number;
    changelog: string;
    distTags?: string[];
    files?: Array<{
      path: string;
      size?: number;
      sha256: string;
      contentType?: string;
    }>;
    sha256hash?: string | null;
    compatibility?: JoopoHubPackageCompatibility | null;
    capabilities?: JoopoHubPackageDetail["package"] extends infer T
      ? T extends { capabilities?: infer C }
        ? C
        : never
      : never;
    verification?: JoopoHubPackageDetail["package"] extends infer T
      ? T extends { verification?: infer C }
        ? C
        : never
      : never;
    artifact?: JoopoHubPackageArtifactSummary | null;
    clawpack?: JoopoHubPackageClawPackSummary;
  } | null;
};

export type JoopoHubPackageSearchResult = {
  score: number;
  package: JoopoHubPackageListItem;
};

export type JoopoHubSkillSearchResult = {
  score: number;
  slug: string;
  displayName: string;
  summary?: string;
  version?: string;
  updatedAt?: number;
};

export type JoopoHubSkillDetail = {
  skill: {
    slug: string;
    displayName: string;
    summary?: string;
    tags?: Record<string, string>;
    createdAt: number;
    updatedAt: number;
  } | null;
  latestVersion?: {
    version: string;
    createdAt: number;
    changelog?: string;
  } | null;
  metadata?: {
    os?: string[] | null;
    systems?: string[] | null;
  } | null;
  owner?: {
    handle?: string | null;
    displayName?: string | null;
    image?: string | null;
  } | null;
};

export type JoopoHubSkillListResponse = {
  items: Array<{
    slug: string;
    displayName: string;
    summary?: string;
    tags?: Record<string, string>;
    latestVersion?: {
      version: string;
      createdAt: number;
      changelog?: string;
    } | null;
    metadata?: {
      os?: string[] | null;
      systems?: string[] | null;
    } | null;
    createdAt: number;
    updatedAt: number;
  }>;
  nextCursor?: string | null;
};

export type JoopoHubDownloadResult = {
  archivePath: string;
  integrity: string;
  sha256Hex: string;
  artifact: "archive" | "clawpack";
  clawpackHeaderSha256?: string;
  clawpackHeaderSpecVersion?: number;
  npmIntegrity?: string;
  npmShasum?: string;
  npmTarballName?: string;
  cleanup: () => Promise<void>;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type JoopoHubRequestParams = {
  baseUrl?: string;
  path: string;
  token?: string;
  timeoutMs?: number;
  search?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
};

type JoopoHubConfigLike = {
  token?: unknown;
  accessToken?: unknown;
  authToken?: unknown;
  apiToken?: unknown;
  auth?: JoopoHubConfigLike | null;
  session?: JoopoHubConfigLike | null;
  credentials?: JoopoHubConfigLike | null;
  user?: JoopoHubConfigLike | null;
};

export class JoopoHubRequestError extends Error {
  readonly status: number;
  readonly requestPath: string;
  readonly responseBody: string;

  constructor(params: { path: string; status: number; body: string }) {
    super(`JoopoHub ${params.path} failed (${params.status}): ${params.body}`);
    this.name = "JoopoHubRequestError";
    this.status = params.status;
    this.requestPath = params.path;
    this.responseBody = params.body;
  }
}

function normalizeBaseUrl(baseUrl?: string): string {
  const envValue =
    normalizeOptionalString(process.env.JOOPO_JOOPOHUB_URL) ||
    normalizeOptionalString(process.env.JOOPOHUB_URL) ||
    DEFAULT_JOOPOHUB_URL;
  const value = (normalizeOptionalString(baseUrl) || envValue).replace(/\/+$/, "");
  return value || DEFAULT_JOOPOHUB_URL;
}

function extractTokenFromJoopoHubConfig(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as JoopoHubConfigLike;
  return (
    normalizeOptionalString(record.accessToken) ??
    normalizeOptionalString(record.authToken) ??
    normalizeOptionalString(record.apiToken) ??
    normalizeOptionalString(record.token) ??
    extractTokenFromJoopoHubConfig(record.auth) ??
    extractTokenFromJoopoHubConfig(record.session) ??
    extractTokenFromJoopoHubConfig(record.credentials) ??
    extractTokenFromJoopoHubConfig(record.user)
  );
}

function resolveJoopoHubConfigPaths(): string[] {
  const explicit =
    normalizeOptionalString(process.env.JOOPO_JOOPOHUB_CONFIG_PATH) ||
    normalizeOptionalString(process.env.JOOPOHUB_CONFIG_PATH) ||
    normalizeOptionalString(process.env.JOOPOHUB_CONFIG_PATH); // legacy misspelling from older joopohub CLI builds; keep for back-compat
  if (explicit) {
    return [explicit];
  }

  const xdgConfigHome = normalizeOptionalString(process.env.XDG_CONFIG_HOME);
  const configHome =
    xdgConfigHome && xdgConfigHome.length > 0 ? xdgConfigHome : path.join(os.homedir(), ".config");
  const xdgPath = path.join(configHome, "joopohub", "config.json");

  if (process.platform === "darwin") {
    return [
      path.join(os.homedir(), "Library", "Application Support", "joopohub", "config.json"),
      xdgPath,
    ];
  }

  return [xdgPath];
}

export async function resolveJoopoHubAuthToken(): Promise<string | undefined> {
  const envToken =
    normalizeOptionalString(process.env.JOOPO_JOOPOHUB_TOKEN) ||
    normalizeOptionalString(process.env.JOOPOHUB_TOKEN) ||
    normalizeOptionalString(process.env.JOOPOHUB_AUTH_TOKEN);
  if (envToken) {
    return envToken;
  }

  for (const configPath of resolveJoopoHubConfigPaths()) {
    try {
      const raw = await fs.readFile(configPath, "utf8");
      const token = extractTokenFromJoopoHubConfig(JSON.parse(raw));
      if (token) {
        return token;
      }
    } catch {
      // Try the next candidate path.
    }
  }
  return undefined;
}

function normalizePartialComparableVersion(version: string): {
  version: string;
  isPartial: boolean;
} {
  const trimmed = version.trim();
  return /^[vV]?[0-9]+\.[0-9]+$/.test(trimmed)
    ? { version: `${trimmed}.0`, isPartial: true }
    : { version: trimmed, isPartial: false };
}

function compareSemver(left: string, right: string): number | null {
  return compareComparableSemver(
    parseComparableSemver(normalizePartialComparableVersion(left).version),
    parseComparableSemver(normalizePartialComparableVersion(right).version),
  );
}

function upperBoundForCaret(version: string): string | null {
  const parsed = parseComparableSemver(normalizePartialComparableVersion(version).version);
  if (!parsed) {
    return null;
  }
  if (parsed.major > 0) {
    return `${parsed.major + 1}.0.0`;
  }
  if (parsed.minor > 0) {
    return `0.${parsed.minor + 1}.0`;
  }
  return `0.0.${parsed.patch + 1}`;
}

function matchWildcardComparator(token: string): "any" | "none" | null {
  const match = /^(>=|<=|>|<|=|\^|~)?\s*([*xX])$/.exec(token);
  if (!match) {
    return null;
  }
  const operator = match[1];
  return operator === ">" || operator === "<" ? "none" : "any";
}

function satisfiesComparator(version: string, token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) {
    return true;
  }
  const wildcard = matchWildcardComparator(trimmed);
  if (wildcard) {
    return wildcard === "any" && parseComparableSemver(version) != null;
  }
  if (trimmed.startsWith("^")) {
    const base = trimmed.slice(1).trim();
    const upperBound = upperBoundForCaret(base);
    const lowerCmp = compareSemver(version, base);
    const upperCmp = upperBound ? compareSemver(version, upperBound) : null;
    return lowerCmp != null && upperCmp != null && lowerCmp >= 0 && upperCmp < 0;
  }

  const match = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(trimmed);
  if (!match) {
    return false;
  }
  const operator = match[1];
  const target = match[2]?.trim();
  if (!target) {
    return false;
  }
  const normalizedTarget = normalizePartialComparableVersion(target);
  const cmp = compareSemver(version, normalizedTarget.version);
  if (cmp == null) {
    return false;
  }
  switch (operator) {
    case ">=":
      return cmp >= 0;
    case "<=":
      return cmp <= 0;
    case ">":
      return cmp > 0;
    case "<":
      return cmp < 0;
    case "=":
    default:
      return normalizedTarget.isPartial && !operator ? cmp >= 0 : cmp === 0;
  }
}

function satisfiesSemverRange(version: string, range: string): boolean {
  const tokens = range
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }
  return tokens.every((token) => satisfiesComparator(version, token));
}

const JOOPO_CALVER_STABLE_CORRECTION_PATTERN = /^[vV]?(\d{4}\.\d{1,2}\.\d{1,2})-\d+$/;

function normalizeCalVerCorrectionForPluginApi(pluginApiVersion: string): string {
  const match = JOOPO_CALVER_STABLE_CORRECTION_PATTERN.exec(pluginApiVersion.trim());
  return match?.[1] ?? pluginApiVersion;
}

function buildUrl(params: Pick<JoopoHubRequestParams, "baseUrl" | "path" | "search">): URL {
  const url = new URL(params.path, `${normalizeBaseUrl(params.baseUrl)}/`);
  for (const [key, value] of Object.entries(params.search ?? {})) {
    if (!value) {
      continue;
    }
    url.searchParams.set(key, value);
  }
  return url;
}

async function joopohubRequest(
  params: JoopoHubRequestParams,
): Promise<{ response: Response; url: URL; hasToken: boolean }> {
  const url = buildUrl(params);
  const token = normalizeOptionalString(params.token) || (await resolveJoopoHubAuthToken());
  const controller = new AbortController();
  const timeout = setTimeout(
    () =>
      controller.abort(
        new Error(
          `JoopoHub request timed out after ${params.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS}ms`,
        ),
      ),
    params.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS,
  );
  try {
    const response = await (params.fetchImpl ?? fetch)(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });
    return { response, url, hasToken: Boolean(token) };
  } finally {
    clearTimeout(timeout);
  }
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text || response.statusText || `HTTP ${response.status}`;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function buildJoopoHubError(
  response: Response,
  url: URL,
  hasToken: boolean,
): Promise<JoopoHubRequestError> {
  let body = await readErrorBody(response);
  if (response.status === 429) {
    const suffix = formatRateLimitSuffix(response.headers, hasToken);
    if (suffix) {
      body = `${body} ${suffix}`;
    }
  }
  return new JoopoHubRequestError({
    path: url.pathname,
    status: response.status,
    body,
  });
}

function formatRateLimitSuffix(headers: Headers, hasToken: boolean): string {
  const reset =
    normalizeHeaderValue(headers.get("RateLimit-Reset")) ??
    normalizeHeaderValue(headers.get("Retry-After"));
  const segments: string[] = [];
  if (reset && Number.isFinite(Number(reset))) {
    segments.push(`(resets in ${reset}s)`);
  }
  if (!hasToken) {
    segments.push("Sign in for higher rate limits.");
  }
  return segments.join(" ");
}

async function fetchJson<T>(params: JoopoHubRequestParams): Promise<T> {
  const { response, url, hasToken } = await joopohubRequest(params);
  if (!response.ok) {
    throw await buildJoopoHubError(response, url, hasToken);
  }
  return (await response.json()) as T;
}

export function resolveJoopoHubBaseUrl(baseUrl?: string): string {
  return normalizeBaseUrl(baseUrl);
}

function formatSha256Integrity(bytes: Uint8Array): string {
  const digest = createHash("sha256").update(bytes).digest("base64");
  return `sha256-${digest}`;
}

function formatSha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function formatSha512Integrity(bytes: Uint8Array): string {
  const digest = createHash("sha512").update(bytes).digest("base64");
  return `sha512-${digest}`;
}

function formatSha1Hex(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex");
}

function normalizeHeaderValue(value: string | null): string | undefined {
  const normalized = normalizeOptionalString(value);
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function safePackageTarballName(name: string, version: string): string {
  const base = name
    .replace(/^@/, "")
    .replace(/[\\/]+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "-");
  return `${base || "package"}-${version}.tgz`;
}

export function normalizeJoopoHubSha256Integrity(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const prefixedBase64 = /^sha256-([A-Za-z0-9+/]+={0,1})$/.exec(trimmed);
  if (prefixedBase64?.[1]) {
    try {
      const decoded = Buffer.from(prefixedBase64[1], "base64");
      if (decoded.length === 32) {
        return `sha256-${decoded.toString("base64")}`;
      }
    } catch {
      return null;
    }
    return null;
  }
  const prefixedHex = /^sha256:([A-Fa-f0-9]{64})$/.exec(trimmed);
  if (prefixedHex?.[1]) {
    return `sha256-${Buffer.from(prefixedHex[1], "hex").toString("base64")}`;
  }
  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) {
    return `sha256-${Buffer.from(trimmed, "hex").toString("base64")}`;
  }
  return null;
}

export function normalizeJoopoHubSha256Hex(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[A-Fa-f0-9]{64}$/.test(trimmed)) {
    return null;
  }
  return normalizeLowercaseStringOrEmpty(trimmed);
}

export async function fetchJoopoHubPackageDetail(params: {
  name: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<JoopoHubPackageDetail> {
  return await fetchJson<JoopoHubPackageDetail>({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchJoopoHubPackageVersion(params: {
  name: string;
  version: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<JoopoHubPackageVersion> {
  return await fetchJson<JoopoHubPackageVersion>({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}/versions/${encodeURIComponent(
      params.version,
    )}`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchJoopoHubPackageArtifact(params: {
  name: string;
  version: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<JoopoHubPackageArtifactResolverResponse> {
  return await fetchJson<JoopoHubPackageArtifactResolverResponse>({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}/versions/${encodeURIComponent(
      params.version,
    )}/artifact`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchJoopoHubPackageSecurity(params: {
  name: string;
  version: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<JoopoHubPackageSecurityResponse> {
  return await fetchJson<JoopoHubPackageSecurityResponse>({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}/versions/${encodeURIComponent(
      params.version,
    )}/security`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchJoopoHubPackageReadiness(params: {
  name: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<JoopoHubPackageReadiness> {
  return await fetchJson<JoopoHubPackageReadiness>({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}/readiness`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function searchJoopoHubPackages(params: {
  query: string;
  family?: JoopoHubPackageFamily;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  limit?: number;
}): Promise<JoopoHubPackageSearchResult[]> {
  const result = await fetchJson<{ results: JoopoHubPackageSearchResult[] }>({
    baseUrl: params.baseUrl,
    path: "/api/v1/packages/search",
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: {
      q: params.query.trim(),
      family: params.family,
      limit: params.limit ? String(params.limit) : undefined,
    },
  });
  return result.results ?? [];
}

export async function searchJoopoHubSkills(params: {
  query: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  limit?: number;
}): Promise<JoopoHubSkillSearchResult[]> {
  const result = await fetchJson<{ results: JoopoHubSkillSearchResult[] }>({
    baseUrl: params.baseUrl,
    path: "/api/v1/search",
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: {
      q: params.query.trim(),
      limit: params.limit ? String(params.limit) : undefined,
    },
  });
  return result.results ?? [];
}

export async function fetchJoopoHubSkillDetail(params: {
  slug: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<JoopoHubSkillDetail> {
  return await fetchJson<JoopoHubSkillDetail>({
    baseUrl: params.baseUrl,
    path: `/api/v1/skills/${encodeURIComponent(params.slug)}`,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
}

export async function listJoopoHubSkills(params: {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  limit?: number;
}): Promise<JoopoHubSkillListResponse> {
  return await fetchJson<JoopoHubSkillListResponse>({
    baseUrl: params.baseUrl,
    path: "/api/v1/skills",
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: {
      limit: params.limit ? String(params.limit) : undefined,
    },
  });
}

export async function downloadJoopoHubPackageArchive(params: {
  name: string;
  version?: string;
  tag?: string;
  artifact?: "archive" | "clawpack";
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<JoopoHubDownloadResult> {
  if (params.artifact === "clawpack") {
    if (!params.version) {
      throw new Error("ClawPack package downloads require an explicit version.");
    }
    const { response, url, hasToken } = await joopohubRequest({
      baseUrl: params.baseUrl,
      path: `/api/v1/packages/${encodeURIComponent(params.name)}/versions/${encodeURIComponent(
        params.version,
      )}/artifact/download`,
      token: params.token,
      timeoutMs: params.timeoutMs,
      fetchImpl: params.fetchImpl,
    });
    if (!response.ok) {
      throw await buildJoopoHubError(response, url, hasToken);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const sha256Hex = formatSha256Hex(bytes);
    const npmIntegrity = formatSha512Integrity(bytes);
    const npmShasum = formatSha1Hex(bytes);
    const headerSha256 = normalizeJoopoHubSha256Hex(
      response.headers.get("X-JoopoHub-Artifact-Sha256") ??
        response.headers.get("X-JoopoHub-ClawPack-Sha256") ??
        "",
    );
    if (!headerSha256) {
      throw new Error(
        `JoopoHub ClawPack download for "${params.name}@${params.version}" is missing X-JoopoHub-Artifact-Sha256.`,
      );
    }
    if (headerSha256 !== sha256Hex) {
      throw new Error(
        `JoopoHub ClawPack download for "${params.name}@${params.version}" declared sha256 ${headerSha256}, got ${sha256Hex}.`,
      );
    }
    const headerNpmIntegrity = normalizeHeaderValue(
      response.headers.get("X-JoopoHub-Npm-Integrity"),
    );
    if (headerNpmIntegrity && headerNpmIntegrity !== npmIntegrity) {
      throw new Error(
        `JoopoHub ClawPack download for "${params.name}@${params.version}" declared npm integrity ${headerNpmIntegrity}, got ${npmIntegrity}.`,
      );
    }
    const headerNpmShasum = normalizeHeaderValue(response.headers.get("X-JoopoHub-Npm-Shasum"));
    if (headerNpmShasum && headerNpmShasum !== npmShasum) {
      throw new Error(
        `JoopoHub ClawPack download for "${params.name}@${params.version}" declared npm shasum ${headerNpmShasum}, got ${npmShasum}.`,
      );
    }
    const npmTarballName =
      normalizeHeaderValue(response.headers.get("X-JoopoHub-Npm-Tarball-Name")) ??
      safePackageTarballName(params.name, params.version);
    const rawSpecVersion = response.headers.get("X-JoopoHub-ClawPack-Spec-Version");
    const specVersion = rawSpecVersion ? Number.parseInt(rawSpecVersion, 10) : undefined;
    const target = await createTempDownloadTarget({
      prefix: "joopo-joopohub-clawpack",
      fileName: npmTarballName,
      tmpDir: os.tmpdir(),
    });
    await fs.writeFile(target.path, bytes);
    return {
      archivePath: target.path,
      integrity: normalizeJoopoHubSha256Integrity(sha256Hex) ?? formatSha256Integrity(bytes),
      sha256Hex,
      artifact: "clawpack",
      clawpackHeaderSha256: headerSha256,
      ...(typeof specVersion === "number" && Number.isSafeInteger(specVersion) && specVersion >= 0
        ? { clawpackHeaderSpecVersion: specVersion }
        : {}),
      npmIntegrity,
      npmShasum,
      npmTarballName,
      cleanup: target.cleanup,
    };
  }
  const search = params.version
    ? { version: params.version }
    : params.tag
      ? { tag: params.tag }
      : undefined;
  const { response, url, hasToken } = await joopohubRequest({
    baseUrl: params.baseUrl,
    path: `/api/v1/packages/${encodeURIComponent(params.name)}/download`,
    search,
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
  });
  if (!response.ok) {
    throw await buildJoopoHubError(response, url, hasToken);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const sha256Hex = formatSha256Hex(bytes);
  const target = await createTempDownloadTarget({
    prefix: "joopo-joopohub-package",
    fileName: `${params.name}.zip`,
    tmpDir: os.tmpdir(),
  });
  await fs.writeFile(target.path, bytes);
  return {
    archivePath: target.path,
    integrity: formatSha256Integrity(bytes),
    sha256Hex,
    artifact: "archive",
    cleanup: target.cleanup,
  };
}

export async function downloadJoopoHubSkillArchive(params: {
  slug: string;
  version?: string;
  tag?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}): Promise<JoopoHubDownloadResult> {
  const { response, url, hasToken } = await joopohubRequest({
    baseUrl: params.baseUrl,
    path: "/api/v1/download",
    token: params.token,
    timeoutMs: params.timeoutMs,
    fetchImpl: params.fetchImpl,
    search: {
      slug: params.slug,
      version: params.version,
      tag: params.version ? undefined : params.tag,
    },
  });
  if (!response.ok) {
    throw await buildJoopoHubError(response, url, hasToken);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const sha256Hex = formatSha256Hex(bytes);
  const target = await createTempDownloadTarget({
    prefix: "joopo-joopohub-skill",
    fileName: `${params.slug}.zip`,
    tmpDir: os.tmpdir(),
  });
  await fs.writeFile(target.path, bytes);
  return {
    archivePath: target.path,
    integrity: formatSha256Integrity(bytes),
    sha256Hex,
    artifact: "archive",
    cleanup: target.cleanup,
  };
}

export function resolveLatestVersionFromPackage(detail: JoopoHubPackageDetail): string | null {
  return detail.package?.latestVersion ?? detail.package?.tags?.latest ?? null;
}

export function isJoopoHubFamilySkill(
  detail: JoopoHubPackageDetail | JoopoHubSkillDetail,
): boolean {
  if ("package" in detail) {
    return detail.package?.family === "skill";
  }
  return Boolean(detail.skill);
}

export function satisfiesPluginApiRange(
  pluginApiVersion: string,
  pluginApiRange?: string | null,
): boolean {
  if (!pluginApiRange) {
    return true;
  }
  return satisfiesSemverRange(
    normalizeCalVerCorrectionForPluginApi(pluginApiVersion),
    pluginApiRange,
  );
}

export function satisfiesGatewayMinimum(
  currentVersion: string,
  minGatewayVersion?: string | null,
): boolean {
  if (!minGatewayVersion) {
    return true;
  }
  const current = parseSemver(currentVersion);
  const minimum = parseSemver(minGatewayVersion);
  if (!current || !minimum) {
    return false;
  }
  return isAtLeast(current, minimum);
}
