"use client";

import { useCallback, useEffect, useState } from "react";

import { INITIAL_AGENTS, generateMockTask, getInitialMetrics } from "@/lib/agents";
import { Agent, AgentAnimation, AgentStatus, SystemMetrics, Task, TeamAssignment } from "@/types/agent";

const AGENT_ALIASES: Record<string, string> = {
  lyra: "scout",
  pulse: "vox",
};

const EXECUTION_STATE: Record<string, { status: AgentStatus; animation: AgentAnimation }> = {
  scout: { status: "researching", animation: "thinking" },
  apex: { status: "coding", animation: "typing" },
  vera: { status: "analyzing", animation: "thinking" },
  zion: { status: "thinking", animation: "thinking" },
  forge: { status: "running", animation: "typing" },
  echo: { status: "thinking", animation: "typing" },
  vox: { status: "thinking", animation: "typing" },
  aria: { status: "thinking", animation: "talking" },
};

type OrchestratorErrorPayload = {
  error?: string;
};

type OrchestratorStepPayload = {
  agentId: string;
  task: string;
  thought: string;
  message: string;
  provider: string;
  teamAssignments?: TeamAssignment[];
  teamModeUsed?: boolean;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
};

type OrchestratorSuccessPayload = {
  steps?: OrchestratorStepPayload[];
};

