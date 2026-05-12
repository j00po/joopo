export { MemoryIndexManager } from "./manager.js";
export type {
  MemoryEmbeddingProbeResult,
  MemorySearchManager,
  MemorySearchResult,
} from "joopo/plugin-sdk/memory-core-host-engine-storage";
export {
  closeAllMemorySearchManagers,
  getMemorySearchManager,
  type MemorySearchManagerPurpose,
  type MemorySearchManagerResult,
} from "./search-manager.js";
