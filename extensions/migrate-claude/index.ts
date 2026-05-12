import { definePluginEntry } from "joopo/plugin-sdk/plugin-entry";
import { buildClaudeMigrationProvider } from "./provider.js";

export default definePluginEntry({
  id: "migrate-claude",
  name: "Claude Migration",
  description: "Imports Claude state into Joopo.",
  register(api) {
    api.registerMigrationProvider(buildClaudeMigrationProvider({ runtime: api.runtime }));
  },
});
