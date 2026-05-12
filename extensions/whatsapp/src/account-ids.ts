import { createAccountListHelpers } from "joopo/plugin-sdk/account-core";

const {
  listConfiguredAccountIds,
  listAccountIds,
  resolveDefaultAccountId: resolveDefaultWhatsAppAccountId,
} = createAccountListHelpers("whatsapp");

export {
  listConfiguredAccountIds,
  listAccountIds as listWhatsAppAccountIds,
  resolveDefaultWhatsAppAccountId,
};
