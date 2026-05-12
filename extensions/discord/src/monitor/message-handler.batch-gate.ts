import type { ReplyToMode } from "joopo/plugin-sdk/config-types";
import type { ReplyThreadingPolicy } from "joopo/plugin-sdk/reply-reference";
import { resolveBatchedReplyThreadingPolicy } from "joopo/plugin-sdk/reply-reference";

type ReplyThreadingContext = {
  ReplyThreading?: ReplyThreadingPolicy;
};

export function applyImplicitReplyBatchGate(
  ctx: object,
  replyToMode: ReplyToMode,
  isBatched: boolean,
) {
  const replyThreading = resolveBatchedReplyThreadingPolicy(replyToMode, isBatched);
  if (!replyThreading) {
    return;
  }
  (ctx as ReplyThreadingContext).ReplyThreading = replyThreading;
}
