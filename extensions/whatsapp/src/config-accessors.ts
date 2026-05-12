import type { JoopoConfig } from "joopo/plugin-sdk/config-types";
import { resolveWhatsAppAccount } from "./accounts.js";
import { normalizeWhatsAppAllowFromEntries } from "./normalize-target.js";

export function resolveWhatsAppConfigAllowFrom(params: {
  cfg: JoopoConfig;
  accountId?: string | null;
}): string[] {
  return [...(resolveWhatsAppAccount(params).allowFrom ?? [])];
}

export function formatWhatsAppConfigAllowFromEntries(allowFrom: Array<string | number>): string[] {
  return normalizeWhatsAppAllowFromEntries(allowFrom);
}

export function resolveWhatsAppConfigDefaultTo(params: {
  cfg: JoopoConfig;
  accountId?: string | null;
}): string | undefined {
  const defaultTo = resolveWhatsAppAccount(params).defaultTo?.trim();
  return defaultTo || undefined;
}
