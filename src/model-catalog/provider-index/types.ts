import type { ModelCatalogProvider } from "../types.js";

export type JoopoProviderIndexPluginInstall = {
  clawhubSpec?: string;
  npmSpec?: string;
  defaultChoice?: "clawhub" | "npm";
  minHostVersion?: string;
  expectedIntegrity?: string;
};

export type JoopoProviderIndexPlugin = {
  id: string;
  package?: string;
  source?: string;
  install?: JoopoProviderIndexPluginInstall;
};

export type JoopoProviderIndexProviderAuthChoice = {
  method: string;
  choiceId: string;
  choiceLabel: string;
  choiceHint?: string;
  assistantPriority?: number;
  assistantVisibility?: "visible" | "manual-only";
  groupId?: string;
  groupLabel?: string;
  groupHint?: string;
  optionKey?: string;
  cliFlag?: string;
  cliOption?: string;
  cliDescription?: string;
  onboardingScopes?: readonly ("text-inference" | "image-generation")[];
};

export type JoopoProviderIndexProvider = {
  id: string;
  name: string;
  plugin: JoopoProviderIndexPlugin;
  docs?: string;
  categories?: readonly string[];
  authChoices?: readonly JoopoProviderIndexProviderAuthChoice[];
  previewCatalog?: ModelCatalogProvider;
};

export type JoopoProviderIndex = {
  version: number;
  providers: Readonly<Record<string, JoopoProviderIndexProvider>>;
};
