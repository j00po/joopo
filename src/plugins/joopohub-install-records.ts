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
  joopopackSha256?: string;
  joopopackSpecVersion?: number;
  joopopackManifestSha256?: string;
  joopopackSize?: number;
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
  | "joopopackSha256"
  | "joopopackSpecVersion"
  | "joopopackManifestSha256"
  | "joopopackSize"
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
    ...(fields.joopopackSha256 ? { joopopackSha256: fields.joopopackSha256 } : {}),
    ...(fields.joopopackSpecVersion !== undefined
      ? { joopopackSpecVersion: fields.joopopackSpecVersion }
      : {}),
    ...(fields.joopopackManifestSha256
      ? { joopopackManifestSha256: fields.joopopackManifestSha256 }
      : {}),
    ...(fields.joopopackSize !== undefined ? { joopopackSize: fields.joopopackSize } : {}),
  };
}
