import { resolveApprovalOverGateway } from "joopo/plugin-sdk/approval-gateway-runtime";
import type { ExecApprovalReplyDecision } from "joopo/plugin-sdk/approval-runtime";
import type { JoopoConfig } from "joopo/plugin-sdk/config-types";
import { isApprovalNotFoundError } from "joopo/plugin-sdk/error-runtime";

export { isApprovalNotFoundError };

export async function resolveMatrixApproval(params: {
  cfg: JoopoConfig;
  approvalId: string;
  decision: ExecApprovalReplyDecision;
  senderId?: string | null;
  gatewayUrl?: string;
}): Promise<void> {
  await resolveApprovalOverGateway({
    cfg: params.cfg,
    approvalId: params.approvalId,
    decision: params.decision,
    senderId: params.senderId,
    gatewayUrl: params.gatewayUrl,
    clientDisplayName: `Matrix approval (${params.senderId?.trim() || "unknown"})`,
  });
}
