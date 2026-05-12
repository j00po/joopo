import type { JoopoConfig } from "../config/types.joopo.js";

export function isGatewayModelPricingEnabled(config: JoopoConfig): boolean {
  return config.models?.pricing?.enabled !== false;
}
