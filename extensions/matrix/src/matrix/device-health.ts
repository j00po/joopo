export type MatrixManagedDeviceInfo = {
  deviceId: string;
  displayName: string | null;
  current: boolean;
};

export type MatrixDeviceHealthSummary = {
  currentDeviceId: string | null;
  staleJoopoDevices: MatrixManagedDeviceInfo[];
  currentJoopoDevices: MatrixManagedDeviceInfo[];
};

const JOOPO_DEVICE_NAME_PREFIX = "Joopo ";

export function isJoopoManagedMatrixDevice(displayName: string | null | undefined): boolean {
  return displayName?.startsWith(JOOPO_DEVICE_NAME_PREFIX) === true;
}

export function summarizeMatrixDeviceHealth(
  devices: MatrixManagedDeviceInfo[],
): MatrixDeviceHealthSummary {
  const currentDeviceId = devices.find((device) => device.current)?.deviceId ?? null;
  const joopoDevices = devices.filter((device) =>
    isJoopoManagedMatrixDevice(device.displayName),
  );
  return {
    currentDeviceId,
    staleJoopoDevices: joopoDevices.filter((device) => !device.current),
    currentJoopoDevices: joopoDevices.filter((device) => device.current),
  };
}