function normalizeTargetId(rawId: string | null, agents: Agent[]) {
  if (!rawId) return null;
  const normalized = AGENT_ALIASES[rawId] ?? rawId;
  if (agents.some((agent) => agent.id === normalized)) return normalized;
  return agents.find((agent) => agent.id.startsWith(normalized))?.id ?? null;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function guessInitialTarget(cmd: string) {
  if (cmd.startsWith("/report_status") || cmd.startsWith("/summon_all")) return "zion";
  if (cmd.startsWith("/dismiss")) return "aria";
  return "aria";
}

function createLog(type: "system" | "thought" | "communication", text: string) {
  return {
    id: crypto.randomUUID(),
    type,
    text,
    timestamp: new Date(),
  };
}

function appendAgentLogs(agent: Agent, entries: ReturnType<typeof createLog>[]) {
  return {
    ...agent,
    log: [...agent.log, ...entries].slice(-18),
  };
}

function getNextTeamModeValue(cmd: string, currentValue: boolean) {
  const lower = cmd.toLowerCase().trim();
  if (!lower.startsWith("/team_mode")) return null;
  if (/\b(on|enable|1|true)\b/.test(lower)) return true;
  if (/\b(off|disable|0|false)\b/.test(lower)) return false;
  return !currentValue;
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>(getInitialMetrics());
  const [teamModeEnabled, setTeamModeEnabled] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const task = generateMockTask();
      const duration = 3000 + Math.random() * 4000;
      setTasks((prev) => [{ ...task, status: "running" }, ...prev.slice(0, 19)]);
      setMetrics((prev) => ({ ...prev, activeTasks: prev.activeTasks + 1 }));
      setTimeout(() => {
        setTasks((prev) =>
          prev.map((current) => (current.id === task.id ? { ...current, status: "done", completedAt: new Date() } : current))
        );
        setMetrics((prev) => ({
          ...prev,
          activeTasks: Math.max(0, prev.activeTasks - 1),
          totalTasks: prev.totalTasks + 1,
          tokensTotal: prev.tokensTotal + Math.floor(Math.random() * 8000 + 1000),
          requestsPerMin: Math.max(10, prev.requestsPerMin + Math.floor(Math.random() * 5) - 2),
        }));
        setAgents((prev) =>
          prev.map((agent) => (agent.id === task.agentId ? { ...agent, tasksCompleted: agent.tasksCompleted + 1 } : agent))
        );
      }, duration);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleCommand = useCallback(async (cmd: string) => {
    const previousStates = new Map(agents.map((agent) => [agent.id, { status: agent.status, animation: agent.animation }]));
    const initialTargetId = guessInitialTarget(cmd);

    const requestedTeamModeValue = getNextTeamModeValue(cmd, teamModeEnabled);
    if (requestedTeamModeValue !== null) {
      setTeamModeEnabled(requestedTeamModeValue);
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === "aria"
            ? {
                ...appendAgentLogs(agent, [
                  createLog("system", `AGENTS TEAM ${requestedTeamModeValue ? "ONLINE" : "OFFLINE"}`),
                  createLog(
                    "communication",
                    requestedTeamModeValue
                      ? "ARIA activa el modo Agents Team. Cada líder coordina su squad interno."
                      : "ARIA desactiva el modo Agents Team. Los agentes vuelven a ejecución individual."
                  ),
                ]),
                currentTask: requestedTeamModeValue
                  ? "Coordinando squads internos y seguimiento de equipos..."
                  : "Monitoreando canal de entrada...",
                status: "thinking",
                animation: "talking",
              }
            : agent
        )
      );

      setTimeout(() => {
        setAgents((prev) =>
          prev.map((agent) =>
            agent.id === "aria"
              ? { ...agent, status: previousStates.get("aria")?.status ?? "idle", animation: previousStates.get("aria")?.animation ?? "idle" }
              : agent
          )
        );
      }, 1500);

      return;
    }

    if (cmd.startsWith("/summon_all")) {
      setAgents((prev) => prev.map((agent) => ({ ...agent, isSummoned: true, animation: "walking" })));
      setTimeout(() => {
        setAgents((prev) =>
          prev.map((agent) => ({ ...agent, animation: agent.id === "zion" ? "talking" : "idle" }))
        );
      }, 1000);
    }

    if (cmd.startsWith("/dismiss")) {
      setAgents((prev) => prev.map((agent) => ({ ...agent, isSummoned: false, animation: "walking" })));
      setTimeout(() => {
        setAgents((prev) => prev.map((agent) => ({ ...agent, animation: "idle" })));
      }, 1000);
      return;
    }

    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === initialTargetId || cmd.startsWith("/")
          ? appendAgentLogs(agent, [createLog("communication", cmd)])
          : agent
      )
    );

    const initialState = EXECUTION_STATE[initialTargetId];
    if (initialState) {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === initialTargetId
            ? { ...agent, status: initialState.status, animation: initialState.animation }
            : agent
        )
      );
    }

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cmd,
          teamMode: teamModeEnabled,
          currentAgents: agents.map((agent) => ({ id: agent.id, name: agent.name, role: agent.role })),
        }),
      });

      const payload = (await res.json().catch(() => null)) as
        | (OrchestratorSuccessPayload & OrchestratorErrorPayload)
        | null;

      if (!res.ok) {
        throw new Error(payload?.error || "Error al conectar con el orquestador");
      }

      const steps = payload?.steps ?? [];
      if (steps.length === 0) {
        throw new Error("El orquestador no devolvió pasos ejecutables");
      }

      const touchedAgents = new Set(
        steps
          .map((step) => normalizeTargetId(step.agentId.toLowerCase(), agents))
          .filter((agentId): agentId is string => Boolean(agentId))
      );

      setAgents((prev) =>
        prev.map((agent) => {
          const matchingSteps = steps.filter(
            (step) => normalizeTargetId(step.agentId.toLowerCase(), prev) === agent.id
          );

          if (matchingSteps.length === 0) {
            return agent;
          }

          const state = EXECUTION_STATE[agent.id];
          const entries = matchingSteps.flatMap((step) => {
            const logs = [];
            if (step.thought.trim()) logs.push(createLog("thought", step.thought.trim()));
            if (step.message.trim()) logs.push(createLog("communication", step.message.trim()));
            if (step.teamModeUsed && step.teamAssignments?.length) {
              logs.push(createLog("system", `AGENTS TEAM: ${step.teamAssignments.length} subagentes activos`));
              for (const assignment of step.teamAssignments) {
                logs.push(
                  createLog(
                    "system",
                    `TEAM:${assignment.subAgentName} [${assignment.subAgentRole}] ${assignment.objective}`
                  )
                );
              }
            }
            for (const [index, source] of (step.sources ?? []).slice(0, 4).entries()) {
              logs.push(createLog("system", `FUENTE ${index + 1}: ${source.title} - ${source.url}`));
            }
            return logs;
          });

          return {
            ...appendAgentLogs(agent, entries),
            currentTask: matchingSteps[matchingSteps.length - 1]?.task || agent.currentTask,
            status: state?.status ?? agent.status,
            animation: state?.animation ?? agent.animation,
          };
        })
      );

      setTimeout(() => {
        setAgents((prev) =>
          prev.map((agent) => {
            if (!touchedAgents.has(agent.id)) return agent;
            const originalState = previousStates.get(agent.id);
            return originalState ? { ...agent, status: originalState.status, animation: originalState.animation } : agent;
          })
        );
      }, 1800);
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Error desconocido al contactar al orquestador");

      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === initialTargetId
            ? {
                ...appendAgentLogs(agent, [createLog("system", `ERROR: ${message}`)]),
                status: previousStates.get(agent.id)?.status ?? "idle",
                animation: previousStates.get(agent.id)?.animation ?? "idle",
              }
            : agent
        )
      );
    }
  }, [agents, teamModeEnabled]);

  return { agents, tasks, metrics, teamModeEnabled, handleCommand };
}
