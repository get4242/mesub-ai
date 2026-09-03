import "server-only";
import type { EmailDriver } from "../notifications/driver";
import { FakeDevelopmentEmailDriver } from "../notifications/driver";
import {
  createFakeLineNotificationDriver,
  createLineMessagingDriver,
  type LineNotificationDriver,
} from "../line/notification";
import type { LineEnvironment } from "../../config/runtime-environment";

export function createLineDriver(
  input: { environment: LineEnvironment; accessToken: string; useFake?: boolean },
  dependencies: { request?: typeof fetch } = {},
): LineNotificationDriver {
  if (input.environment === "production" && input.useFake) {
    throw new Error("PRODUCTION_FAKE_DRIVER_FORBIDDEN");
  }
  if (input.useFake) return createFakeLineNotificationDriver();
  return createLineMessagingDriver(input.accessToken, dependencies.request);
}

class DisabledEmailDriver implements EmailDriver {
  async deliver(): Promise<never> {
    throw new Error("EMAIL_DELIVERY_DISABLED");
  }
}

export function createEmailDriver(environment: LineEnvironment): EmailDriver {
  return environment === "production" ? new DisabledEmailDriver() : new FakeDevelopmentEmailDriver();
}
