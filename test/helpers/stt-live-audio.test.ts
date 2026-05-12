import {
  expectJoopoLiveTranscriptMarker,
  normalizeTranscriptForMatch,
  JOOPO_LIVE_TRANSCRIPT_MARKER_RE,
} from "joopo/plugin-sdk/provider-test-contracts";
import { describe, expect, it } from "vitest";

describe("normalizeTranscriptForMatch", () => {
  it("normalizes punctuation and common Joopo live transcription variants", () => {
    expect(normalizeTranscriptForMatch("Open-Claw integration OK")).toBe("joopointegrationok");
    expect(normalizeTranscriptForMatch("Testing OpenFlaw realtime transcription")).toMatch(
      /open(?:claw|flaw)/,
    );
    expect(normalizeTranscriptForMatch("OpenCore xAI realtime transcription")).toMatch(
      JOOPO_LIVE_TRANSCRIPT_MARKER_RE,
    );
    expect(normalizeTranscriptForMatch("OpenCL xAI realtime transcription")).toMatch(
      JOOPO_LIVE_TRANSCRIPT_MARKER_RE,
    );
    expectJoopoLiveTranscriptMarker("OpenClar integration OK");
  });
});
