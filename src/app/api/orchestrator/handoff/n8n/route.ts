import { NextResponse } from "next/server";

import { sanitizeN8nHandoffPayload } from "@/lib/inputSanitizers";
import { createQueueJob } from "@/lib/orchestratorQueue";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const payload = sanitizeN8nHandoffPayload(body);

  if (!payload.webhookUrl) {
    return NextResponse.json({ error: "webhookUrl es obligatorio para el handoff a n8n." }, { status: 400 });
  }

  const job = await createQueueJob({
    kind: "n8n-handoff",
    payload,
    maxAttempts: 3,
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
