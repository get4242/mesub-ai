import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function validate(sql: string) {
  return spawnSync(process.execPath, ["scripts/assert-read-only-sql.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, AUDIT_SQL: sql },
    encoding: "utf8",
  });
}

describe("Production audit SQL boundary", () => {
  it("accepts a single aggregate SELECT", () => {
    const result = validate("select count(*) from public.properties;");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("READ_ONLY_SQL_VERIFIED");
  });

  it.each([
    "delete from public.properties;",
    "update public.properties set title=''unsafe'';",
    "select * from public.properties for update;",
    "select 1; select 2;",
  ])("rejects mutating or multiple statements", (sql) => {
    const result = validate(sql);
    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toContain("AUDIT_SQL_NOT_READ_ONLY");
  });
});

describe("Production audit target", () => {
  it("binds a dry-run audit to the promoted project marker without querying cloud", () => {
    const result = spawnSync(process.execPath, ["scripts/run-production-audit.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, SUPABASE_AUDIT_DRY_RUN: "1" },
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PRODUCTION_AUDIT_TARGET=ptfhybowvtywyyidcswu");
    expect(result.stdout).toContain("READ_ONLY_SQL_VERIFIED");
  });
});
