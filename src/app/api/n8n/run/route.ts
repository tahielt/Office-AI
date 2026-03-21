import { NextResponse } from "next/server";

import { createGeneratedSite } from "@/lib/generatedSites";
import { DEFAULT_N8N_TIMEOUT_MS, sanitizeJsonValue, sanitizeTextInput } from "@/lib/inputSanitizers";
import { getOfficeWebhookUrl } from "@/lib/n8nStudio";

export const runtime = "nodejs";

type StudioPayload = {
  companyName: string;
  website: string;
  painPoint: string;
  goal: string;
  channel: string;
  requestedDeliverable: string;
  prompt: string;
};

type ResultObject = {
  ariaSummary?: unknown;
  summary?: unknown;
  clientReadyOutput?: {
    deliverable?: unknown;
    channel?: unknown;
    firstAction?: unknown;
  };
  suggestedPilot?: unknown;
  nextSteps?: unknown;
  output?: unknown;
  result?: unknown;
  message?: unknown;
};

type GeneratedSitePayload = {
  id: string;
  url: string;
  title: string;
};

function sanitizeStudioPayload(value: unknown): StudioPayload {
  const body = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  return {
    companyName: sanitizeTextInput(body.companyName, { maxLength: 120 }),
    website: sanitizeTextInput(body.website, { maxLength: 240 }),
    painPoint: sanitizeTextInput(body.painPoint, { maxLength: 300, preserveNewlines: true }),
    goal: sanitizeTextInput(body.goal, { maxLength: 300, preserveNewlines: true }),
    channel: sanitizeTextInput(body.channel, { maxLength: 40 }).toLowerCase() || "web",
    requestedDeliverable: sanitizeTextInput(body.requestedDeliverable, { maxLength: 120 }) || "deliverable",
    prompt: sanitizeTextInput(body.prompt, { maxLength: 2400, preserveNewlines: true }),
  };
}

function buildRequestId() {
  return `studio-${Date.now().toString(36)}`;
}

function getStringCandidate(value: unknown, maxLength: number) {
  return sanitizeTextInput(value, { maxLength, preserveNewlines: true });
}

function buildSummary(result: unknown) {
  if (typeof result === "string") {
    return getStringCandidate(result, 1400) || "n8n respondio correctamente.";
  }

  if (typeof result !== "object" || result === null) {
    return "n8n respondio, pero no devolvio un texto resumible.";
  }

  const payload = result as ResultObject;
  const lines: string[] = [];

  const highSignalFields = [
    getStringCandidate(payload.ariaSummary, 800),
    getStringCandidate(payload.summary, 800),
    getStringCandidate(payload.output, 800),
    getStringCandidate(payload.result, 800),
    getStringCandidate(payload.message, 800),
  ].filter(Boolean);

  lines.push(...highSignalFields);

  const clientReady = payload.clientReadyOutput;
  if (clientReady) {
    const deliverable = getStringCandidate(clientReady.deliverable, 120) || "salida";
    const channel = getStringCandidate(clientReady.channel, 80) || "canal";
    const firstAction = getStringCandidate(clientReady.firstAction, 220) || "validar siguiente paso";
    lines.push(`Entregable: ${deliverable} via ${channel}.`);
    lines.push(`Primer paso: ${firstAction}.`);
  }

  const suggestedPilot = getStringCandidate(payload.suggestedPilot, 300);
  if (suggestedPilot) {
    lines.push(suggestedPilot);
  }

  if (Array.isArray(payload.nextSteps)) {
    const nextSteps = payload.nextSteps
      .map((entry) => getStringCandidate(entry, 180))
      .filter(Boolean)
      .slice(0, 3);

    if (nextSteps.length > 0) {
      lines.push(`Proximos pasos: ${nextSteps.join(" | ")}`);
    }
  }

  return lines.join("\n").trim() || "n8n respondio correctamente.";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const payload = sanitizeStudioPayload(body);
  const origin = new URL(req.url).origin;

  if (!payload.prompt) {
    return NextResponse.json({ error: "Necesito un pedido concreto para ejecutar el flujo real." }, { status: 400 });
  }

  const webhookUrl = getOfficeWebhookUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_N8N_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: buildRequestId(),
        companyName: payload.companyName || "Proyecto sin nombre",
        website: payload.website,
        painPoint: payload.painPoint,
        goal: payload.goal,
        channel: payload.channel,
        requestedDeliverable: payload.requestedDeliverable,
        prompt: payload.prompt,
        source: "webhook",
        requestedBy: "office-ai-agent",
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const rawText = await response.text();
    let result: unknown = rawText;

    try {
      result = rawText ? JSON.parse(rawText) : null;
    } catch {
      result = rawText;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `n8n devolvio ${response.status}. Revisá que el workflow office-ai/intake este activo en ${webhookUrl}.`,
          webhookUrl,
          request: payload,
          result: sanitizeJsonValue(result, {
            maxDepth: 6,
            maxArrayLength: 24,
            maxObjectEntries: 32,
            maxStringLength: 4000,
          }),
        },
        { status: 502 }
      );
    }

    const summary = buildSummary(result);
    const generatedSite = await createGeneratedSite({
      companyName: payload.companyName || "Proyecto sin nombre",
      website: payload.website,
      requestedDeliverable: payload.requestedDeliverable,
      prompt: payload.prompt,
      summary,
      result,
    });

    const site: GeneratedSitePayload = {
      id: generatedSite.id,
      url: `${origin}/sites/${generatedSite.id}`,
      title: generatedSite.heroTitle,
    };

    return NextResponse.json({
      ok: true,
      webhookUrl,
      request: payload,
      result: sanitizeJsonValue(result, {
        maxDepth: 6,
        maxArrayLength: 24,
        maxObjectEntries: 32,
        maxStringLength: 4000,
      }),
      summary,
      site,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pude conectar con n8n";

    return NextResponse.json(
      {
        error: `No pude ejecutar el flujo real en n8n. ${message}. Levantá n8n con "npm run n8n" y verificá el webhook ${webhookUrl}.`,
        webhookUrl,
        request: payload,
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
