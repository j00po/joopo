import type { PluginInstallRecord } from "../config/types.plugins.js";
import type { JoopoHubPackageChannel, JoopoHubPackageFamily } from "../infra/joopohub.js";

export type JoopoHubPluginInstallRecordFields = {
  source: "joopohub";
  joopohubUrl: string;
  joopohubPackage: string;
  joopohubFamily: Exclude<JoopoHubPackageFamily, "skill">;
  joopohubChannel?: JoopoHubPackageChannel;
  version?: string;
  integrity?: string;
  resolvedAt?: string;
  installedAt?: string;
  artifactKind?: "legacy-zip" | "npm-pack";
  artifactFormat?: "zip" | "tgz";
  npmIntegrity?: string;
  npmShasum?: string;
  npmTarballName?: string;
  clawpackSha256?: string;
  clawpackSpecVersion?: number;
  clawpackManifestSha256?: string;
  clawpackSize?: number;
};

export function buildJoopoHubPluginInstallRecordFields(
  fields: JoopoHubPluginInstallRecordFields,
): Pick<
  PluginInstallRecord,
  | "source"
  | "joopohubUrl"
  | "joopohubPackage"
  | "joopohubFamily"
  | "joopohubChannel"
  | "version"
  | "integrity"
  | "resolvedAt"
  | "installedAt"
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
  return {
    source: "joopohub",
    joopohubUrl: fields.joopohubUrl,
    joopohubPackage: fields.joopohubPackage,
    joopohubFamily: fields.joopohubFamily,
    ...(fields.joopohubChannel ? { joopohubChannel: fields.joopohubChannel } : {}),
    ...(fields.version ? { version: fields.version } : {}),
    ...(fields.integrity ? { integrity: fields.integrity } : {}),
    ...(fields.resolvedAt ? { resolvedAt: fields.resolvedAt } : {}),
    ...(fields.installedAt ? { installedAt: fields.installedAt } : {}),
    ...(fields.artifactKind ? { artifactKind: fields.artifactKind } : {}),
    ...(fields.artifactFormat ? { artifactFormat: fields.artifactFormat } : {}),
    ...(fields.npmIntegrity ? { npmIntegrity: fields.npmIntegrity } : {}),
    ...(fields.npmShasum ? { npmShasum: fields.npmShasum } : {}),
    ...(fields.npmTarballName ? { npmTarballName: fields.npmTarballName } : {}),
    ...(fields.clawpackSha256 ? { clawpackSha256: fields.clawpackSha256 } : {}),
    ...(fields.clawpackSpecVersion !== undefined
      ? { clawpackSpecVersion: fields.clawpackSpecVersion }
      : {}),
    ...(fields.clawpackManifestSha256
      ? { clawpackManifestSha256: fields.clawpackManifestSha256 }
      : {}),
    ...(fields.clawpackSize !== undefined ? { clawpackSize: fields.clawpackSize } : {}),
  };
}
