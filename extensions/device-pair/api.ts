export {
  approveDevicePairing,
  clearDeviceBootstrapTokens,
  issueDeviceBootstrapToken,
  PAIRING_SETUP_BOOTSTRAP_PROFILE,
  listDevicePairing,
  revokeDeviceBootstrapToken,
  type DeviceBootstrapProfile,
} from "joopo/plugin-sdk/device-bootstrap";
export { definePluginEntry, type JoopoPluginApi } from "joopo/plugin-sdk/plugin-entry";
export {
  resolveGatewayBindUrl,
  resolveGatewayPort,
  resolveTailnetHostWithRunner,
} from "joopo/plugin-sdk/core";
export {
  resolvePreferredJoopoTmpDir,
  runPluginCommandWithTimeout,
} from "joopo/plugin-sdk/sandbox";
export { renderQrPngBase64, renderQrPngDataUrl, writeQrPngTempFile } from "./qr-image.js";
