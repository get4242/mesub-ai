import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20260903090000_production_readiness.sql", import.meta.url), "utf8");

describe("Production Readiness migration 27", () => {
  it("adds Production without weakening service-role boundaries", () => {
    expect(migration).toMatch(/development.+review.+production/);
    expect(migration.match(/service_role/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
    expect(migration).toContain("revoke all on function public.create_line_link_server");
    expect(migration).toContain("revoke all on function public.accept_line_webhook_server");
  });

  it("provides bounded durable worker bridges", () => {
    for (const name of ["claim_ai_run_server", "complete_ai_run_server", "fail_ai_run_server", "claim_line_webhook_server", "complete_line_webhook_server", "fail_line_webhook_server", "claim_line_delivery_server", "complete_line_delivery_server", "fail_line_delivery_server", "claim_platform_intake_server"]) {
      expect(migration).toContain(`function public.${name}`);
    }
    expect(migration).toContain("greatest(1,least(batch_size,10))");
  });
});
