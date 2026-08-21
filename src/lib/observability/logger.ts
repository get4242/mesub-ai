export type LogLevel = "debug" | "info" | "warn" | "error";

const sensitiveKeys = new Set([
  "accesstoken",
  "apikey",
  "authorization",
  "email",
  "linechannelaccesstoken",
  "linechannelsecret",
  "openaiapikey",
  "password",
  "phone",
  "secret",
  "servicerolekey",
  "token"
]);

function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function redact(value: unknown, key?: string): unknown {
  if (key && sensitiveKeys.has(normalizeKey(key))) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([nestedKey, nestedValue]) => [nestedKey, redact(nestedValue, nestedKey)]));
  }

  return value;
}

export function createLogRecord(level: LogLevel, event: string, context: Record<string, unknown> = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    context: redact(context) as Record<string, unknown>
  };
}

export function log(level: LogLevel, event: string, context: Record<string, unknown> = {}): void {
  const record = createLogRecord(level, event, context);
  const output = JSON.stringify(record);

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
}
