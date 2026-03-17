import { NextResponse } from "next/server";

import { sanitizeN8nHandoffPayload, sanitizeOrchestratorPayload } from "@/lib/inputSanitizers";
import { createQueueJob, listRecentQueueJobs, QueueJobKind } from "@/lib/orchestratorQueue";

export const runtime = "nodejs";

function normalizeKind(value: unknown): QueueJobKind {
  return value === "n8n-handoff" ? "n8n-handoff" : "orchestrator";
}

function getPayload(body: Record<string, unknown>, kind: QueueJobKind) {
  if (body.payload && typeof body.payload === "object" && body.payload !== null) {
    return kind === "n8n-handoff" ? sanitizeN8nHandoffPayload(body.payload) : sanitizeOrchestratorPayload(body.payload);
  }

  if (kind === "orchestrator") {
    return sanitizeOrchestratorPayload(body);
  }

  return sanitizeN8nHandoffPayload(body);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "8", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 24) : 8;
  const jobs = await listRecentQueueJobs(limit);
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const kind = normalizeKind(body.kind);
  const payload = getPayload(body, kind);

  if (kind === "orchestrator") {
    const prompt = (payload as { prompt?: string }).prompt ?? "";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt inválido para el job del orquestador." }, { status: 400 });
    }
  }

  if (kind === "n8n-handoff") {
    const webhookUrl = (payload as { webhookUrl?: string }).webhookUrl ?? "";
    if (!webhookUrl) {
      return NextResponse.json({ error: "webhookUrl es obligatorio para el handoff a n8n." }, { status: 400 });
    }
  }

  const job = await createQueueJob({
    kind,
    payload,
    maxAttempts: kind === "n8n-handoff" ? 3 : 2,
  });

  return NextResponse.json({
    job: {
      id: job.id,
      kind: job.kind,
      status: job.status,
      createdAt: job.createdAt,
      visibleAt: job.visibleAt,
    },
  });
}
