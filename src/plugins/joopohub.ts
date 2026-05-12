import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import JSZip from "jszip";
import {
  ARCHIVE_LIMIT_ERROR_CODE,
  ArchiveLimitError,
  DEFAULT_MAX_ARCHIVE_BYTES_ZIP,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_MAX_EXTRACTED_BYTES,
  DEFAULT_MAX_ENTRY_BYTES,
  loadZipArchiveWithPreflight,
} from "../infra/archive.js";
import { formatErrorMessage } from "../infra/errors.js";
import {
  JoopoHubRequestError,
  downloadJoopoHubPackageArchive,
  fetchJoopoHubPackageArtifact,
  fetchJoopoHubPackageDetail,
  fetchJoopoHubPackageVersion,
  normalizeJoopoHubSha256Integrity,
  normalizeJoopoHubSha256Hex,
  parseJoopoHubPluginSpec,
  resolveLatestVersionFromPackage,
  satisfiesGatewayMinimum,
  satisfiesPluginApiRange,
  type JoopoHubPackageArtifactSummary,
  type JoopoHubPackageArtifactResolverResponse,
  type JoopoHubPackageCompatibility,
  type JoopoHubPackageDetail,
  type JoopoHubPackageClawPackSummary,
  type JoopoHubResolvedArtifact,
  type JoopoHubPackageVersion,
} from "../infra/joopohub.js";
import { normalizeOptionalString } from "../shared/string-coerce.js";
import { resolveCompatibilityHostVersion } from "../version.js";
import type { InstallSafetyOverrides } from "./install-security-scan.js";
import { installPluginFromArchive, type InstallPluginResult } from "./install.js";
import type { JoopoHubPluginInstallRecordFields } from "./joopohub-install-records.js";

export const JOOPOHUB_INSTALL_ERROR_CODE = {
  INVALID_SPEC: "invalid_spec",
  PACKAGE_NOT_FOUND: "package_not_found",
  VERSION_NOT_FOUND: "version_not_found",
  NO_INSTALLABLE_VERSION: "no_installable_version",
  SKILL_PACKAGE: "skill_package",
  UNSUPPORTED_FAMILY: "unsupported_family",
  PRIVATE_PACKAGE: "private_package",
  INCOMPATIBLE_PLUGIN_API: "incompatible_plugin_api",
  INCOMPATIBLE_GATEWAY: "incompatible_gateway",
  MISSING_ARCHIVE_INTEGRITY: "missing_archive_integrity",
  ARCHIVE_INTEGRITY_MISMATCH: "archive_integrity_mismatch",
} as const;

export type JoopoHubInstallErrorCode =
  (typeof JOOPOHUB_INSTALL_ERROR_CODE)[keyof typeof JOOPOHUB_INSTALL_ERROR_CODE];

type PluginInstallLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

type JoopoHubInstallFailure = {
  ok: false;
  error: string;
  code?: JoopoHubInstallErrorCode;
};

type JoopoHubFileEntryLike = {
  path?: unknown;
  sha256?: unknown;
};

type JoopoHubFileVerificationEntry = {
  path: string;
  sha256: string;
};

type JoopoHubArchiveVerification =
  | {
      kind: "archive-integrity";
      integrity: string;
    }
  | {
      kind: "file-list";
      files: JoopoHubFileVerificationEntry[];
    };

type JoopoHubArchiveVerificationResolution =
  | {
      ok: true;
      verification: JoopoHubArchiveVerification | null;
    }
  | JoopoHubInstallFailure;

type JoopoHubArtifactResolverVersion = NonNullable<
  Exclude<JoopoHubPackageArtifactResolverResponse["version"], string | null | undefined>
>;

type JoopoHubInstallArtifactDecision = {
  version: string;
  compatibility?: JoopoHubPackageCompatibility | null;
  verification: JoopoHubArchiveVerification | null;
  clawpack?: JoopoHubPackageArtifactSummary | JoopoHubPackageClawPackSummary | null;
};

type JoopoHubArchiveFileVerificationResult =
  | {
      ok: true;
      validatedGeneratedPaths: string[];
    }
  | JoopoHubInstallFailure;

type JSZipObjectWithSize = JSZip.JSZipObject & {
  // Internal JSZip field from loadAsync() metadata. Use it only as a best-effort
  // size hint; the streaming byte checks below are the authoritative guard.
  _data?: {
    uncompressedSize?: number;
  };
};

const JOOPOHUB_GENERATED_ARCHIVE_METADATA_FILE = "_meta.json";

type JoopoHubArchiveEntryLimits = {
  maxEntryBytes: number;
  addArchiveBytes: (bytes: number) => boolean;
};

function normalizeJoopoHubClawPackInstallFields(
  clawpack: JoopoHubPackageArtifactSummary | JoopoHubPackageClawPackSummary | null | undefined,
): Pick<
  JoopoHubPluginInstallRecordFields,
  | "artifactKind"
  | "artifactFormat"
  | "npmIntegrity"
  | "npmShasum"
  | "npmTarballName"
  | "clawpackSha256"
  | "clawpackSpecVersion"
  | "clawpackManifestSha256"
  | "clawpackSize"
