import { NextResponse } from "next/server";

import { sanitizeWorkerId } from "@/lib/inputSanitizers";
import { claimNextQueueJob, QueueJobKind } from "@/lib/orchestratorQueue";

export const runtime = "nodejs";

function isWorkerAuthorized(req: Request) {
  const expected = process.env.OFFICE_AI_WORKER_TOKEN?.trim();
  if (!expected) return true;
  return req.headers.get("x-office-ai-worker-token") === expected;
}

function normalizeKinds(value: unknown): QueueJobKind[] {
  if (!Array.isArray(value)) return ["orchestrator", "n8n-handoff"];
  const kinds = value.filter((item): item is QueueJobKind => item === "orchestrator" || item === "n8n-handoff");
  return kinds.length > 0 ? kinds : ["orchestrator", "n8n-handoff"];
}

export async function POST(req: Request) {
  if (!isWorkerAuthorized(req)) {
    return NextResponse.json({ error: "Worker no autorizado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { workerId?: unknown; kinds?: unknown } | null;
  const workerId = sanitizeWorkerId(body?.workerId);
  const kinds = normalizeKinds(body?.kinds);
  const job = await claimNextQueueJob(workerId, kinds);
  return NextResponse.json({ job });
}
