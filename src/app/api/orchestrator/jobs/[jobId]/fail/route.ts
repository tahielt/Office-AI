import { NextResponse } from "next/server";

import { sanitizeErrorMessage, sanitizeQueueJobId, sanitizeTimeoutMs } from "@/lib/inputSanitizers";
import { failQueueJob } from "@/lib/orchestratorQueue";

export const runtime = "nodejs";

function isWorkerAuthorized(req: Request) {
  const expected = process.env.OFFICE_AI_WORKER_TOKEN?.trim();
  if (!expected) return true;
  return req.headers.get("x-office-ai-worker-token") === expected;
}

export async function POST(req: Request, context: { params: Promise<{ jobId: string }> }) {
  if (!isWorkerAuthorized(req)) {
    return NextResponse.json({ error: "Worker no autorizado." }, { status: 401 });
  }

  const { jobId } = await context.params;
  const safeJobId = sanitizeQueueJobId(jobId);
  if (!safeJobId) {
    return NextResponse.json({ error: "jobId inválido." }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    error?: unknown;
    retryable?: unknown;
    retryDelayMs?: unknown;
  } | null;
  const errorMessage = sanitizeErrorMessage(body?.error, "El worker devolvió una falla sin detalle.");
  const retryable = typeof body?.retryable === "boolean" ? body.retryable : false;
  const retryDelayMs = body?.retryDelayMs === undefined ? undefined : sanitizeTimeoutMs(body.retryDelayMs, 2500);

  try {
    const job = await failQueueJob(safeJobId, { error: errorMessage, retryable, retryDelayMs });
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pude marcar el job como fallido.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
