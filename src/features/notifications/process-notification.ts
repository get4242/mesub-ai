import type { EmailDriver } from "./driver";

export type NotificationRepository = {
  claim(notificationId: string): Promise<{ notificationId: string; attempt: number } | null>;
  complete(notificationId: string, provider: string, receiptId: string): Promise<void>;
  fail(notificationId: string, errorCode: string): Promise<void>;
};

export async function processNotification(notificationId: string, repository: NotificationRepository, driver: EmailDriver) {
  const claim = await repository.claim(notificationId);
  if (!claim) return { status: "already_processed" as const };
  try {
    const receipt = await driver.deliver({ notificationId: claim.notificationId });
    await repository.complete(claim.notificationId, receipt.provider, receipt.receiptId);
    return { status: "delivered" as const };
  } catch {
    await repository.fail(claim.notificationId, "DELIVERY_FAILED");
    return { status: "retry_scheduled" as const };
  }
}
