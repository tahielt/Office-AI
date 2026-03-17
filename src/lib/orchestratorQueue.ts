import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { sanitizeErrorMessage, sanitizeJsonValue, sanitizeQueueJobId, sanitizeWorkerId } from "@/lib/inputSanitizers";

export type QueueJobKind = "orchestrator" | "n8n-handoff";
export type QueueJobStatus = "queued" | "running" | "completed" | "failed";

export interface QueueJob<TPayload = unknown, TResult = unknown> {
  id: string;
  kind: QueueJobKind;
  status: QueueJobStatus;
  payload: TPayload;
  result?: TResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
  visibleAt: string;
  startedAt?: string;
  completedAt?: string;
  attempts: number;
  maxAttempts: number;
  claimedBy?: string;
}

const QUEUE_ROOT_DIR = path.join(process.cwd(), ".office-ai", "queue");

const STATUS_DIRS: Record<QueueJobStatus, string> = {
  queued: path.join(QUEUE_ROOT_DIR, "queued"),
  running: path.join(QUEUE_ROOT_DIR, "running"),
  completed: path.join(QUEUE_ROOT_DIR, "completed"),
  failed: path.join(QUEUE_ROOT_DIR, "failed"),
};

function createQueueJobId() {
  return `job-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function assertSafeQueueJobId(jobId: string) {
  const safeJobId = sanitizeQueueJobId(jobId);
  if (!safeJobId) {
    throw new Error("jobId inválido.");
  }
  return safeJobId;
}

function getJobPath(status: QueueJobStatus, jobId: string) {
  return path.join(STATUS_DIRS[status], `${assertSafeQueueJobId(jobId)}.json`);
}

async function ensureQueueDirs() {
  await Promise.all(Object.values(STATUS_DIRS).map((dir) => fs.mkdir(dir, { recursive: true })));
}

async function writeJob(status: QueueJobStatus, job: QueueJob) {
  await ensureQueueDirs();
  await fs.writeFile(getJobPath(status, job.id), JSON.stringify(job, null, 2), "utf8");
}

async function readJobFile(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as QueueJob;
}

async function tryReadJob(status: QueueJobStatus, jobId: string) {
  try {
    const filePath = getJobPath(status, jobId);
    const job = await readJobFile(filePath);
    return { filePath, job };
  } catch {
    return null;
  }
}

async function locateJob(jobId: string) {
  for (const status of ["queued", "running", "completed", "failed"] as QueueJobStatus[]) {
    const located = await tryReadJob(status, jobId);
    if (located) {
      return { status, ...located };
    }
  }
  return null;
}

export async function createQueueJob<TPayload = unknown>(params: {
  kind: QueueJobKind;
  payload: TPayload;
  maxAttempts?: number;
  visibleAt?: string;
}) {
  const now = new Date().toISOString();
  const job: QueueJob<TPayload> = {
    id: createQueueJobId(),
    kind: params.kind,
    status: "queued",
    payload: sanitizeJsonValue(params.payload, {
      maxDepth: 6,
      maxArrayLength: 32,
      maxObjectEntries: 40,
      maxStringLength: 8000,
    }) as TPayload,
    createdAt: now,
    updatedAt: now,
    visibleAt: params.visibleAt ?? now,
    attempts: 0,
    maxAttempts: Math.max(1, params.maxAttempts ?? 2),
  };

  await writeJob("queued", job);
  return job;
}

export async function getQueueJob(jobId: string) {
  await ensureQueueDirs();
  const safeJobId = sanitizeQueueJobId(jobId);
  if (!safeJobId) return null;
  const located = await locateJob(safeJobId);
  return located?.job ?? null;
}

export async function listRecentQueueJobs(limit = 12) {
  await ensureQueueDirs();
  const jobGroups = await Promise.all(
    (["queued", "running", "completed", "failed"] as QueueJobStatus[]).map(async (status) => {
      const entries = await fs.readdir(STATUS_DIRS[status], { withFileTypes: true });
      const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
      return Promise.all(
        files.map(async (entry) => {
          try {
            return await readJobFile(path.join(STATUS_DIRS[status], entry.name));
          } catch {
            return null;
          }
        })
      );
    })
  );
  const jobs = jobGroups.flat();

  return jobs
    .filter((job): job is QueueJob => Boolean(job))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, limit);
}

export async function claimNextQueueJob(workerId: string, kinds: QueueJobKind[] = ["orchestrator", "n8n-handoff"]) {
  await ensureQueueDirs();
  const entries = await fs.readdir(STATUS_DIRS.queued, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));

  const claimedBy = sanitizeWorkerId(workerId);

  for (const entry of files) {
    const queuedPath = path.join(STATUS_DIRS.queued, entry.name);

    let job: QueueJob | null = null;
    try {
      job = await readJobFile(queuedPath);
    } catch {
      continue;
    }

    if (!kinds.includes(job.kind)) continue;
    if (new Date(job.visibleAt).getTime() > Date.now()) continue;

    const runningPath = getJobPath("running", job.id);

    try {
      await fs.rename(queuedPath, runningPath);
    } catch {
      continue;
    }

    const now = new Date().toISOString();
    const claimedJob: QueueJob = {
      ...job,
      status: "running",
      claimedBy,
      startedAt: job.startedAt ?? now,
      updatedAt: now,
      attempts: job.attempts + 1,
    };
    await fs.writeFile(runningPath, JSON.stringify(claimedJob, null, 2), "utf8");
    return claimedJob;
  }

  return null;
}

export async function completeQueueJob<TResult = unknown>(jobId: string, result: TResult) {
  await ensureQueueDirs();
  const safeJobId = assertSafeQueueJobId(jobId);
  const running = await tryReadJob("running", safeJobId);
  if (!running) {
    throw new Error(`No encontré el job ${safeJobId} en running.`);
  }

  const now = new Date().toISOString();
  const completedJob: QueueJob = {
    ...running.job,
    status: "completed",
    result: sanitizeJsonValue(result, {
      maxDepth: 8,
      maxArrayLength: 64,
      maxObjectEntries: 64,
      maxStringLength: 16000,
    }) as TResult,
    updatedAt: now,
    completedAt: now,
  };
  await fs.writeFile(running.filePath, JSON.stringify(completedJob, null, 2), "utf8");
  await fs.rename(running.filePath, getJobPath("completed", safeJobId));
  return completedJob;
}

export async function failQueueJob(jobId: string, params: { error: string; retryable?: boolean; retryDelayMs?: number }) {
  await ensureQueueDirs();
  const safeJobId = assertSafeQueueJobId(jobId);
  const running = await tryReadJob("running", safeJobId);
  if (!running) {
    throw new Error(`No encontré el job ${safeJobId} en running.`);
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const retryable = Boolean(params.retryable) && running.job.attempts < running.job.maxAttempts;
  const error = sanitizeErrorMessage(params.error, "El worker devolvió una falla sin detalle.");

  if (retryable) {
    const requeuedJob: QueueJob = {
      ...running.job,
      status: "queued",
      error,
      claimedBy: undefined,
      updatedAt: nowIso,
      visibleAt: new Date(now + Math.max(500, params.retryDelayMs ?? 2000)).toISOString(),
    };
    await fs.writeFile(running.filePath, JSON.stringify(requeuedJob, null, 2), "utf8");
    await fs.rename(running.filePath, getJobPath("queued", safeJobId));
    return requeuedJob;
  }

  const failedJob: QueueJob = {
    ...running.job,
    status: "failed",
    error,
    updatedAt: nowIso,
    completedAt: nowIso,
  };
  await fs.writeFile(running.filePath, JSON.stringify(failedJob, null, 2), "utf8");
  await fs.rename(running.filePath, getJobPath("failed", safeJobId));
  return failedJob;
}
