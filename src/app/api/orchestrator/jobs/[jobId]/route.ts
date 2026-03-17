import { NextResponse } from "next/server";

import { sanitizeQueueJobId } from "@/lib/inputSanitizers";
import { getQueueJob } from "@/lib/orchestratorQueue";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const safeJobId = sanitizeQueueJobId(jobId);
  if (!safeJobId) {
    return NextResponse.json({ error: "jobId inválido." }, { status: 400 });
  }

  const job = await getQueueJob(safeJobId);

  if (!job) {
    return NextResponse.json({ error: `No encontré el job ${safeJobId}.` }, { status: 404 });
  }

  return NextResponse.json({ job });
}
