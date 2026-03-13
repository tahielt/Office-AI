"use client";

import { useCallback, useState } from "react";

import { INITIAL_AGENTS, getInitialMetrics } from "@/lib/agents";
import { Agent, AgentAnimation, AgentLane, AgentStatus, AgentZone, SystemMetrics, TeamAssignment } from "@/types/agent";

const AGENT_ALIASES: Record<string, string> = {
  lyra: "scout",
  pulse: "vox",
};

const ROUTING_HINTS: Array<{ agentId: string; patterns: RegExp[] }> = [
  {
    agentId: "scout",
    patterns: [/\binvestig/i, /\bweb\b/i, /\bmercado\b/i, /\bcompet/i, /\btendenc/i, /\bbenchmark/i, /\bfuentes?\b/i],
  },
  {
    agentId: "apex",
    patterns: [/\bcodigo\b/i, /\bc[oó]digo\b/i, /\brepo\b/i, /\bbug\b/i, /\berror\b/i, /\bbackend\b/i, /\bfrontend\b/i, /\bdebug\b/i],
  },
  {
    agentId: "vera",
    patterns: [/\bm[eé]trica/i, /\bdatos?\b/i, /\ban[aá]lis/i, /\bkpi\b/i, /\bforecast\b/i, /\bcohort/i],
  },
  {
    agentId: "zion",
    patterns: [/\bestrateg/i, /\broadmap\b/i, /\bpriori/i, /\bplan\b/i, /\bdecision/i, /\btrade/i],
  },
  {
    agentId: "forge",
    patterns: [/\bautomat/i, /\bworkflow\b/i, /\bn8n\b/i, /\bwebhook\b/i, /\btrigger\b/i, /\bpipeline\b/i, /\bintegr/i],
  },
  {
    agentId: "echo",
    patterns: [/\bemail\b/i, /\bmail\b/i, /\bmensaje/i, /\bcliente\b/i, /\bfollow/i, /\bpropuesta\b/i],
  },
  {
    agentId: "vox",
    patterns: [/\bcontenido\b/i, /\breel\b/i, /\bpost\b/i, /\bguion\b/i, /\bcaption\b/i, /\bcopy\b/i],
  },
];

const EXECUTION_STATE: Record<string, { status: AgentStatus; animation: AgentAnimation }> = {
  scout: { status: "researching", animation: "thinking" },
  apex: { status: "coding", animation: "typing" },
  vera: { status: "analyzing", animation: "thinking" },
  zion: { status: "thinking", animation: "thinking" },
  forge: { status: "running", animation: "typing" },
  echo: { status: "thinking", animation: "talking" },
  vox: { status: "thinking", animation: "typing" },
  aria: { status: "meeting", animation: "talking" },
};

const BASE_CURRENT_TASKS = Object.fromEntries(INITIAL_AGENTS.map((agent) => [agent.id, agent.currentTask])) as Record<string, string>;

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
  lane?: AgentLane;
  zone?: AgentZone;
  interactionTargetId?: string;
  statusDetail?: string;
  handoffTargets?: string[];
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

function createLog(type: "system" | "communication" | "command", text: string) {
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
    log: [...agent.log, ...entries].slice(-12),
  };
}

function getNextTeamModeValue(cmd: string, currentValue: boolean) {
  const lower = cmd.toLowerCase().trim();
  if (!lower.startsWith("/team_mode")) return null;
  if (/\b(on|enable|1|true)\b/.test(lower)) return true;
  if (/\b(off|disable|0|false)\b/.test(lower)) return false;
  return !currentValue;
}

function estimateTokenUnits(steps: OrchestratorStepPayload[]) {
  const characters = steps.reduce((total, step) => total + step.task.length + step.message.length + step.thought.length, 0);
  return Math.ceil(characters / 4);
}

function compactTeamSummary(assignments: TeamAssignment[]) {
  return `Squad activo: ${assignments.map((assignment) => assignment.subAgentName).join(", ")}`;
}

