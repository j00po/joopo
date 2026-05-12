import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultRegistry } from "../src/commands/registry.js";

test("joopobot.invoke remains available as an alias", async () => {
  const registry = createDefaultRegistry();
  const a = registry.get("joopo.invoke");
  const b = registry.get("joopobot.invoke");
  assert.ok(a, "expected joopo.invoke to exist");
  assert.ok(b, "expected joopobot.invoke to exist");
  assert.equal(typeof a.run, "function");
  assert.equal(typeof b.run, "function");
});
