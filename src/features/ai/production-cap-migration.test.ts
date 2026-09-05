import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20260905090000_ai_tenant_operational_caps.sql", import.meta.url), "utf8");

describe("AI tenant operational cap migration", () => {
  it("serializes admission per tenant and enforces both approved caps before insert", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("max_concurrent_runs_per_tenant");
    expect(migration).toContain("max_runs_per_tenant_per_day");
    expect(migration).toContain("state in ('queued','running')");
    expect(migration).toContain("date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'");
    expect(migration).toContain("perform private.enqueue_ai_run");
    expect(migration.indexOf("idempotency_key = target_idempotency_key")).toBeLessThan(migration.indexOf("state in ('queued','running')"));
    expect(migration.indexOf("state in ('queued','running')")).toBeLessThan(migration.indexOf("insert into public.ai_runs"));
  });

  it("binds the requested user and property to the canonical tenant before locking", () => {
    expect(migration).toContain("public.tenant_memberships");
    expect(migration).toContain("membership.role = 'owner'");
    expect(migration).toContain("property.tenant_id = target_tenant_id");
  });

  it("keeps the RPC service-role only", () => {
    expect(migration).toContain("auth.jwt()->>'role','') <> 'service_role'");
    expect(migration).toContain("revoke all on function public.admit_ai_run_server");
    expect(migration).toContain("grant execute on function public.admit_ai_run_server");
  });
});
