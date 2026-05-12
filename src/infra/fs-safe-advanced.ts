import "./fs-safe-defaults.js";
export {
  assertNoHardlinkedFinalPath,
  assertNoSymlinkParents,
  assertNoSymlinkParentsSync,
  sameFileIdentity,
  sanitizeUntrustedFileName,
  writeViaSiblingTempPath,
  type AssertNoSymlinkParentsOptions,
  type FileIdentityStat,
} from "@joopo/fs-safe/advanced";