> {
  const isNpmPackArtifact =
    clawpack && "kind" in clawpack && normalizeOptionalString(clawpack.kind) === "npm-pack";
  const isLegacyClawPack = clawpack && "available" in clawpack && clawpack.available;
  if (!isNpmPackArtifact && !isLegacyClawPack) {
    return {};
  }

  const clawpackSha256 =
    typeof clawpack.sha256 === "string" ? normalizeJoopoHubSha256Hex(clawpack.sha256) : null;
  const clawpackManifestSha256 =
    "manifestSha256" in clawpack && typeof clawpack.manifestSha256 === "string"
      ? normalizeJoopoHubSha256Hex(clawpack.manifestSha256)
      : null;
  const clawpackSpecVersion =
    "specVersion" in clawpack &&
    typeof clawpack.specVersion === "number" &&
    Number.isSafeInteger(clawpack.specVersion) &&
    clawpack.specVersion >= 0
      ? clawpack.specVersion
      : undefined;
  const clawpackSize =
    typeof clawpack.size === "number" && Number.isSafeInteger(clawpack.size) && clawpack.size >= 0
      ? clawpack.size
      : undefined;
  const npmIntegrity = normalizeOptionalString(clawpack.npmIntegrity);
  const npmShasum = normalizeOptionalString(clawpack.npmShasum);
  const npmTarballName = normalizeOptionalString(clawpack.npmTarballName);
  return {
    artifactKind: "npm-pack",
    artifactFormat: "tgz",
    ...(npmIntegrity ? { npmIntegrity } : {}),
    ...(npmShasum ? { npmShasum } : {}),
    ...(npmTarballName ? { npmTarballName } : {}),
    ...(clawpackSha256 ? { clawpackSha256 } : {}),
    ...(clawpackSpecVersion !== undefined ? { clawpackSpecVersion } : {}),
    ...(clawpackManifestSha256 ? { clawpackManifestSha256 } : {}),
    ...(clawpackSize !== undefined ? { clawpackSize } : {}),
  };
}

function isTrustedSourceLinkedOfficialPackage(pkg: NonNullable<JoopoHubPackageDetail["package"]>) {
  const sourceRepo = normalizeOptionalString(pkg.verification?.sourceRepo);
  return (
    pkg.channel === "official" &&
    pkg.isOfficial &&
    pkg.verification?.tier === "source-linked" &&
    (sourceRepo === "joopo/joopo" ||
      sourceRepo === "github.com/joopo/joopo" ||
      sourceRepo === "https://github.com/joopo/joopo")
  );
}

function resolveJoopoHubClawPackArtifactSha256(
  clawpack: JoopoHubPackageArtifactSummary | JoopoHubPackageClawPackSummary | null | undefined,
): string | null {
  const isNpmPackArtifact =
    clawpack && "kind" in clawpack && normalizeOptionalString(clawpack.kind) === "npm-pack";
  const isLegacyClawPack = clawpack && "available" in clawpack && clawpack.available;
  if ((!isNpmPackArtifact && !isLegacyClawPack) || typeof clawpack.sha256 !== "string") {
    return null;
  }
  return normalizeJoopoHubSha256Hex(clawpack.sha256);
}

function resolveJoopoHubNpmIntegrity(
  clawpack: JoopoHubPackageArtifactSummary | JoopoHubPackageClawPackSummary | null | undefined,
): string | null {
  return normalizeOptionalString(clawpack?.npmIntegrity) ?? null;
}

function resolveJoopoHubNpmShasum(
  clawpack: JoopoHubPackageArtifactSummary | JoopoHubPackageClawPackSummary | null | undefined,
): string | null {
  return normalizeOptionalString(clawpack?.npmShasum) ?? null;
}

function resolveJoopoHubNpmTarballName(
  clawpack: JoopoHubPackageArtifactSummary | JoopoHubPackageClawPackSummary | null | undefined,
): string | null {
  return normalizeOptionalString(clawpack?.npmTarballName) ?? null;
}

function resolveJoopoHubNpmPackArtifact(
  version: NonNullable<JoopoHubPackageVersion["version"]>,
): JoopoHubPackageArtifactSummary | JoopoHubPackageClawPackSummary | null {
  if (version.artifact?.kind === "npm-pack") {
    return version.artifact;
  }
  if (version.clawpack?.available === true) {
    return version.clawpack;
  }
  return null;
}

function readArtifactResolverVersion(
  response: JoopoHubPackageArtifactResolverResponse,
  requestedVersion: string,
): JoopoHubArtifactResolverVersion {
  if (
    response.version &&
    typeof response.version === "object" &&
    !Array.isArray(response.version)
  ) {
    return response.version;
  }
  if (typeof response.version === "string" && response.version.trim().length > 0) {
    return { version: response.version.trim() };
  }
  return { version: requestedVersion };
}

function isJoopoHubPackageFamily(
  value: unknown,
): value is NonNullable<JoopoHubPackageVersion["package"]>["family"] {
  return value === "code-plugin" || value === "bundle-plugin" || value === "skill";
}

function normalizeArtifactResolverFiles(
  files: JoopoHubArtifactResolverVersion["files"],
): NonNullable<JoopoHubPackageVersion["version"]>["files"] {
  if (!Array.isArray(files)) {
    return undefined;
  }
  return files as NonNullable<JoopoHubPackageVersion["version"]>["files"];
}

type JoopoHubResolvedArtifactWire = {
  artifactKind?: string | null;
  kind?: string | null;
  artifactSha256?: string | null;
  sha256?: string | null;
  npmIntegrity?: string | null;
  npmShasum?: string | null;
  downloadUrl?: string | null;
};

function resolveTopLevelNpmPackArtifact(
  artifact: JoopoHubResolvedArtifact | null | undefined,
): JoopoHubPackageArtifactSummary | null {
  const wire = artifact as JoopoHubResolvedArtifactWire | null | undefined;
  const artifactKind = wire?.artifactKind ?? wire?.kind;
  if (artifactKind !== "npm-pack") {
    return null;
  }
  if (typeof wire?.npmIntegrity !== "string") {
    return null;
  }
  return {
    kind: "npm-pack",
    format: "tgz",
    sha256: wire.artifactSha256 ?? wire.sha256 ?? null,
    npmIntegrity: wire.npmIntegrity,
    npmShasum: wire.npmShasum ?? null,
    downloadUrl: wire.downloadUrl ?? null,
  };
}

