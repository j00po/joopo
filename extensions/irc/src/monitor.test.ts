import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#joopo",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#joopo",
      rawTarget: "#joopo",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "joopo-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "joopo-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "joopo-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "joopo-bot",
      rawTarget: "joopo-bot",
    });
  });
});
