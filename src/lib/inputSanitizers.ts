export const MAX_COMMAND_LENGTH = 4000;
export const MAX_AGENT_DESCRIPTOR_COUNT = 16;
export const DEFAULT_N8N_TIMEOUT_MS = 12000;

const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SAFE_JOB_ID_PATTERN = /^job-[a-z0-9]+-[a-f0-9]{8}$/i;
const SAFE_HEADER_NAME_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const BLOCKED_HEADER_NAMES = new Set([
  "connection",
  "content-length",
  "expect",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const ALLOWED_HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export interface SanitizedAgentDescriptor {
  id: string;
  name: string;
  role: string;
}

export interface SanitizedOrchestratorPayload {
  prompt: string;
  teamMode: boolean;
  currentAgents: SanitizedAgentDescriptor[];
}

export interface SanitizedN8nHandoffPayload {
  webhookUrl: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
}

interface SanitizeTextOptions {
  maxLength?: number;
  preserveNewlines?: boolean;
  trim?: boolean;
}

interface SanitizeJsonOptions {
  maxDepth?: number;
  maxArrayLength?: number;
  maxObjectEntries?: number;
  maxStringLength?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function sanitizeTextInput(value: unknown, options: SanitizeTextOptions = {}) {
  if (typeof value !== "string") return "";

  const { maxLength, preserveNewlines = false, trim = true } = options;

  let sanitized = value.normalize("NFKC").replace(CONTROL_CHAR_PATTERN, " ");

  if (preserveNewlines) {
    sanitized = sanitized
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[^\S\n]+/g, " ").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    sanitized = sanitized.replace(/\s+/g, " ");
  }

  if (trim) {
    sanitized = sanitized.trim();
  }

  if (typeof maxLength === "number" && maxLength > 0 && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength).trimEnd();
  }

  return sanitized;
}

export function sanitizeBooleanish(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = sanitizeTextInput(value, { maxLength: 16 }).toLowerCase();
    if (["1", "true", "on", "enable", "enabled", "yes", "si"].includes(normalized)) return true;
    if (["0", "false", "off", "disable", "disabled", "no"].includes(normalized)) return false;
  }
  return fallback;
}

export function sanitizeCommandInput(value: unknown) {
  return sanitizeTextInput(value, {
    maxLength: MAX_COMMAND_LENGTH,
    preserveNewlines: false,
  });
}

export function sanitizeAgentDescriptors(value: unknown) {
  if (!Array.isArray(value)) return [];

  const sanitized = value
    .slice(0, MAX_AGENT_DESCRIPTOR_COUNT)
    .map((entry) => {
      if (!isRecord(entry)) return null;

      const id = sanitizeTextInput(entry.id, { maxLength: 32 }).replace(/[^A-Za-z0-9_-]/g, "");
      const name = sanitizeTextInput(entry.name, { maxLength: 64 });
      const role = sanitizeTextInput(entry.role, { maxLength: 160 });

      if (!id || !name || !role) return null;
      return { id, name, role };
    })
    .filter((entry): entry is SanitizedAgentDescriptor => Boolean(entry));

  return sanitized;
}

export function sanitizeOrchestratorPayload(value: unknown): SanitizedOrchestratorPayload {
  const body = isRecord(value) ? value : {};
  return {
    prompt: sanitizeCommandInput(body.prompt),
    teamMode: sanitizeBooleanish(body.teamMode, true),
    currentAgents: sanitizeAgentDescriptors(body.currentAgents),
  };
}

export function sanitizeHttpMethod(value: unknown) {
  const method = sanitizeTextInput(value, { maxLength: 12 }).toUpperCase();
  return ALLOWED_HTTP_METHODS.has(method) ? method : "POST";
}

