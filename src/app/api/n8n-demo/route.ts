import { NextResponse } from "next/server";

import { DEFAULT_N8N_TIMEOUT_MS, sanitizeJsonValue, sanitizeTextInput, sanitizeWebhookUrl } from "@/lib/inputSanitizers";

export const runtime = "nodejs";

const DEFAULT_WEBHOOK_URL = "http://127.0.0.1:5678/webhook/office-ai/intake";
const DEFAULT_TIMEOUT_MS = DEFAULT_N8N_TIMEOUT_MS;

type DemoPayload = {
  requestId: string;
  companyName: string;
  website: string;
  painPoint: string;
  goal: string;
  channel: string;
  requestedDeliverable: string;
  prompt: string;
};

function getDefaultPayload(): DemoPayload {
  return {
    requestId: "alpha-demo-estudio-delta",
    companyName: "Estudio Delta",
    website: "https://estudiodelta.example",
    painPoint: "responden leads a mano y pierden seguimiento durante la primera hora",
    goal: "salir con un primer mensaje comercial y un piloto alpha apoyado en n8n",
    channel: "linkedin",
    requestedDeliverable: "first-message",
    prompt:
      "Entro un lead de Estudio Delta. Investiga el contexto, defini la oportunidad y deja listo un primer mensaje comercial junto con el siguiente paso del piloto.",
  };
}

function getWebhookUrl() {
  return sanitizeWebhookUrl(process.env.N8N_OFFICE_WEBHOOK_URL) || DEFAULT_WEBHOOK_URL;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No pude conectar con n8n";
}

function buildSuccessSummary(result: unknown) {
  if (typeof result !== "object" || result === null) {
    return "n8n respondio, pero no devolvio un objeto resumible.";
  }

  const payload = result as {
    ariaSummary?: unknown;
    clientReadyOutput?: {
      accountName?: unknown;
      channel?: unknown;
      deliverable?: unknown;
      firstAction?: unknown;
    };
    suggestedPilot?: unknown;
  };

  const lines: string[] = [];

  if (typeof payload.ariaSummary === "string" && payload.ariaSummary.trim()) {
    lines.push(sanitizeTextInput(payload.ariaSummary, { maxLength: 800, preserveNewlines: true }));
  }

  const clientReady = payload.clientReadyOutput;
  if (clientReady) {
    const deliverable =
      typeof clientReady.deliverable === "string" ? sanitizeTextInput(clientReady.deliverable, { maxLength: 120 }) : "salida";
    const channel = typeof clientReady.channel === "string" ? sanitizeTextInput(clientReady.channel, { maxLength: 120 }) : "canal";
    const firstAction =
      typeof clientReady.firstAction === "string"
        ? sanitizeTextInput(clientReady.firstAction, { maxLength: 200 })
        : "validar siguiente paso";
    lines.push(`Entregable: ${deliverable} via ${channel}.`);
    lines.push(`Primer paso: ${firstAction}.`);
  }

  if (typeof payload.suggestedPilot === "string" && payload.suggestedPilot.trim()) {
    lines.push(sanitizeTextInput(payload.suggestedPilot, { maxLength: 300, preserveNewlines: true }));
  }

  return lines.length > 0 ? lines.join("\n") : "n8n respondio correctamente.";
}

export async function POST() {
  const webhookUrl = getWebhookUrl();
  const payload = getDefaultPayload();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
          error: `n8n devolvio ${response.status}. Revisá que el workflow office-ai/intake esté activo en ${webhookUrl}.`,
          webhookUrl,
          payload,
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

    return NextResponse.json({
      ok: true,
      webhookUrl,
      payload,
      result: sanitizeJsonValue(result, {
        maxDepth: 6,
        maxArrayLength: 24,
        maxObjectEntries: 32,
        maxStringLength: 4000,
      }),
      summary: buildSuccessSummary(result),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `No pude ejecutar la demo de n8n. ${getErrorMessage(error)}. Levantá n8n con "npm run n8n" y verificá el webhook ${webhookUrl}.`,
        webhookUrl,
        payload,
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
