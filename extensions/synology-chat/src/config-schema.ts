import { buildChannelConfigSchema } from "joopo/plugin-sdk/channel-config-schema";
import { z } from "joopo/plugin-sdk/zod";

export const SynologyChatChannelConfigSchema = buildChannelConfigSchema(
  z
    .object({
      dangerouslyAllowNameMatching: z.boolean().optional(),
      dangerouslyAllowInheritedWebhookPath: z.boolean().optional(),
    })
    .passthrough(),
);
