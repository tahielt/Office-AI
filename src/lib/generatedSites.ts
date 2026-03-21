import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { sanitizeJsonValue, sanitizeTextInput } from "@/lib/inputSanitizers";

const GENERATED_SITES_DIR = path.join(process.cwd(), ".office-ai", "generated-sites");
const SITE_ID_PATTERN = /^site-[a-z0-9]+-[a-f0-9]{8}$/i;

export interface GeneratedSiteRecord {
  id: string;
  createdAt: string;
  companyName: string;
  website: string;
  requestedDeliverable: string;
  prompt: string;
  summary: string;
  result: unknown;
  heroTitle: string;
  heroSubtitle: string;
  highlights: string[];
  ctaLabel: string;
}

interface CreateGeneratedSiteInput {
  companyName: string;
  website: string;
  requestedDeliverable: string;
  prompt: string;
  summary: string;
  result: unknown;
}

function createSiteId() {
  return `site-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function sanitizeSiteId(value: string) {
  return SITE_ID_PATTERN.test(value) ? value : "";
}

function buildHighlights(summary: string, result: unknown) {
  const fromSummary = summary
    .split("\n")
    .map((line) => sanitizeTextInput(line, { maxLength: 180, preserveNewlines: false }))
    .filter(Boolean)
    .slice(0, 4);

  if (fromSummary.length >= 3) {
    return fromSummary;
  }

  if (typeof result === "object" && result !== null && "nextSteps" in result && Array.isArray((result as { nextSteps?: unknown[] }).nextSteps)) {
    const fromResult = ((result as { nextSteps?: unknown[] }).nextSteps ?? [])
      .map((entry) => sanitizeTextInput(entry, { maxLength: 180, preserveNewlines: false }))
      .filter(Boolean)
      .slice(0, 4);

    if (fromResult.length > 0) {
      return fromResult;
    }
  }

  return [
    "Propuesta generada desde el agente.",
    "Copy y direccion web listos para iterar.",
    "Salida lista para bajar a la siguiente capa.",
  ];
}

function buildHeroTitle(companyName: string, requestedDeliverable: string) {
  const cleanCompany = sanitizeTextInput(companyName, { maxLength: 80 }) || "Tu proyecto";
  const deliverable = sanitizeTextInput(requestedDeliverable, { maxLength: 80 }) || "web";

  if (/portal|cockpit|panel/i.test(deliverable)) {
    return `${cleanCompany}: portal operativo generado`;
  }

  return `${cleanCompany}: web generada por ARIA + n8n`;
}

function buildHeroSubtitle(summary: string) {
  return sanitizeTextInput(summary, { maxLength: 240, preserveNewlines: false }) || "Salida generada desde el flujo real del agente.";
}

async function ensureGeneratedSitesDir() {
  await fs.mkdir(GENERATED_SITES_DIR, { recursive: true });
}

function getSitePath(siteId: string) {
  const safeSiteId = sanitizeSiteId(siteId);
  if (!safeSiteId) {
    throw new Error("siteId invalido");
  }

  return path.join(GENERATED_SITES_DIR, `${safeSiteId}.json`);
}

export async function createGeneratedSite(input: CreateGeneratedSiteInput) {
  const createdAt = new Date().toISOString();
  const record: GeneratedSiteRecord = {
    id: createSiteId(),
    createdAt,
    companyName: sanitizeTextInput(input.companyName, { maxLength: 120 }) || "Proyecto web",
    website: sanitizeTextInput(input.website, { maxLength: 240 }),
    requestedDeliverable: sanitizeTextInput(input.requestedDeliverable, { maxLength: 120 }) || "web-deliverable",
    prompt: sanitizeTextInput(input.prompt, { maxLength: 2400, preserveNewlines: true }),
    summary: sanitizeTextInput(input.summary, { maxLength: 2000, preserveNewlines: true }),
    result: sanitizeJsonValue(input.result, {
      maxDepth: 8,
      maxArrayLength: 48,
      maxObjectEntries: 64,
      maxStringLength: 8000,
    }),
    heroTitle: buildHeroTitle(input.companyName, input.requestedDeliverable),
    heroSubtitle: buildHeroSubtitle(input.summary),
    highlights: buildHighlights(input.summary, input.result),
    ctaLabel: /portal|cockpit|panel/i.test(input.requestedDeliverable) ? "Abrir siguiente iteracion" : "Continuar con esta web",
  };

  await ensureGeneratedSitesDir();
  await fs.writeFile(getSitePath(record.id), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

export async function getGeneratedSite(siteId: string) {
  const safeSiteId = sanitizeSiteId(siteId);
  if (!safeSiteId) return null;

  try {
    const raw = await fs.readFile(getSitePath(safeSiteId), "utf8");
    return JSON.parse(raw) as GeneratedSiteRecord;
  } catch {
    return null;
  }
}
