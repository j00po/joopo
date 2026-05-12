import { describe, expect, it } from "vitest";
import { normalizeLegacyTalkConfig } from "../commands/doctor/shared/legacy-talk-config-normalizer.js";
import type { JoopoConfig } from "./types.js";
import { JoopoSchema } from "./zod-schema.js";

describe("legacy provider-shaped config snapshots", () => {
  it("accepts a string map of voice aliases while still flagging legacy talk config", () => {
    const raw = {
      talk: {
        voiceAliases: {
          Joopo: "VoiceAlias1234567890",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
      },
    };
    const changes: string[] = [];
    const migrated = normalizeLegacyTalkConfig(raw as unknown as JoopoConfig, changes);

    expect(changes).toContain(
      "Normalized talk.provider/providers shape (trimmed provider ids and merged missing compatibility fields).",
    );
    const next = migrated as {
      talk?: {
        providers?: {
          elevenlabs?: {
            voiceAliases?: Record<string, string>;
          };
        };
      };
    };
    expect(next?.talk?.providers?.elevenlabs?.voiceAliases).toEqual({
      Joopo: "VoiceAlias1234567890",
      Roger: "CwhRBWXzGAHq8TQ4Fs17",
    });
  });

  it("rejects non-string voice alias values", () => {
    const res = JoopoSchema.safeParse({
      talk: {
        voiceAliases: {
          Joopo: 123,
        },
      },
    });
    expect(res.success).toBe(false);
  });
});
