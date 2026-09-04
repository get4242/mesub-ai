import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const projectRole = JSON.parse(
  readFileSync(new URL("../supabase/project-role.json", import.meta.url), "utf8"),
);
if (
  projectRole.role !== "promoted-production" ||
  !projectRole.projectRef
) {
  throw new Error("PRODUCTION_AUDIT_PROJECT_ROLE_INVALID");
}

const auditPath = resolve("supabase/audits/production-readiness.sql");
const sql = readFileSync(auditPath, "utf8");
const validator = spawnSync(
  process.execPath,
  [resolve("scripts/assert-read-only-sql.mjs")],
  {
    stdio: "inherit",
    env: { ...process.env, AUDIT_SQL: sql },
  },
);
if (validator.status !== 0) process.exit(validator.status ?? 1);

console.log(`PRODUCTION_AUDIT_TARGET=${projectRole.projectRef}`);
if (process.env.SUPABASE_AUDIT_DRY_RUN === "1") process.exit(0);

const cli = resolve("node_modules/supabase/dist/supabase.js");
for (const args of [
  ["migration", "list", "--linked", "--project-ref", projectRole.projectRef],
  ["db", "query", "--linked", "--project-ref", projectRole.projectRef, "--file", auditPath],
]) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