export function sanitizeHeaderMap(value: unknown) {
  if (!isRecord(value)) {
    return { "content-type": "application/json" };
  }

  const sanitizedEntries = Object.entries(value)
    .slice(0, 24)
    .map(([rawKey, rawValue]) => {
      const key = sanitizeTextInput(rawKey, { maxLength: 64, preserveNewlines: false })
        .toLowerCase()
        .replace(/\s+/g, "");
      if (!key || !SAFE_HEADER_NAME_PATTERN.test(key)) return null;
      if (BLOCKED_HEADER_NAMES.has(key) || key.startsWith("proxy-") || key.startsWith("sec-")) return null;

      const resolvedValue =
        typeof rawValue === "string"
          ? sanitizeTextInput(rawValue, { maxLength: 1024, preserveNewlines: false })
          : sanitizeTextInput(String(rawValue ?? ""), { maxLength: 1024, preserveNewlines: false });

      if (!resolvedValue) return null;
      return [key, resolvedValue] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  return sanitizedEntries.length > 0 ? Object.fromEntries(sanitizedEntries) : { "content-type": "application/json" };
}

export function sanitizeWebhookUrl(value: unknown) {
  const rawUrl = sanitizeTextInput(value, { maxLength: 2048 });
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function sanitizeTimeoutMs(value: unknown, fallback = DEFAULT_N8N_TIMEOUT_MS) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), 1000), 60000);
}

export function sanitizeQueueJobId(value: unknown) {
  const jobId = sanitizeTextInput(value, { maxLength: 64 });
  return SAFE_JOB_ID_PATTERN.test(jobId) ? jobId : "";
}

export function sanitizeWorkerId(value: unknown) {
  const workerId = sanitizeTextInput(value, { maxLength: 64 })
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return workerId || "worker-unknown";
}

export function sanitizeErrorMessage(value: unknown, fallback: string) {
  return sanitizeTextInput(value, { maxLength: 1000, preserveNewlines: true }) || fallback;
}

export function sanitizeJsonValue(value: unknown, options: SanitizeJsonOptions = {}): unknown {
  const {
    maxDepth = 6,
    maxArrayLength = 32,
    maxObjectEntries = 40,
    maxStringLength = MAX_COMMAND_LENGTH,
  } = options;
  const seen = new WeakSet<object>();

  const sanitizeNode = (node: unknown, depth: number): unknown => {
    if (node === null) return null;

    if (typeof node === "string") {
      return sanitizeTextInput(node, { maxLength: maxStringLength, preserveNewlines: true });
    }

    if (typeof node === "number") {
      return Number.isFinite(node) ? node : null;
    }

    if (typeof node === "boolean") {
      return node;
    }

    if (typeof node === "bigint") {
      return sanitizeTextInput(node.toString(), { maxLength: maxStringLength });
    }

    if (typeof node === "undefined" || typeof node === "function" || typeof node === "symbol") {
      return null;
    }

    if (depth >= maxDepth) {
      return null;
    }

    if (Array.isArray(node)) {
      return node.slice(0, maxArrayLength).map((entry) => sanitizeNode(entry, depth + 1));
    }

    if (typeof node === "object") {
      if (seen.has(node)) return "[Circular]";
      seen.add(node);

      const entries = Object.entries(node).slice(0, maxObjectEntries);
      const sanitizedEntries: Array<[string, unknown]> = [];

      for (const [rawKey, rawValue] of entries) {
        const key = sanitizeTextInput(rawKey, { maxLength: 80 });
        if (!key) continue;
        sanitizedEntries.push([key, sanitizeNode(rawValue, depth + 1)]);
      }

      return Object.fromEntries(sanitizedEntries);
    }

    return sanitizeTextInput(String(node), { maxLength: maxStringLength });
  };

  return sanitizeNode(value, 0);
}

export function sanitizeN8nHandoffPayload(value: unknown): SanitizedN8nHandoffPayload {
  const body = isRecord(value) ? value : {};

  return {
    webhookUrl: sanitizeWebhookUrl(body.webhookUrl),
    method: sanitizeHttpMethod(body.method),
    headers: sanitizeHeaderMap(body.headers),
    body: sanitizeJsonValue(body.body, {
      maxDepth: 6,
      maxArrayLength: 32,
      maxObjectEntries: 40,
      maxStringLength: 8000,
    }),
    timeoutMs: sanitizeTimeoutMs(body.timeoutMs),
  };
}
