import { describe, expect, it } from "vitest";
import { isJoopoManagedMatrixDevice, summarizeMatrixDeviceHealth } from "./device-health.js";

describe("matrix device health", () => {
  it("detects Joopo-managed device names", () => {
    expect(isJoopoManagedMatrixDevice("Joopo Gateway")).toBe(true);
    expect(isJoopoManagedMatrixDevice("Joopo Debug")).toBe(true);
    expect(isJoopoManagedMatrixDevice("Element iPhone")).toBe(false);
    expect(isJoopoManagedMatrixDevice(null)).toBe(false);
  });

  it("summarizes stale Joopo-managed devices separately from the current device", () => {
    const summary = summarizeMatrixDeviceHealth([
      {
        deviceId: "du314Zpw3A",
        displayName: "Joopo Gateway",
        current: true,
      },
      {
        deviceId: "BritdXC6iL",
        displayName: "Joopo Gateway",
        current: false,
      },
      {
        deviceId: "G6NJU9cTgs",
        displayName: "Joopo Debug",
        current: false,
      },
      {
        deviceId: "phone123",
        displayName: "Element iPhone",
        current: false,
      },
    ]);

    expect(summary.currentDeviceId).toBe("du314Zpw3A");
    expect(summary.currentJoopoDevices).toEqual([
      expect.objectContaining({ deviceId: "du314Zpw3A" }),
    ]);
    expect(summary.staleJoopoDevices).toEqual([
      expect.objectContaining({ deviceId: "BritdXC6iL" }),
      expect.objectContaining({ deviceId: "G6NJU9cTgs" }),
    ]);
  });
});
