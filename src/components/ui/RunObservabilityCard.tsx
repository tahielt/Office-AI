"use client";

import { useEffect, useState } from "react";

type RunDecisionSource = "structured_shortcut" | "fast_path" | "planner" | "error";
type RunStatus = "completed" | "error";
type RunMode = "delegated" | "direct";

interface RunSummary {
  runId: string;
  createdAt: string;
  task: string;
  mode: RunMode;
  decisionSource: RunDecisionSource;
  delegatedAgents: string[];
  status: RunStatus;
  totalDurationMs: number;
  stepCount: number;
  summary: string;
}

interface RunObservabilityCardProps {
  refreshKey: number;
}

function formatClock(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 10000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${Math.round(durationMs / 1000)}s`;
}

function decisionLabel(decisionSource: RunDecisionSource) {
  if (decisionSource === "structured_shortcut") return "SHORTCUT";
  if (decisionSource === "fast_path") return "FAST";
  if (decisionSource === "error") return "ERROR";
  return "PLANNER";
}

export default function RunObservabilityCard({ refreshKey }: RunObservabilityCardProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let cancelled = false;

    const loadRuns = async () => {
      try {
        setStatus((current) => (current === "idle" ? "loading" : current));
        const res = await fetch("/api/orchestrator?limit=4", { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as { runs?: RunSummary[] } | null;

        if (!res.ok) {
          throw new Error("No pude leer las corridas recientes");
        }

        if (!cancelled) {
          setRuns(payload?.runs ?? []);
          setStatus("idle");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    };

    void loadRuns();
    const timer = window.setInterval(() => {
      void loadRuns();
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshKey]);

  return (
    <div
      className="relative overflow-hidden px-3 py-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,14,24,0.96) 0%, rgba(7,11,19,0.96) 58%, rgba(5,7,14,0.99) 100%)",
        border: "1px solid rgba(34,197,94,0.16)",
        borderRadius: "6px",
        boxShadow: "0 0 20px rgba(34,197,94,0.06)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(34,197,94,0.12), transparent 34%), radial-gradient(circle at bottom right, rgba(59,130,246,0.08), transparent 30%)",
        }}
      />

      <div className="relative z-10 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[9px] font-mono tracking-[0.24em] text-emerald-300/70 uppercase">Run Trace</div>
            <div className="mt-1 text-[13px] font-semibold text-white">Observabilidad local</div>
          </div>
          <span
            className="rounded-sm px-1.5 py-0.5 text-[8px] font-mono tracking-[0.2em]"
            style={{
              color: status === "error" ? "#fecaca" : "#dcfce7",
              background: status === "error" ? "rgba(248,113,113,0.12)" : "rgba(34,197,94,0.12)",
              border: `1px solid ${status === "error" ? "rgba(248,113,113,0.28)" : "rgba(34,197,94,0.24)"}`,
            }}
          >
            {status === "loading" ? "SYNC" : status === "error" ? "READ FAIL" : "LOCAL"}
          </span>
        </div>

        {runs.length === 0 ? (
          <div
            className="rounded-sm px-2 py-2 text-[10px] leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.58)",
            }}
          >
            Todavia no hay corridas persistidas. Ejecuta un prompt y este panel mostrara las ultimas trazas locales.
          </div>
        ) : (
          <div className="space-y-1.5">
            {runs.map((run) => (
              <div
                key={run.runId}
                className="rounded-sm px-2 py-2"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: run.status === "error" ? "#f87171" : "#4ade80" }}
                    />
                    <span className="truncate text-[9px] font-mono tracking-[0.16em] text-white/82">{run.runId}</span>
                  </div>
                  <span className="text-[8px] font-mono text-white/42">{formatClock(run.createdAt)}</span>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span
                    className="rounded-sm px-1.5 py-0.5 text-[8px] font-mono tracking-[0.16em]"
                    style={{
                      color: run.mode === "delegated" ? "#bfdbfe" : "#fde68a",
                      background: run.mode === "delegated" ? "rgba(59,130,246,0.12)" : "rgba(245,158,11,0.12)",
                      border: `1px solid ${run.mode === "delegated" ? "rgba(59,130,246,0.22)" : "rgba(245,158,11,0.22)"}`,
                    }}
                  >
                    {run.mode === "delegated" ? "DELEGATED" : "DIRECT"}
                  </span>
                  <span className="rounded-sm border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] font-mono tracking-[0.16em] text-white/60">
                    {decisionLabel(run.decisionSource)}
                  </span>
                  <span className="rounded-sm border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] font-mono tracking-[0.16em] text-white/60">
                    {formatDuration(run.totalDurationMs)}
                  </span>
                  <span className="rounded-sm border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] font-mono tracking-[0.16em] text-white/60">
                    {run.stepCount} STEPS
                  </span>
                </div>

                <div className="mt-1.5 text-[10px] leading-relaxed text-white/72">{run.task}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-white/52">{run.summary}</div>

                {run.delegatedAgents.length > 0 && (
                  <div className="mt-1.5 text-[8px] font-mono tracking-[0.16em] text-emerald-200/60">
                    {run.delegatedAgents.join(" + ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
