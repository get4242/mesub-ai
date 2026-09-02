const allowed = [
  /^\/dashboard$/,
  /^\/dashboard\/properties$/,
  /^\/dashboard\/properties\/new$/,
  /^\/dashboard\/properties\/[0-9a-f-]+\/(ai|edit)$/,
  /^\/dashboard\/leads$/,
  /^\/dashboard\/profile$/,
  /^\/properties(?:\?.*)?$/,
  /^\/properties\/[a-zA-Z0-9-]+$/,
];

export function isAllowedLineReturnPath(path: string) {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    allowed.some((pattern) => pattern.test(path))
  );
}

export function buildLinePermanentLink(liffId: string, path: string) {
  if (!/^[A-Za-z0-9-]+$/.test(liffId) || !isAllowedLineReturnPath(path))
    throw new Error("INVALID_LINE_PATH");
  return `https://miniapp.line.me/${liffId}${path}`;
}