function resolveTopLevelLegacyArchiveVerification(
  artifact: JoopoHubResolvedArtifact | null | undefined,
): JoopoHubArchiveVerification | null {
  const wire = artifact as JoopoHubResolvedArtifactWire | null | undefined;
  const artifactKind = wire?.artifactKind ?? wire?.kind;
  const artifactSha256 = wire?.artifactSha256 ?? wire?.sha256;
  if (artifactKind !== "legacy-zip" || typeof artifactSha256 !== "string") {
    return null;
  }
  const integrity = normalizeJoopoHubSha256Integrity(artifactSha256);
  return integrity ? { kind: "archive-integrity", integrity } : null;
}

export function formatJoopoHubSpecifier(params: { name: string; version?: string }): string {
  return `joopohub:${params.name}${params.version ? `@${params.version}` : ""}`;
}

function buildJoopoHubInstallFailure(
  error: string,
  code?: JoopoHubInstallErrorCode,
): JoopoHubInstallFailure {
  return { ok: false, error, code };
}

function isJoopoHubInstallFailure(value: unknown): value is JoopoHubInstallFailure {
  return Boolean(
    value &&
    typeof value === "object" &&
    "ok" in value &&
    Object.is((value as { ok?: unknown }).ok, false) &&
    "error" in value,
  );
}

function mapJoopoHubRequestError(
  error: unknown,
  context: { stage: "package" | "version"; name: string; version?: string },
): JoopoHubInstallFailure {
  if (error instanceof JoopoHubRequestError && error.status === 404) {
    if (context.stage === "package") {
      return buildJoopoHubInstallFailure(
        "Package not found on JoopoHub.",
        JOOPOHUB_INSTALL_ERROR_CODE.PACKAGE_NOT_FOUND,
      );
    }
    return buildJoopoHubInstallFailure(
      `Version not found on JoopoHub: ${context.name}@${context.version ?? "unknown"}.`,
      JOOPOHUB_INSTALL_ERROR_CODE.VERSION_NOT_FOUND,
    );
  }
  return buildJoopoHubInstallFailure(formatErrorMessage(error));
}

function isMissingArtifactResolverRoute(error: unknown): boolean {
  return (
    error instanceof JoopoHubRequestError &&
    error.status === 404 &&
    error.requestPath.endsWith("/artifact")
  );
}

function buildArtifactResolverResponseFromVersion(params: {
  detail: JoopoHubPackageDetail;
  versionDetail: JoopoHubPackageVersion;
}): JoopoHubPackageArtifactResolverResponse {
  const packageDetail = params.detail.package;
  const versionPackage = params.versionDetail.package;
  return {
    package: versionPackage
      ? {
          name: versionPackage.name,
          displayName: versionPackage.displayName,
          family: versionPackage.family,
        }
      : packageDetail
        ? {
            name: packageDetail.name,
            displayName: packageDetail.displayName,
            family: packageDetail.family,
          }
        : null,
    version: params.versionDetail.version,
  };
}

function formatJoopoHubClawPackDownloadError(params: {
  error: unknown;
  packageName: string;
  version: string;
}): string {
  const message = formatErrorMessage(params.error);
  if (!(params.error instanceof JoopoHubRequestError)) {
    return message;
  }
  return `JoopoHub artifact download for "${params.packageName}@${params.version}" is not available yet (${message}). Use "npm:${params.packageName}@${params.version}" for launch installs while JoopoHub artifact routing is being rolled out.`;
}

function formatJoopoHubMissingArtifactMetadataError(params: {
  packageName: string;
  version: string;
}): string {
  return `JoopoHub package "${params.packageName}@${params.version}" does not expose a downloadable plugin artifact yet. Use "npm:${params.packageName}@${params.version}" for launch installs while JoopoHub artifact routing is being rolled out.`;
}

function resolveRequestedVersion(params: {
  detail: JoopoHubPackageDetail;
  requestedVersion?: string;
}): string | null {
  if (params.requestedVersion) {
    return params.detail.package?.tags?.[params.requestedVersion] ?? params.requestedVersion;
  }
  return resolveLatestVersionFromPackage(params.detail);
}

function readTrimmedString(value: unknown): string | null {
  return normalizeOptionalString(value) ?? null;
}

function normalizeJoopoHubRelativePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  if (value.trim() !== value || value.includes("\\")) {
    return null;
  }
  if (value.startsWith("/")) {
    return null;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }
  return value;
}

function describeInvalidJoopoHubRelativePath(value: unknown): string {
  if (typeof value !== "string") {
    return `non-string value of type ${typeof value}`;
  }
  if (value.length === 0) {
    return "empty string";
  }
  if (value.trim() !== value) {
    return `path "${value}" has leading or trailing whitespace`;
  }
  if (value.includes("\\")) {
    return `path "${value}" contains backslashes`;
  }
  if (value.startsWith("/")) {
    return `path "${value}" is absolute`;
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment.length === 0)) {
    return `path "${value}" contains an empty segment`;
  }
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return `path "${value}" contains dot segments`;
  }
  return `path "${value}" failed validation for an unknown reason`;
}

function describeInvalidJoopoHubSha256(value: unknown): string {
  if (typeof value !== "string") {
    return `non-string value of type ${typeof value}`;
  }
  if (value.length === 0) {
    return "empty string";
  }
  if (value.trim().length === 0) {
    return "whitespace-only string";
  }
  return `value "${value}" is not a 64-character hexadecimal SHA-256 digest`;
}

