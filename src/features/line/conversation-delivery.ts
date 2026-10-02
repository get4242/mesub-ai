import "server-only";
import { createHash } from "node:crypto";
import { decryptLineDestination } from "./destination-crypto";
import type { ConversationEvent, LineRuntimeConfig } from "./conversation-contract";

export function lineReplyRetryKey(eventId: string, environment: string) {
  const hash = createHash("sha256").update(`mesub-line:${environment}:${eventId}`).digest("hex");
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

export async function deliverConversation(event: ConversationEvent, config: LineRuntimeConfig, messages: unknown[], request: typeof fetch = fetch) {
  if (!messages.length || messages.length>5) throw new Error("LINE_MESSAGE_COUNT_INVALID");
  const response = await request("https://api.line.me/v2/bot/message/push", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${config.line.messagingAccessToken}`,
      "Content-Type": "application/json",
      "X-Line-Retry-Key": lineReplyRetryKey(event.eventId,config.line.environment),
    },
    body: JSON.stringify({ to: decryptLineDestination(event.destination,config.line.encryptionKey),messages }),
  });
  if (!response.ok && !(response.status===409 && response.headers.has("x-line-accepted-request-id"))) {
    throw new Error("LINE_CONVERSATION_DELIVERY_FAILED");
  }
}
