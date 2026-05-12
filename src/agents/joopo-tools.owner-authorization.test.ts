import { describe, expect, it } from "vitest";
import {
  isJoopoOwnerOnlyCoreToolName,
  JOOPO_OWNER_ONLY_CORE_TOOL_NAMES,
} from "./tools/owner-only-tools.js";

describe("createJoopoTools owner authorization", () => {
  it("marks owner-only core tool names", () => {
    expect(JOOPO_OWNER_ONLY_CORE_TOOL_NAMES).toEqual(["cron", "gateway", "nodes"]);
    expect(isJoopoOwnerOnlyCoreToolName("cron")).toBe(true);
    expect(isJoopoOwnerOnlyCoreToolName("gateway")).toBe(true);
    expect(isJoopoOwnerOnlyCoreToolName("nodes")).toBe(true);
  });

  it("keeps canvas non-owner-only", () => {
    expect(isJoopoOwnerOnlyCoreToolName("canvas")).toBe(false);
  });
});
