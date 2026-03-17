type QueueJobKind = "orchestrator" | "n8n-handoff";
type QueueJobStatus = "queued" | "running" | "completed" | "failed";

type QueueJob = {
  id: string;
  kind: QueueJobKind;
  status: QueueJobStatus;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
};

const APP_URL = (process.env.OFFICE_AI_APP_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const WORKER_ID = process.env.OFFICE_AI_WORKER_ID?.trim() || `worker-${process.pid}`;
const WORKER_TOKEN = process.env.OFFICE_AI_WORKER_TOKEN?.trim() || "";
const POLL_MS = Number.parseInt(process.env.OFFICE_AI_WORKER_POLL_MS || "1500", 10);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function workerHeaders() {
  return {
    "Content-Type": "application/json",
    ...(WORKER_TOKEN ? { "x-office-ai-worker-token": WORKER_TOKEN } : {}),
  };
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, init);
  const rawText = await response.text();

  try {
    return { response, payload: rawText ? JSON.parse(rawText) : null };
  } catch {
    return { response, payload: rawText };
  }
}

async function claimJob() {
  const { response, payload } = await fetchJson(`${APP_URL}/api/orchestrator/jobs/claim`, {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify({
      workerId: WORKER_ID,
      kinds: ["orchestrator", "n8n-handoff"],
    }),
  });

  if (!response.ok) {
    throw new Error(typeof payload === "object" && payload && "error" in payload ? String(payload.error) : `Claim devolvió ${response.status}`);
  }

  if (typeof payload !== "object" || payload === null || !("job" in payload)) {
    return null;
  }

  return (payload as { job?: QueueJob | null }).job ?? null;
}

async function completeJob(jobId: string, result: unknown) {
  const { response, payload } = await fetchJson(`${APP_URL}/api/orchestrator/jobs/${jobId}/complete`, {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify({ result }),
  });

  if (!response.ok) {
    throw new Error(typeof payload === "object" && payload && "error" in payload ? String(payload.error) : `Complete devolvió ${response.status}`);
  }
}

async function failJob(jobId: string, error: string, retryable: boolean, retryDelayMs = 2500) {
  const { response, payload } = await fetchJson(`${APP_URL}/api/orchestrator/jobs/${jobId}/fail`, {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify({
      error,
      retryable,
      retryDelayMs,
    }),
  });

  if (!response.ok) {
    throw new Error(typeof payload === "object" && payload && "error" in payload ? String(payload.error) : `Fail devolvió ${response.status}`);
  }
}

async function runOrchestratorJob(job: QueueJob) {
  const { response, payload } = await fetchJson(`${APP_URL}/api/orchestrator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job.payload),
  });

  if (!response.ok) {
    const error =
      typeof payload === "object" && payload && "error" in payload ? String(payload.error) : `Orchestrator devolvió ${response.status}`;
    throw new Error(error);
  }

  return payload;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function runN8nHandoffJob(job: QueueJob) {
  const webhookUrl = typeof job.payload.webhookUrl === "string" ? job.payload.webhookUrl : "";
  if (!webhookUrl) {
    throw new Error("El job n8n-handoff no tiene webhookUrl.");
  }

  const method = typeof job.payload.method === "string" ? job.payload.method : "POST";
  const timeoutMs = typeof job.payload.timeoutMs === "number" ? job.payload.timeoutMs : 12000;
  const rawHeaders =
    typeof job.payload.headers === "object" && job.payload.headers !== null
      ? (job.payload.headers as Record<string, string>)
      : { "Content-Type": "application/json" };
  const requestBody =
    typeof job.payload.body === "string"
      ? job.payload.body
      : JSON.stringify(job.payload.body ?? null);

  const response = await fetchWithTimeout(
    webhookUrl,
    {
      method,
      headers: rawHeaders,
      body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : requestBody,
    },
    timeoutMs
  );

  const rawText = await response.text();
  let result: unknown = rawText;
  try {
    result = rawText ? JSON.parse(rawText) : null;
  } catch {
    result = rawText;
  }

  if (!response.ok) {
    throw new Error(`n8n devolvió ${response.status}`);
  }

  return {
    ok: true,
    webhookUrl,
    status: response.status,
    result,
  };
}

async function processJob(job: QueueJob) {
  console.log(`[${WORKER_ID}] Processing ${job.id} (${job.kind}) attempt ${job.attempts + 1}/${job.maxAttempts}`);

  if (job.kind === "orchestrator") {
    return runOrchestratorJob(job);
  }

  return runN8nHandoffJob(job);
}

async function main() {
  console.log(`[${WORKER_ID}] Office AI worker online at ${APP_URL}`);

  while (true) {
    try {
      const job = await claimJob();
      if (!job) {
        await sleep(POLL_MS);
        continue;
      }

      try {
        const result = await processJob(job);
        await completeJob(job.id, result);
        console.log(`[${WORKER_ID}] Completed ${job.id}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falla desconocida del worker";
        const retryable = job.attempts + 1 < job.maxAttempts;
        await failJob(job.id, message, retryable, 2500);
        console.error(`[${WORKER_ID}] Failed ${job.id}: ${message}${retryable ? " (requeued)" : ""}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falla desconocida";
      console.error(`[${WORKER_ID}] Loop error: ${message}`);
      await sleep(POLL_MS);
    }
  }
}

void main();