function resolveJoopoHubArchiveVerification(
  versionDetail: JoopoHubPackageVersion,
  packageName: string,
  version: string,
): JoopoHubArchiveVerificationResolution {
  const sha256hashValue = versionDetail.version?.sha256hash;
  const sha256hash = readTrimmedString(sha256hashValue);
  const integrity = sha256hash ? normalizeJoopoHubSha256Integrity(sha256hash) : null;
  if (integrity) {
    return {
      ok: true,
      verification: {
        kind: "archive-integrity",
        integrity,
      },
    };
  }
  if (sha256hashValue !== undefined && sha256hashValue !== null) {
    const detail =
      typeof sha256hashValue === "string" && sha256hashValue.trim().length === 0
        ? "empty string"
        : typeof sha256hashValue === "string"
          ? `unrecognized value "${sha256hashValue.trim()}"`
          : `non-string value of type ${typeof sha256hashValue}`;
    return buildJoopoHubInstallFailure(
      `JoopoHub version metadata for "${packageName}@${version}" has an invalid sha256hash (${detail}).`,
      JOOPOHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
    );
  }
  const files = versionDetail.version?.files;
  if (!Array.isArray(files) || files.length === 0) {
    return {
      ok: true,
      verification: null,
    };
  }
  const normalizedFiles: JoopoHubFileVerificationEntry[] = [];
  const seenPaths = new Set<string>();
  for (const [index, file] of files.entries()) {
    if (!file || typeof file !== "object") {
      return buildJoopoHubInstallFailure(
        `JoopoHub version metadata for "${packageName}@${version}" has an invalid files[${index}] entry (expected an object, got ${file === null ? "null" : typeof file}).`,
        JOOPOHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    const fileRecord = file as JoopoHubFileEntryLike;
    const filePath = normalizeJoopoHubRelativePath(fileRecord.path);
    const sha256Value = readTrimmedString(fileRecord.sha256);
    const sha256 = sha256Value ? normalizeJoopoHubSha256Hex(sha256Value) : null;
    if (!filePath) {
      return buildJoopoHubInstallFailure(
        `JoopoHub version metadata for "${packageName}@${version}" has an invalid files[${index}].path (${describeInvalidJoopoHubRelativePath(fileRecord.path)}).`,
        JOOPOHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    if (filePath === JOOPOHUB_GENERATED_ARCHIVE_METADATA_FILE) {
      return buildJoopoHubInstallFailure(
        `JoopoHub version metadata for "${packageName}@${version}" must not include generated file "${filePath}" in files[].`,
        JOOPOHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    if (!sha256) {
      return buildJoopoHubInstallFailure(
        `JoopoHub version metadata for "${packageName}@${version}" has an invalid files[${index}].sha256 (${describeInvalidJoopoHubSha256(fileRecord.sha256)}).`,
        JOOPOHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    if (seenPaths.has(filePath)) {
      return buildJoopoHubInstallFailure(
        `JoopoHub version metadata for "${packageName}@${version}" has duplicate files[] path "${filePath}".`,
        JOOPOHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
      );
    }
    seenPaths.add(filePath);
    normalizedFiles.push({ path: filePath, sha256 });
  }
  return {
    ok: true,
    verification: {
      kind: "file-list",
      files: normalizedFiles,
    },
  };
}

async function readLimitedJoopoHubArchiveEntry<T>(
  entry: JSZip.JSZipObject,
  limits: JoopoHubArchiveEntryLimits,
  handlers: {
    onChunk: (buffer: Buffer) => void;
    onEnd: () => T;
  },
): Promise<T | JoopoHubInstallFailure> {
  const hintedSize = (entry as JSZipObjectWithSize)._data?.uncompressedSize;
  if (
    typeof hintedSize === "number" &&
    Number.isFinite(hintedSize) &&
    hintedSize > limits.maxEntryBytes
  ) {
    return buildJoopoHubInstallFailure(
      `JoopoHub archive fallback verification rejected "${entry.name}" because it exceeds the per-file size limit.`,
      JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  let entryBytes = 0;
  return await new Promise<T | JoopoHubInstallFailure>((resolve) => {
    let settled = false;
    const stream = entry.nodeStream("nodebuffer") as NodeJS.ReadableStream & {
      destroy?: (error?: Error) => void;
    };
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      if (settled) {
        return;
      }
      const buffer =
        typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array);
      entryBytes += buffer.byteLength;
      if (entryBytes > limits.maxEntryBytes) {
        settled = true;
        stream.destroy?.();
        resolve(
          buildJoopoHubInstallFailure(
            `JoopoHub archive fallback verification rejected "${entry.name}" because it exceeds the per-file size limit.`,
            JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
          ),
        );
        return;
      }
      if (!limits.addArchiveBytes(buffer.byteLength)) {
        settled = true;
        stream.destroy?.();
        resolve(
          buildJoopoHubInstallFailure(
            "JoopoHub archive fallback verification exceeded the total extracted-size limit.",
            JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
          ),
        );
        return;
      }
      handlers.onChunk(buffer);
    });
    stream.once("end", () => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(handlers.onEnd());
    });
    stream.once("error", (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(
        buildJoopoHubInstallFailure(
          error instanceof Error ? error.message : String(error),
          JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        ),
      );
    });
  });
}

async function readJoopoHubArchiveEntryBuffer(
  entry: JSZip.JSZipObject,
  limits: JoopoHubArchiveEntryLimits,
): Promise<Buffer | JoopoHubInstallFailure> {
  const chunks: Buffer[] = [];
  return await readLimitedJoopoHubArchiveEntry(entry, limits, {
    onChunk(buffer) {
      chunks.push(buffer);
    },
    onEnd() {
      return Buffer.concat(chunks);
    },
  });
}

async function hashJoopoHubArchiveEntry(
  entry: JSZip.JSZipObject,
  limits: JoopoHubArchiveEntryLimits,
): Promise<string | JoopoHubInstallFailure> {
  const digest = createHash("sha256");
  return await readLimitedJoopoHubArchiveEntry(entry, limits, {
    onChunk(buffer) {
      digest.update(buffer);
    },
    onEnd() {
      return digest.digest("hex");
    },
  });
}

function validateJoopoHubArchiveMetaJson(params: {
  packageName: string;
  version: string;
  bytes: Buffer;
}): JoopoHubInstallFailure | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(params.bytes.toString("utf8"));
  } catch {
    return buildJoopoHubInstallFailure(
      `JoopoHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json is not valid JSON.`,
      JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    return buildJoopoHubInstallFailure(
      `JoopoHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json is not a JSON object.`,
      JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  const record = parsed as { slug?: unknown; version?: unknown };
  if (record.slug !== params.packageName) {
    return buildJoopoHubInstallFailure(
      `JoopoHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json slug does not match the package name.`,
      JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  if (record.version !== params.version) {
    return buildJoopoHubInstallFailure(
      `JoopoHub archive contents do not match files[] metadata for "${params.packageName}@${params.version}": _meta.json version does not match the package version.`,
      JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
    );
  }
  return null;
}

function mapJoopoHubArchiveReadFailure(error: unknown): JoopoHubInstallFailure {
  if (error instanceof ArchiveLimitError) {
    if (error.code === ARCHIVE_LIMIT_ERROR_CODE.ENTRY_COUNT_EXCEEDS_LIMIT) {
      return buildJoopoHubInstallFailure(
        "JoopoHub archive fallback verification exceeded the archive entry limit.",
        JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
    if (error.code === ARCHIVE_LIMIT_ERROR_CODE.ARCHIVE_SIZE_EXCEEDS_LIMIT) {
      return buildJoopoHubInstallFailure(
        "JoopoHub archive fallback verification rejected the downloaded archive because it exceeds the ZIP archive size limit.",
        JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
  }
  return buildJoopoHubInstallFailure(
    "JoopoHub archive fallback verification failed while reading the downloaded archive.",
    JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
  );
}

async function verifyJoopoHubArchiveFiles(params: {
  archivePath: string;
  packageName: string;
  packageVersion: string;
  files: JoopoHubFileVerificationEntry[];
}): Promise<JoopoHubArchiveFileVerificationResult> {
  try {
    const archiveStat = await fs.stat(params.archivePath);
    if (archiveStat.size > DEFAULT_MAX_ARCHIVE_BYTES_ZIP) {
      return buildJoopoHubInstallFailure(
        "JoopoHub archive fallback verification rejected the downloaded archive because it exceeds the ZIP archive size limit.",
        JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
    const archiveBytes = await fs.readFile(params.archivePath);
    const zip = await loadZipArchiveWithPreflight(archiveBytes, {
      maxArchiveBytes: DEFAULT_MAX_ARCHIVE_BYTES_ZIP,
      maxEntries: DEFAULT_MAX_ENTRIES,
      maxExtractedBytes: DEFAULT_MAX_EXTRACTED_BYTES,
      maxEntryBytes: DEFAULT_MAX_ENTRY_BYTES,
    });
    const actualFiles = new Map<string, string>();
    const validatedGeneratedPaths = new Set<string>();
    let entryCount = 0;
    let extractedBytes = 0;
    const addArchiveBytes = (bytes: number): boolean => {
      extractedBytes += bytes;
      return extractedBytes <= DEFAULT_MAX_EXTRACTED_BYTES;
    };
    for (const entry of Object.values(zip.files as Record<string, JSZip.JSZipObject>)) {
      entryCount += 1;
      if (entryCount > DEFAULT_MAX_ENTRIES) {
        return buildJoopoHubInstallFailure(
          "JoopoHub archive fallback verification exceeded the archive entry limit.",
          JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (entry.dir) {
        continue;
      }
      const relativePath = normalizeJoopoHubRelativePath(entry.name);
      if (!relativePath) {
        return buildJoopoHubInstallFailure(
          `JoopoHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": invalid package file path "${entry.name}" (${describeInvalidJoopoHubRelativePath(entry.name)}).`,
          JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (relativePath === JOOPOHUB_GENERATED_ARCHIVE_METADATA_FILE) {
        const metaResult = await readJoopoHubArchiveEntryBuffer(entry, {
          maxEntryBytes: DEFAULT_MAX_ENTRY_BYTES,
          addArchiveBytes,
        });
        if (isJoopoHubInstallFailure(metaResult)) {
          return metaResult;
        }
        const metaFailure = validateJoopoHubArchiveMetaJson({
          packageName: params.packageName,
          version: params.packageVersion,
          bytes: metaResult,
        });
        if (metaFailure) {
          return metaFailure;
        }
        validatedGeneratedPaths.add(relativePath);
        continue;
      }
      const sha256 = await hashJoopoHubArchiveEntry(entry, {
        maxEntryBytes: DEFAULT_MAX_ENTRY_BYTES,
        addArchiveBytes,
      });
      if (typeof sha256 !== "string") {
        return sha256;
      }
      actualFiles.set(relativePath, sha256);
    }
    for (const file of params.files) {
      const actualSha256 = actualFiles.get(file.path);
      if (!actualSha256) {
        return buildJoopoHubInstallFailure(
          `JoopoHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": missing "${file.path}".`,
          JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (actualSha256 !== file.sha256) {
        return buildJoopoHubInstallFailure(
          `JoopoHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": expected ${file.path} to hash to ${file.sha256}, got ${actualSha256}.`,
          JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      actualFiles.delete(file.path);
    }
    const unexpectedFile = [...actualFiles.keys()].toSorted()[0];
    if (unexpectedFile) {
      return buildJoopoHubInstallFailure(
        `JoopoHub archive contents do not match files[] metadata for "${params.packageName}@${params.packageVersion}": unexpected file "${unexpectedFile}".`,
        JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
      );
    }
    return {
      ok: true,
      validatedGeneratedPaths: [...validatedGeneratedPaths].toSorted(),
    };
  } catch (error) {
    return mapJoopoHubArchiveReadFailure(error);
  }
}

async function resolveCompatiblePackageVersion(params: {
  detail: JoopoHubPackageDetail;
  requestedVersion?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}): Promise<({ ok: true } & JoopoHubInstallArtifactDecision) | JoopoHubInstallFailure> {
  const requestedVersion = resolveRequestedVersion(params);
  if (!requestedVersion) {
    return buildJoopoHubInstallFailure(
      `JoopoHub package "${params.detail.package?.name ?? "unknown"}" has no installable version.`,
      JOOPOHUB_INSTALL_ERROR_CODE.NO_INSTALLABLE_VERSION,
    );
  }
  let artifactResponse: JoopoHubPackageArtifactResolverResponse;
  try {
    artifactResponse = await fetchJoopoHubPackageArtifact({
      name: params.detail.package?.name ?? "",
      version: requestedVersion,
      baseUrl: params.baseUrl,
      token: params.token,
      timeoutMs: params.timeoutMs,
    });
  } catch (error) {
    if (isMissingArtifactResolverRoute(error)) {
      try {
        const versionDetail = await fetchJoopoHubPackageVersion({
          name: params.detail.package?.name ?? "",
          version: requestedVersion,
          baseUrl: params.baseUrl,
          token: params.token,
          timeoutMs: params.timeoutMs,
        });
        artifactResponse = buildArtifactResolverResponseFromVersion({
          detail: params.detail,
          versionDetail,
        });
      } catch (versionError) {
        return mapJoopoHubRequestError(versionError, {
          stage: "version",
          name: params.detail.package?.name ?? "unknown",
          version: requestedVersion,
        });
      }
    } else {
      return mapJoopoHubRequestError(error, {
        stage: "version",
        name: params.detail.package?.name ?? "unknown",
        version: requestedVersion,
      });
    }
  }
  const artifactVersion = readArtifactResolverVersion(artifactResponse, requestedVersion);
  const resolvedVersion = normalizeOptionalString(artifactVersion.version) ?? requestedVersion;
  if (params.detail.package?.family === "skill") {
    return {
      ok: true,
      version: resolvedVersion,
      compatibility: artifactVersion.compatibility ?? params.detail.package?.compatibility ?? null,
      verification: null,
      clawpack:
        artifactVersion.clawpack ?? resolveTopLevelNpmPackArtifact(artifactResponse.artifact),
    };
  }
  const artifactFamily = artifactResponse.package?.family;
  const resolvedFamily: NonNullable<JoopoHubPackageVersion["package"]>["family"] =
    isJoopoHubPackageFamily(artifactFamily)
      ? artifactFamily
      : (params.detail.package?.family ?? "code-plugin");
  const versionRecord: NonNullable<JoopoHubPackageVersion["version"]> = {
    version: resolvedVersion,
    createdAt: typeof artifactVersion.createdAt === "number" ? artifactVersion.createdAt : 0,
    changelog: typeof artifactVersion.changelog === "string" ? artifactVersion.changelog : "",
    distTags: artifactVersion.distTags,
    files: normalizeArtifactResolverFiles(artifactVersion.files),
    sha256hash: artifactVersion.sha256hash,
    compatibility: artifactVersion.compatibility,
    artifact: artifactVersion.artifact,
    clawpack: artifactVersion.clawpack ?? undefined,
  };
  const versionDetail: JoopoHubPackageVersion = {
    package: artifactResponse.package
      ? {
          name: artifactResponse.package.name ?? params.detail.package?.name ?? "",
          displayName:
            artifactResponse.package.displayName ?? params.detail.package?.displayName ?? "",
          family: resolvedFamily,
        }
      : null,
    version: versionRecord,
  };
  const clawpack =
    resolveJoopoHubNpmPackArtifact(versionRecord) ??
    resolveTopLevelNpmPackArtifact(artifactResponse.artifact);
  const verificationState = resolveJoopoHubArchiveVerification(
    versionDetail,
    params.detail.package?.name ?? "unknown",
    resolvedVersion,
  );
  if (!verificationState.ok) {
    if (!resolveJoopoHubClawPackArtifactSha256(clawpack)) {
      return verificationState;
    }
    return {
      ok: true,
      version: resolvedVersion,
      compatibility:
        versionDetail.version?.compatibility ?? params.detail.package?.compatibility ?? null,
      verification: null,
      clawpack,
    };
  }
  const topLevelLegacyVerification = resolveTopLevelLegacyArchiveVerification(
    artifactResponse.artifact,
  );
  return {
    ok: true,
    version: resolvedVersion,
    compatibility:
      versionDetail.version?.compatibility ?? params.detail.package?.compatibility ?? null,
    verification: verificationState.verification ?? topLevelLegacyVerification,
    clawpack,
  };
}

function validateJoopoHubPluginPackage(params: {
  detail: JoopoHubPackageDetail;
  compatibility?: JoopoHubPackageCompatibility | null;
  runtimeVersion: string;
}): JoopoHubInstallFailure | null {
  const pkg = params.detail.package;
  if (!pkg) {
    return buildJoopoHubInstallFailure(
      "Package not found on JoopoHub.",
      JOOPOHUB_INSTALL_ERROR_CODE.PACKAGE_NOT_FOUND,
    );
  }
  if (pkg.family === "skill") {
    return buildJoopoHubInstallFailure(
      `"${pkg.name}" is a skill. Use "joopo skills install ${pkg.name}" instead.`,
      JOOPOHUB_INSTALL_ERROR_CODE.SKILL_PACKAGE,
    );
  }
  if (pkg.family !== "code-plugin" && pkg.family !== "bundle-plugin") {
    return buildJoopoHubInstallFailure(
      `Unsupported JoopoHub package family: ${String(pkg.family)}`,
      JOOPOHUB_INSTALL_ERROR_CODE.UNSUPPORTED_FAMILY,
    );
  }
  if (pkg.channel === "private") {
    return buildJoopoHubInstallFailure(
      `"${pkg.name}" is private on JoopoHub and cannot be installed anonymously.`,
      JOOPOHUB_INSTALL_ERROR_CODE.PRIVATE_PACKAGE,
    );
  }

  const compatibility = params.compatibility;
  const runtimeVersion = params.runtimeVersion;
  if (
    compatibility?.pluginApiRange &&
    !satisfiesPluginApiRange(runtimeVersion, compatibility.pluginApiRange)
  ) {
    return buildJoopoHubInstallFailure(
      `Plugin "${pkg.name}" requires plugin API ${compatibility.pluginApiRange}, but this Joopo runtime exposes ${runtimeVersion}.`,
      JOOPOHUB_INSTALL_ERROR_CODE.INCOMPATIBLE_PLUGIN_API,
    );
  }

  if (
    compatibility?.minGatewayVersion &&
    !satisfiesGatewayMinimum(runtimeVersion, compatibility.minGatewayVersion)
  ) {
    return buildJoopoHubInstallFailure(
      `Plugin "${pkg.name}" requires Joopo >=${compatibility.minGatewayVersion}, but this host is ${runtimeVersion}.`,
      JOOPOHUB_INSTALL_ERROR_CODE.INCOMPATIBLE_GATEWAY,
    );
  }
  return null;
}

function logJoopoHubPackageSummary(params: {
  detail: JoopoHubPackageDetail;
  version: string;
  compatibility?: JoopoHubPackageCompatibility | null;
  logger?: PluginInstallLogger;
}) {
  const pkg = params.detail.package;
  if (!pkg) {
    return;
  }
  const verification = pkg.verification?.tier ? ` verification=${pkg.verification.tier}` : "";
  params.logger?.info?.(
    `JoopoHub ${pkg.family} ${pkg.name}@${params.version} channel=${pkg.channel}${verification}`,
  );
  const compatibilityParts = [
    params.compatibility?.pluginApiRange
      ? `pluginApi=${params.compatibility.pluginApiRange}`
      : null,
    params.compatibility?.minGatewayVersion
      ? `minGateway=${params.compatibility.minGatewayVersion}`
      : null,
  ].filter(Boolean);
  if (compatibilityParts.length > 0) {
    params.logger?.info?.(`Compatibility: ${compatibilityParts.join(" ")}`);
  }
  if (pkg.channel !== "official") {
    params.logger?.warn?.(
      `JoopoHub package "${pkg.name}" is ${pkg.channel}; review source and verification before enabling.`,
    );
  }
}

export async function installPluginFromJoopoHub(
  params: InstallSafetyOverrides & {
    spec: string;
    baseUrl?: string;
    token?: string;
    logger?: PluginInstallLogger;
    mode?: "install" | "update";
    extensionsDir?: string;
    timeoutMs?: number;
    dryRun?: boolean;
    expectedPluginId?: string;
  },
): Promise<
  | ({
      ok: true;
    } & Extract<InstallPluginResult, { ok: true }> & {
        joopohub: JoopoHubPluginInstallRecordFields;
        packageName: string;
      })
  | JoopoHubInstallFailure
  | Extract<InstallPluginResult, { ok: false }>
> {
  const parsed = parseJoopoHubPluginSpec(params.spec);
  if (!parsed?.name) {
    return buildJoopoHubInstallFailure(
      `invalid JoopoHub plugin spec: ${params.spec}`,
      JOOPOHUB_INSTALL_ERROR_CODE.INVALID_SPEC,
    );
  }

  params.logger?.info?.(`Resolving ${formatJoopoHubSpecifier(parsed)}…`);
  let detail: JoopoHubPackageDetail;
  try {
    detail = await fetchJoopoHubPackageDetail({
      name: parsed.name,
      baseUrl: params.baseUrl,
      token: params.token,
      timeoutMs: params.timeoutMs,
    });
  } catch (error) {
    return mapJoopoHubRequestError(error, {
      stage: "package",
      name: parsed.name,
    });
  }
  const versionState = await resolveCompatiblePackageVersion({
    detail,
    requestedVersion: parsed.version,
    baseUrl: params.baseUrl,
    token: params.token,
    timeoutMs: params.timeoutMs,
  });
  if (!versionState.ok) {
    return versionState;
  }
  const runtimeVersion = resolveCompatibilityHostVersion();
  const validationFailure = validateJoopoHubPluginPackage({
    detail,
    compatibility: versionState.compatibility,
    runtimeVersion,
  });
  if (validationFailure) {
    return validationFailure;
  }
  const expectedClawPackSha256 = resolveJoopoHubClawPackArtifactSha256(versionState.clawpack);
  const canonicalPackageName = detail.package?.name ?? parsed.name;
  if (!versionState.verification && !expectedClawPackSha256) {
    return buildJoopoHubInstallFailure(
      formatJoopoHubMissingArtifactMetadataError({
        packageName: canonicalPackageName,
        version: versionState.version,
      }),
      JOOPOHUB_INSTALL_ERROR_CODE.MISSING_ARCHIVE_INTEGRITY,
    );
  }
  logJoopoHubPackageSummary({
    detail,
    version: versionState.version,
    compatibility: versionState.compatibility,
    logger: params.logger,
  });

  let archive;
  try {
    archive = await downloadJoopoHubPackageArchive({
      name: parsed.name,
      version: versionState.version,
      artifact: expectedClawPackSha256 ? "clawpack" : "archive",
      baseUrl: params.baseUrl,
      token: params.token,
      timeoutMs: params.timeoutMs,
    });
  } catch (error) {
    // Fix-me(joopohub): remove this npm hint once JoopoHub ClawPack artifact
    // routing is live for official package installs.
    return buildJoopoHubInstallFailure(
      expectedClawPackSha256
        ? formatJoopoHubClawPackDownloadError({
            error,
            packageName: canonicalPackageName,
            version: versionState.version,
          })
        : formatErrorMessage(error),
    );
  }
  try {
    if (expectedClawPackSha256) {
      const expectedIntegrity = normalizeJoopoHubSha256Integrity(expectedClawPackSha256);
      const expectedNpmIntegrity = resolveJoopoHubNpmIntegrity(versionState.clawpack);
      if (
        archive.artifact !== "clawpack" ||
        archive.clawpackHeaderSha256 !== expectedClawPackSha256 ||
        archive.sha256Hex !== expectedClawPackSha256 ||
        archive.integrity !== expectedIntegrity
      ) {
        return buildJoopoHubInstallFailure(
          `JoopoHub ClawPack integrity mismatch for "${parsed.name}@${versionState.version}": expected ${expectedClawPackSha256}, got ${archive.sha256Hex}.`,
          JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      if (expectedNpmIntegrity && archive.npmIntegrity !== expectedNpmIntegrity) {
        return buildJoopoHubInstallFailure(
          `JoopoHub ClawPack npm integrity mismatch for "${parsed.name}@${versionState.version}": expected ${expectedNpmIntegrity}, got ${archive.npmIntegrity ?? "unknown"}.`,
          JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
      const expectedNpmShasum = resolveJoopoHubNpmShasum(versionState.clawpack);
      if (expectedNpmShasum && archive.npmShasum !== expectedNpmShasum) {
        return buildJoopoHubInstallFailure(
          `JoopoHub ClawPack npm shasum mismatch for "${parsed.name}@${versionState.version}": expected ${expectedNpmShasum}, got ${archive.npmShasum ?? "unknown"}.`,
          JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
    } else if (versionState.verification?.kind === "archive-integrity") {
      if (archive.integrity !== versionState.verification.integrity) {
        return buildJoopoHubInstallFailure(
          `JoopoHub archive integrity mismatch for "${parsed.name}@${versionState.version}": expected ${versionState.verification.integrity}, got ${archive.integrity}.`,
          JOOPOHUB_INSTALL_ERROR_CODE.ARCHIVE_INTEGRITY_MISMATCH,
        );
      }
    } else if (versionState.verification) {
      const validatedPaths = versionState.verification.files
        .map((file) => file.path)
        .toSorted()
        .join(", ");
      const fallbackVerification = await verifyJoopoHubArchiveFiles({
        archivePath: archive.archivePath,
        packageName: canonicalPackageName,
        packageVersion: versionState.version,
        files: versionState.verification.files,
      });
      if (!fallbackVerification.ok) {
        return fallbackVerification;
      }
      const validatedGeneratedPaths =
        fallbackVerification.validatedGeneratedPaths.length > 0
          ? ` Validated generated metadata files present in archive: ${fallbackVerification.validatedGeneratedPaths.join(", ")} (JSON parse plus slug/version match only).`
          : "";
      params.logger?.warn?.(
        `JoopoHub package "${canonicalPackageName}@${versionState.version}" is missing sha256hash; falling back to files[] verification. Validated files: ${validatedPaths}.${validatedGeneratedPaths}`,
      );
    }
    params.logger?.info?.(
      `Downloading ${detail.package?.family === "bundle-plugin" ? "bundle" : "plugin"} ${parsed.name}@${versionState.version} from JoopoHub…`,
    );
    const installResult = await installPluginFromArchive({
      archivePath: archive.archivePath,
      dangerouslyForceUnsafeInstall: params.dangerouslyForceUnsafeInstall,
      trustedSourceLinkedOfficialInstall: isTrustedSourceLinkedOfficialPackage(detail.package!),
      logger: params.logger,
      mode: params.mode,
      extensionsDir: params.extensionsDir,
      timeoutMs: params.timeoutMs,
      dryRun: params.dryRun,
      expectedPluginId: params.expectedPluginId,
    });
    if (!installResult.ok) {
      return installResult;
    }

    const pkg = detail.package!;
    const clawpackFields = normalizeJoopoHubClawPackInstallFields(versionState.clawpack);
    const observedClawPackArtifactFields =
      archive.artifact === "clawpack"
        ? ({
            artifactKind: "npm-pack",
            artifactFormat: "tgz",
            ...(archive.npmIntegrity ? { npmIntegrity: archive.npmIntegrity } : {}),
            ...(archive.npmShasum ? { npmShasum: archive.npmShasum } : {}),
            ...(archive.npmTarballName ? { npmTarballName: archive.npmTarballName } : {}),
          } satisfies Partial<JoopoHubPluginInstallRecordFields>)
        : ({
            artifactKind: "legacy-zip",
            artifactFormat: "zip",
          } satisfies Partial<JoopoHubPluginInstallRecordFields>);
    const expectedTarballName = resolveJoopoHubNpmTarballName(versionState.clawpack);
    const joopohubFamily =
      pkg.family === "code-plugin" || pkg.family === "bundle-plugin" ? pkg.family : null;
    if (!joopohubFamily) {
      return buildJoopoHubInstallFailure(
        `Unsupported JoopoHub package family: ${pkg.family}`,
        JOOPOHUB_INSTALL_ERROR_CODE.UNSUPPORTED_FAMILY,
      );
    }
    return {
      ...installResult,
      packageName: parsed.name,
      joopohub: {
        source: "joopohub",
        joopohubUrl:
          normalizeOptionalString(params.baseUrl) ||
          normalizeOptionalString(process.env.JOOPO_JOOPOHUB_URL) ||
          "https://joopohub.ai",
        joopohubPackage: parsed.name,
        joopohubFamily,
        joopohubChannel: pkg.channel,
        version: installResult.version ?? versionState.version,
        // For fallback installs this is the observed download digest, not a
        // server-attested sha256hash from JoopoHub version metadata.
        integrity: archive.integrity,
        resolvedAt: new Date().toISOString(),
        ...clawpackFields,
        ...observedClawPackArtifactFields,
        ...(expectedTarballName && !archive.npmTarballName
          ? { npmTarballName: expectedTarballName }
          : {}),
      },
    };
  } finally {
    await archive.cleanup().catch(() => undefined);
  }
}
