import { describe, expect, it } from "vitest";
import { formatDiscordStartupStatusMessage } from "./startup-status.js";

describe("formatDiscordStartupStatusMessage", () => {
  it("reports logged-in status only after the gateway is ready", () => {
    expect(
      formatDiscordStartupStatusMessage({
        gatewayReady: true,
        botIdentity: "bot-1 (Babuli)",
      }),
    ).toBe("logged in to discord as bot-1 (Babuli)");
  });

  it("reports client initialization while gateway readiness is still pending", () => {
    expect(
      formatDiscordStartupStatusMessage({
        gatewayReady: false,
        botIdentity: "bot-1 (Babuli)",
      }),
    ).toBe("discord client initialized as bot-1 (Babuli); awaiting gateway readiness");
  });

  it("handles missing identity without awkward punctuation", () => {
    expect(
      formatDiscordStartupStatusMessage({
        gatewayReady: false,
      }),
    ).toBe("discord client initialized; awaiting gateway readiness");
  });
});