function inferRequestedAgents(command: string, agents: Agent[]) {
  const normalized = command.toLowerCase();
  const explicit = [...command.matchAll(/@(\w+)/gi)]
    .map((match) => normalizeTargetId(match[1].toLowerCase(), agents))
    .filter((agentId): agentId is string => Boolean(agentId && agentId !== "aria"));

  if (explicit.length > 0) {
    return [...new Set(explicit)].slice(0, 3);
  }

  const hasMultiCue = /\b(y|adem[aá]s|tambien|junto|sum[aá]|m[aá]s|con)\b/i.test(command);
  const scored = ROUTING_HINTS.map((hint) => ({
    agentId: hint.agentId,
    score: hint.patterns.reduce((total, pattern) => total + (pattern.test(normalized) ? 1 : 0), 0),
  }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const selected: string[] = [];
  if (scored[0]) selected.push(scored[0].agentId);
  if (scored[1] && (scored[1].score >= 2 || (hasMultiCue && scored[1].score >= 1))) selected.push(scored[1].agentId);
  if (scored[2] && hasMultiCue && scored[2].score >= 1) selected.push(scored[2].agentId);

  return [...new Set(selected)].slice(0, 3);
}

function buildStandbyAgent(agent: Agent): Agent {
  return {
    ...agent,
    status: "idle",
    animation: "idle",
    isSummoned: false,
    currentTask: BASE_CURRENT_TASKS[agent.id] ?? agent.currentTask,
    activeTeamAssignments: [],
    lane: null,
    zone: "desk",
    interactionTargetId: null,
    statusDetail: null,
  };
}

function getAgentExecutionState(agentId: string, hasMultipleSpecialists: boolean) {
  if (agentId === "aria") {
    return hasMultipleSpecialists ? { status: "meeting" as AgentStatus, animation: "talking" as AgentAnimation } : EXECUTION_STATE.aria;
  }
  return EXECUTION_STATE[agentId] ?? { status: "thinking" as AgentStatus, animation: "thinking" as AgentAnimation };
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [metrics, setMetrics] = useState<SystemMetrics>(getInitialMetrics());
  const [teamModeEnabled, setTeamModeEnabled] = useState(true);

  const handleCommand = useCallback(async (cmd: string) => {
    const trimmedCommand = cmd.trim();
    if (!trimmedCommand) return;

    const requestedTeamModeValue = getNextTeamModeValue(trimmedCommand, teamModeEnabled);
    if (requestedTeamModeValue !== null) {
      setTeamModeEnabled(requestedTeamModeValue);
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== "aria") {
            return buildStandbyAgent(agent);
          }

          return appendAgentLogs(buildStandbyAgent(agent), [
            createLog("system", `AGENTS TEAM ${requestedTeamModeValue ? "ONLINE" : "OFFLINE"}`),
            createLog(
              "communication",
              requestedTeamModeValue
                ? "ARIA deja a los squads internos listos para coordinar especialistas reales."
                : "ARIA vuelve a ejecución individual y pausa los squads internos."
            ),
          ]);
        })
      );
      return;
    }

    if (trimmedCommand.startsWith("/summon_all")) {
      setAgents((prev) =>
        prev.map((agent) => ({
          ...buildStandbyAgent(agent),
          isSummoned: agent.id !== "aria",
          status: agent.id === "aria" ? "meeting" : "meeting",
          animation: agent.id === "aria" ? "talking" : "walking",
          zone: agent.id === "aria" ? "collab" : "handoff",
          interactionTargetId: agent.id === "aria" ? null : "aria",
          statusDetail: agent.id === "aria" ? "SUMMON ALL" : "EN TRANSITO",
          currentTask:
            agent.id === "aria"
              ? "Convocando a todos los especialistas al frente."
              : `Convocado al frente por ARIA para la siguiente solicitud.`,
        }))
      );
      setMetrics((prev) => ({ ...prev, activeTasks: INITIAL_AGENTS.length }));
      return;
    }

    if (trimmedCommand.startsWith("/dismiss")) {
      setAgents((prev) => prev.map((agent) => buildStandbyAgent(agent)));
      setMetrics((prev) => ({ ...prev, activeTasks: 0 }));
      return;
    }

    setAgents((prev) => {
      const requestedAgents = inferRequestedAgents(trimmedCommand, prev);
      return prev.map((agent) => {
        const standbyAgent = buildStandbyAgent(agent);
        const requestedIndex = requestedAgents.indexOf(agent.id);
        if (agent.id === "aria") {
          return appendAgentLogs(
            {
              ...standbyAgent,
              status: "meeting",
              animation: "talking",
              zone: "collab",
              statusDetail: requestedAgents.length > 0 ? `ACTIVANDO ${requestedAgents.length}` : "TRIAGE",
              currentTask:
                requestedAgents.length > 0
                  ? `Preparando handoff para ${requestedAgents.map((item) => item.toUpperCase()).join(", ")}.`
                  : "Clasificando el pedido y activando especialistas...",
            },
            [createLog("command", trimmedCommand)]
          );
        }

        if (requestedIndex >= 0) {
          return {
            ...standbyAgent,
            status: getAgentExecutionState(agent.id, requestedAgents.length > 1).status,
            animation: requestedAgents.length > 1 ? "walking" : getAgentExecutionState(agent.id, false).animation,
            isSummoned: true,
            lane: requestedIndex === 0 ? "alpha" : requestedIndex === 1 ? "beta" : "gamma",
            zone: requestedAgents.length > 1 ? "handoff" : "desk",
            interactionTargetId: "aria",
            statusDetail: "EN CURSO",
            currentTask: `Recibiendo brief de ARIA para "${trimmedCommand.slice(0, 48)}${trimmedCommand.length > 48 ? "..." : ""}"`,
          };
        }

        return standbyAgent;
      });
    });

    setMetrics((prev) => ({
      ...prev,
      activeTasks: 1,
      requestsPerMin: prev.requestsPerMin + 1,
    }));

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedCommand,
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
      const specialistCount = [...touchedAgents].filter((agentId) => agentId !== "aria").length;

      setAgents((prev) =>
        prev.map((agent) => {
          const matchingSteps = steps.filter(
            (step) => normalizeTargetId(step.agentId.toLowerCase(), prev) === agent.id
          );

          if (matchingSteps.length === 0) {
            return buildStandbyAgent(agent);
          }

          const latestStep = matchingSteps[matchingSteps.length - 1];
          const state = getAgentExecutionState(agent.id, specialistCount > 1);
          const entries = matchingSteps.flatMap((step) => {
            const logs = [];
            if (step.teamModeUsed && step.teamAssignments?.length && agent.id === "aria") {
              logs.push(createLog("system", compactTeamSummary(step.teamAssignments)));
            }
            if (step.statusDetail && agent.id === "aria") {
              logs.push(createLog("system", step.statusDetail));
            }
            if (step.handoffTargets?.length && agent.id === "aria") {
              logs.push(createLog("system", `Handoff activo: ${step.handoffTargets.join(", ")}`));
            }
            if (step.sources?.length && agent.id === "aria") {
              logs.push(createLog("system", `${Math.min(step.sources.length, 4)} fuentes verificadas.`));
            }
            if (step.message.trim()) {
              logs.push(createLog("communication", step.message.trim()));
            }
            return logs;
          });

          const nextAgent = appendAgentLogs(
            {
              ...buildStandbyAgent(agent),
              currentTask: latestStep.task || agent.currentTask,
              status: state.status,
              animation: state.animation,
              isSummoned: agent.id !== "aria" && touchedAgents.has(agent.id),
              activeTeamAssignments: latestStep.teamAssignments ?? [],
              lane: latestStep.lane ?? null,
              zone: latestStep.zone ?? (agent.id === "aria" ? "collab" : touchedAgents.has(agent.id) ? "handoff" : "desk"),
              interactionTargetId: latestStep.interactionTargetId ?? null,
              statusDetail: latestStep.statusDetail ?? null,
              tasksCompleted: agent.tasksCompleted + (agent.id === "aria" ? 0 : 1),
            },
            entries
          );

          return nextAgent;
        })
      );

      setMetrics((prev) => ({
        ...prev,
        activeTasks: touchedAgents.size,
        totalTasks: prev.totalTasks + Math.max(1, specialistCount),
        tokensTotal: prev.tokensTotal + estimateTokenUnits(steps),
      }));
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Error desconocido al contactar al orquestador");

      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== "aria") {
            return buildStandbyAgent(agent);
          }

          return appendAgentLogs(buildStandbyAgent(agent), [createLog("system", `ERROR: ${message}`)]);
        })
      );

      setMetrics((prev) => ({ ...prev, activeTasks: 0 }));
    }
  }, [agents, teamModeEnabled]);

  return { agents, metrics, teamModeEnabled, handleCommand };
}
