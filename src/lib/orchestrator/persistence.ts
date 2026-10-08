import { promises as fs } from "node:fs";
import path from "node:path";

import { CONFIG } from "./config";
import {
  AgentStep,
  PersistedOrchestratorRunRecord,
  PersistedOrchestratorRunSummary,
  PersistedRunStatus,
  RouteTrace,
  RoutePlan,
  RunDecisionSource,
} from "./types";
import { cleanStructuredLine, clip } from "./text";

const ORCHESTRATOR_RUNS_DIR = path.join(process.cwd(), ".office-ai", "orchestrator-runs");

async function ensureRunsDir() {
  await fs.mkdir(ORCHESTRATOR_RUNS_DIR, { recursive: true });
}

async function trimStoredRuns() {
  const entries = await fs.readdir(ORCHESTRATOR_RUNS_DIR, { withFileTypes: true });
  const filesWithTime = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const filePath = path.join(ORCHESTRATOR_RUNS_DIR, entry.name);
        const stats = await fs.stat(filePath);
        return { filePath, modifiedAtMs: stats.mtimeMs };
      })
  );

  const staleFiles = filesWithTime
    .sort((left, right) => right.modifiedAtMs - left.modifiedAtMs)
    .slice(CONFIG.maxStoredRuns);

  await Promise.all(staleFiles.map((file) => fs.rm(file.filePath, { force: true })));
}

function buildRunSummary(record: PersistedOrchestratorRunRecord): PersistedOrchestratorRunSummary {
  const closingStep =
    [...record.steps].reverse().find((step) => step.agentId === "ARIA") ?? record.steps[record.steps.length - 1];
  const summary =
    closingStep?.output?.summary ??
    closingStep?.message
      .split(/\r?\n/)
      .map((line) => cleanStructuredLine(line))
      .find(Boolean) ??
    `Run ${record.runId} completado sin resumen visible.`;

  return {
    runId: record.runId,
    createdAt: record.createdAt,
    task: record.task,
    mode: record.mode,
    decisionSource: record.decisionSource,
    delegatedAgents: record.delegatedAgents,
    status: record.status,
    totalDurationMs: record.totalDurationMs,
    stepCount: record.steps.length,
    summary: clip(summary, 180),
  };
}

async function persistRun(record: PersistedOrchestratorRunRecord) {
  try {
    await ensureRunsDir();
    await fs.writeFile(path.join(ORCHESTRATOR_RUNS_DIR, `${record.runId}.json`), JSON.stringify(record, null, 2), "utf8");
    await trimStoredRuns();
  } catch (error) {
    console.error("No pude persistir la corrida del orquestador:", error);
  }
}

export async function listRecentRuns(limit: number) {
  try {
    await ensureRunsDir();
    const entries = await fs.readdir(ORCHESTRATOR_RUNS_DIR, { withFileTypes: true });
    const records = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const filePath = path.join(ORCHESTRATOR_RUNS_DIR, entry.name);
          try {
            const raw = await fs.readFile(filePath, "utf8");
            return JSON.parse(raw) as PersistedOrchestratorRunRecord;
          } catch {
            return null;
          }
        })
    );

    return records
      .filter((record): record is PersistedOrchestratorRunRecord => Boolean(record))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, limit)
      .map(buildRunSummary);
  } catch (error) {
    console.error("No pude listar corridas del orquestador:", error);
    return [];
  }
}

export async function persistObservedRun(params: {
  runId: string;
  sessionId: string;
  prompt: string;
  routePlan: RoutePlan;
  teamModeEnabled: boolean;
  decisionSource: RunDecisionSource;
  status: PersistedRunStatus;
  routeStartedAtMs: number;
  steps: AgentStep[];
  trace: RouteTrace;
  error?: string;
}) {
  const { runId, sessionId, prompt, routePlan, teamModeEnabled, decisionSource, status, routeStartedAtMs, steps, trace, error } =
    params;

  await persistRun({
    runId,
    sessionId,
    prompt,
    task: routePlan.task,
    entry: routePlan.entry,
    delegatedAgents: routePlan.delegatedAgents,
    teamModeEnabled,
    mode: trace.mode,
    decisionSource,
    status,
    createdAt: new Date(routeStartedAtMs).toISOString(),
    completedAt: trace.completedAt,
    totalDurationMs: trace.totalDurationMs,
    trace,
    steps,
    error,
  });
}
