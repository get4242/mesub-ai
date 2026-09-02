import "server-only";
import type { LineNotificationDriver } from "./notification";

export interface LineNotificationRepository {
  claim(notificationId: string): Promise<{ notificationId: string; destination: string; message: string; attempt: number } | null>;
  complete(notificationId: string, provider: string, receiptId: string): Promise<void>;
  fail(notificationId: string, safeErrorCode: string): Promise<"queued" | "dead_letter" | "unchanged">;
}

export async function processLineNotification(notificationId: string, repository: LineNotificationRepository, driver: LineNotificationDriver) {
  const claim = await repository.claim(notificationId);
  if (!claim) return { status: "not_deliverable" as const };
  try {
    const receipt = await driver.deliver({ notificationId: claim.notificationId, destination: claim.destination, message: claim.message });
    await repository.complete(claim.notificationId, receipt.provider, receipt.receiptId);
    return { status: "delivered" as const };
  } catch {
    const status = await repository.fail(claim.notificationId, "LINE_DELIVERY_FAILED");
    return { status: status === "dead_letter" ? "dead_letter" as const : "retry_scheduled" as const };
  }
}
