import { NextResponse } from "next/server";

import { sanitizeJsonValue, sanitizeQueueJobId } from "@/lib/inputSanitizers";
import { completeQueueJob } from "@/lib/orchestratorQueue";

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

  const body = (await req.json().catch(() => null)) as { result?: unknown } | null;

  try {
    const job = await completeQueueJob(
      safeJobId,
      sanitizeJsonValue(body?.result, {
        maxDepth: 8,
        maxArrayLength: 64,
        maxObjectEntries: 64,
        maxStringLength: 16000,
      })
    );
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pude completar el job.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
