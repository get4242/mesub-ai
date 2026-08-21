import { log } from "@/lib/observability/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    log("info", "application.started", {
      environment: process.env.APP_ENV ?? "unknown",
      region: process.env.VERCEL_REGION ?? process.env.APP_REGION ?? "unknown"
    });
  }
}
