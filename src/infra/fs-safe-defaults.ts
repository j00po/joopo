import { configureFsSafePython } from "@joopo/fs-safe/config";

const hasPythonModeOverride =
  process.env.FS_SAFE_PYTHON_MODE != null || process.env.JOOPO_FS_SAFE_PYTHON_MODE != null;

if (!hasPythonModeOverride) {
  configureFsSafePython({ mode: "off" });
}
