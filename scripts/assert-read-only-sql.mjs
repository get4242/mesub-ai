const sql = process.env.AUDIT_SQL ?? "";
const normalized = sql
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .trim();
const withoutTrailingSemicolon = normalized.replace(/;\s*$/, "");
const startsReadOnly = /^(select|with)\b/i.test(withoutTrailingSemicolon);
const hasMultipleStatements = withoutTrailingSemicolon.includes(";");
const hasMutation = /\b(insert|update|delete|merge|truncate|alter|drop|create|grant|revoke|call|copy|vacuum|analyze|refresh|reindex|cluster|comment|security\s+label|lock)\b/i.test(
  withoutTrailingSemicolon,
);
const hasLockingRead = /\bfor\s+(update|no\s+key\s+update|share|key\s+share)\b/i.test(
  withoutTrailingSemicolon,
);

if (
  !withoutTrailingSemicolon ||
  !startsReadOnly ||
  hasMultipleStatements ||
  hasMutation ||
  hasLockingRead
) {
  console.error("AUDIT_SQL_NOT_READ_ONLY");
  process.exit(1);
}

console.log("READ_ONLY_SQL_VERIFIED");
