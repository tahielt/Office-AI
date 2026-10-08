"use client";

import { useCallback, useRef, useState } from "react";

import { INITIAL_AGENTS, getInitialMetrics } from "@/lib/agents";
import { Agent, AgentAnimation, AgentLane, AgentStatus, AgentZone, SystemMetrics, TeamAssignment } from "@/types/agent";

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
  echo: { status: "thinking", animation: "talking" },
  vox: { status: "thinking", animation: "typing" },
  aria: { status: "meeting", animation: "talking" },
};

const BASE_CURRENT_TASKS = Object.fromEntries(INITIAL_AGENTS.map((agent) => [agent.id, agent.currentTask])) as Record<string, string>;

type OrchestratorErrorPayload = {
  error?: string;
};

type OrchestratorStructuredOutput = {
  summary: string;
  evidence: Array<{
    title: string;
    claim: string;
    url?: string;
    snippet?: string;
  }>;
  risks: string[];
  nextSteps: string[];
  artifacts: Array<{
    kind: string;
    title: string;
    content: string;
  }>;
};

type OrchestratorStepTracePayload = {
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

type OrchestratorSubStepPayload = {
  subAgentId: string;
  subAgentName: string;
  subAgentRole: string;
  objective: string;
  thought: string;
  message: string;
  provider: string;
  output?: OrchestratorStructuredOutput;
  trace?: OrchestratorStepTracePayload;
};

type OrchestratorStepPayload = {
  agentId: string;
  task: string;
  thought: string;
  message: string;
  provider: string;
  runId?: string;
  output?: OrchestratorStructuredOutput;
  trace?: OrchestratorStepTracePayload;
  subSteps?: OrchestratorSubStepPayload[];
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
  usage?: { promptTokens: number; completionTokens: number };
};

type OrchestratorStreamEventPayload =
  | { type: "run_start"; runId: string; sessionId: string }
  | { type: "plan"; runId: string; task: string; delegatedAgents: string[]; reason: string }
  | { type: "step_start"; runId: string; agentId: string; lane?: AgentLane; statusDetail?: string }
  | { type: "token"; runId: string; agentId: string; delta: string }
  | { type: "step_complete"; runId: string; step: OrchestratorStepPayload }
  | { type: "run_complete"; runId: string; steps: OrchestratorStepPayload[]; trace: OrchestratorSuccessPayload["trace"] }
  | { type: "run_error"; runId: string; error: string; steps: OrchestratorStepPayload[]; trace: OrchestratorSuccessPayload["trace"] };

type OrchestratorSuccessPayload = {
  runId?: string;
  steps?: OrchestratorStepPayload[];
  trace?: {
    runId: string;
    task: string;
    delegatedAgents: string[];
    mode: "delegated" | "direct";
    startedAt: string;
    completedAt: string;
    totalDurationMs: number;
    steps: Array<{
      agentId: string;
      provider: string;
      durationMs: number;
      lane?: AgentLane;
      statusDetail?: string;
    }>;
  };
};

type N8nDemoErrorPayload = {
  error?: string;
  webhookUrl?: string;
};

type N8nDemoSuccessPayload = {
  ok?: boolean;
  webhookUrl?: string;
  summary?: string;
  result?: {
    ariaSummary?: string;
    clientReadyOutput?: {
      deliverable?: string;
      channel?: string;
      firstAction?: string;
    };
    suggestedPilot?: string;
  };
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
  // Si los pasos traen usage real del modelo (prompt+completion), lo usamos.
  // Si no (pasos stub o providers sin usage), caemos a la estimación por chars.
  const realTokens = steps.reduce(
    (total, step) => total + (step.usage ? step.usage.promptTokens + step.usage.completionTokens : 0),
    0
  );
  if (realTokens > 0) return realTokens;

  const characters = steps.reduce(
    (total, step) =>
      total +
      step.task.length +
      step.message.length +
      step.thought.length +
      (step.subSteps?.reduce((subTotal, subStep) => subTotal + subStep.message.length + subStep.thought.length, 0) ?? 0),
    0
  );
  return Math.ceil(characters / 4);
}

function compactTeamSummary(assignments: TeamAssignment[]) {
  return `Squad activo: ${assignments.map((assignment) => assignment.subAgentName).join(", ")}`;
}

/**
 * Consume el cuerpo SSE del orquestador, dispara onToken por cada delta y
 * reconstruye el mismo payload {runId, steps, trace} que devolvía el modo JSON,
 * para que el resto del hook procese los steps sin cambios.
 */
async function consumeOrchestratorStream(
  body: ReadableStream<Uint8Array>,
  handlers: { onToken: (agentId: string, delta: string) => void }
): Promise<OrchestratorSuccessPayload & OrchestratorErrorPayload> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: OrchestratorSuccessPayload & OrchestratorErrorPayload = {};

  const handleEvent = (event: OrchestratorStreamEventPayload) => {
    if (event.type === "token") {
      handlers.onToken(event.agentId.toLowerCase(), event.delta);
    } else if (event.type === "run_complete") {
      result = { runId: event.runId, steps: event.steps, trace: event.trace };
    } else if (event.type === "run_error") {
      result = { runId: event.runId, steps: event.steps, trace: event.trace, error: event.error };
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const rawEvent = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
      if (!rawEvent.startsWith("data:")) continue;
      const data = rawEvent.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        handleEvent(JSON.parse(data) as OrchestratorStreamEventPayload);
      } catch {
        // evento parcial o malformado: lo ignoramos
      }
    }
  }

  return result;
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

function buildN8nDemoSummary(payload: N8nDemoSuccessPayload | null) {
  if (!payload) return "n8n devolvio una respuesta vacia.";

  const lines: string[] = [];

  if (payload.summary?.trim()) {
    lines.push(payload.summary.trim());
  }

  const clientReady = payload.result?.clientReadyOutput;
  if (clientReady) {
    const deliverable = clientReady.deliverable || "salida";
    const channel = clientReady.channel || "canal";
    const firstAction = clientReady.firstAction || "validar siguiente paso";
    lines.push(`Listo para ${channel}: ${deliverable}.`);
    lines.push(`Siguiente accion: ${firstAction}.`);
  }

  if (payload.result?.suggestedPilot?.trim()) {
    lines.push(payload.result.suggestedPilot.trim());
  }

  return lines.join("\n").trim() || "n8n respondio correctamente.";
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [metrics, setMetrics] = useState<SystemMetrics>(getInitialMetrics());
  const [teamModeEnabled, setTeamModeEnabled] = useState(true);
  const [n8nDemoStatus, setN8nDemoStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [n8nDemoMessage, setN8nDemoMessage] = useState<string | null>(null);
  const [orchestratorRefreshKey, setOrchestratorRefreshKey] = useState(0);
  // sessionId estable mientras viva el componente: habilita la memoria de
  // conversación del orquestador (cada turno se persiste bajo este id).
  const sessionIdRef = useRef<string>(
    `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  );
  // Texto en vivo por agente mientras el modelo genera (clave = agentId).
  const [liveStream, setLiveStream] = useState<Record<string, string>>({});
  // Tokens consumidos en el run en curso, para el indicador en vivo de la terminal.
  const [liveTokens, setLiveTokens] = useState(0);
  // Provider del último step por agente (ollama/openai/groq/gemini/stub), para el badge en la terminal.
  const [agentProviders, setAgentProviders] = useState<Record<string, string>>({});

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

    setN8nDemoStatus("idle");
    setN8nDemoMessage(null);

    setAgents((prev) =>
      prev.map((agent) => {
        const standbyAgent = buildStandbyAgent(agent);
        if (agent.id === "aria") {
          return appendAgentLogs(
            {
              ...standbyAgent,
              status: "meeting",
              animation: "talking",
              zone: "collab",
              statusDetail: "TRIAGE REAL",
              currentTask: "Clasificando el pedido y esperando la decisión real de ARIA...",
            },
            [createLog("command", trimmedCommand)]
          );
        }

        return standbyAgent;
      })
    );

    setMetrics((prev) => ({
      ...prev,
      activeTasks: 1,
      requestsPerMin: prev.requestsPerMin + 1,
    }));

    setLiveStream({});
    setLiveTokens(0);

    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedCommand,
          teamMode: teamModeEnabled,
          sessionId: sessionIdRef.current,
          stream: true,
          currentAgents: agents.map((agent) => ({ id: agent.id, name: agent.name, role: agent.role })),
        }),
      });

      if (!res.ok || !res.body) {
        const errorBody = (await res.json().catch(() => null)) as OrchestratorErrorPayload | null;
        throw new Error(errorBody?.error || "Error al conectar con el orquestador");
      }

      const payload = (await consumeOrchestratorStream(res.body, {
        onToken: (agentId, delta) => {
          setLiveStream((prev) => ({ ...prev, [agentId]: (prev[agentId] ?? "") + delta }));
          setLiveTokens((prev) => prev + Math.max(1, Math.round(delta.length / 4)));
        },
      })) as
        | (OrchestratorSuccessPayload & OrchestratorErrorPayload)
        | null;

      if (payload?.error) {
        throw new Error(payload.error);
      }

      const steps = payload?.steps ?? [];
      if (steps.length === 0) {
        throw new Error("El orquestador no devolvió pasos ejecutables");
      }

      // El run terminó: el texto final ya viene en los steps, limpiamos el buffer en vivo.
      setLiveStream({});

      // Registramos el provider del último step de cada agente para el badge.
      setAgentProviders(() => {
        const map: Record<string, string> = {};
        for (const step of steps) {
          const id = normalizeTargetId(step.agentId.toLowerCase(), agents);
          if (id) map[id] = step.provider;
        }
        return map;
      });

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
          const entries = [
            ...(agent.id === "aria" && payload?.runId ? [createLog("system", `RUN ${payload.runId}`)] : []),
            ...(agent.id === "aria" && payload?.trace?.totalDurationMs
              ? [createLog("system", `TRACE ${payload.trace.mode.toUpperCase()} ${payload.trace.totalDurationMs}ms`)]
              : []),
            ...matchingSteps.flatMap((step) => {
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
              if (step.subSteps?.length) {
                logs.push(createLog("system", `Subagentes: ${step.subSteps.map((subStep) => subStep.subAgentName).join(", ")}`));
                logs.push(
                  ...step.subSteps.slice(0, 3).map((subStep) =>
                    createLog(
                      "system",
                      `${subStep.subAgentName} -> ${subStep.output?.summary || subStep.message.split("\n")[0] || subStep.objective}`
                    )
                  )
                );
              }
              if (step.message.trim()) {
                logs.push(createLog("communication", step.message.trim()));
              }
              return logs;
            }),
          ];

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
      setLiveStream({});
    } finally {
      setOrchestratorRefreshKey((prev) => prev + 1);
    }
  }, [agents, teamModeEnabled]);

  const handleN8nDemo = useCallback(async () => {
    setN8nDemoStatus("running");
    setN8nDemoMessage("Disparando webhook local hacia office-ai/intake...");

    setAgents((prev) =>
      prev.map((agent) => {
        const standbyAgent = buildStandbyAgent(agent);

        if (agent.id === "aria") {
          return appendAgentLogs(
            {
              ...standbyAgent,
              status: "meeting",
              animation: "talking",
              zone: "collab",
              statusDetail: "N8N DEMO LIVE",
              currentTask: "Coordinando la demo real de lead intake con n8n...",
            },
            [createLog("system", "N8N DEMO LIVE"), createLog("communication", "Disparando el piloto real hacia office-ai/intake.")]
          );
        }

        if (agent.id === "forge") {
          return appendAgentLogs(
            {
              ...standbyAgent,
              status: "running",
              animation: "typing",
              isSummoned: true,
              zone: "collab",
              lane: "alpha",
              interactionTargetId: "aria",
              statusDetail: "WEBHOOK LIVE",
              currentTask: "Ejecutando webhook local y esperando respuesta de n8n.",
            },
            [createLog("system", "POST office-ai/intake")]
          );
        }

        if (agent.id === "echo") {
          return {
            ...standbyAgent,
            status: "thinking",
            animation: "talking",
            isSummoned: true,
            zone: "collab",
            lane: "beta",
            interactionTargetId: "aria",
            statusDetail: "CLIENT OUTPUT",
            currentTask: "Preparando la salida comercial si n8n responde bien.",
          };
        }

        return standbyAgent;
      })
    );

    setMetrics((prev) => ({
      ...prev,
      activeTasks: 3,
      requestsPerMin: prev.requestsPerMin + 1,
    }));

    try {
      const res = await fetch("/api/n8n-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const payload = (await res.json().catch(() => null)) as (N8nDemoSuccessPayload & N8nDemoErrorPayload) | null;

      if (!res.ok) {
        throw new Error(payload?.error || "No pude ejecutar la demo de n8n");
      }

      const summary = buildN8nDemoSummary(payload);
      const webhookUrl = payload?.webhookUrl || "http://127.0.0.1:5678/webhook/office-ai/intake";

      setN8nDemoStatus("success");
      setN8nDemoMessage(summary);

      setAgents((prev) =>
        prev.map((agent) => {
          const standbyAgent = buildStandbyAgent(agent);

          if (agent.id === "aria") {
            return appendAgentLogs(
              {
                ...standbyAgent,
                status: "meeting",
                animation: "talking",
                zone: "collab",
                statusDetail: "N8N RESPONDIO",
                currentTask: "Cerrando la demo real de lead intake.",
              },
              [
                createLog("system", `Webhook OK: ${webhookUrl}`),
                createLog("communication", summary),
              ]
            );
          }

          if (agent.id === "forge") {
            return appendAgentLogs(
              {
                ...standbyAgent,
                status: "running",
                animation: "typing",
                isSummoned: true,
                zone: "collab",
                lane: "alpha",
                interactionTargetId: "aria",
                statusDetail: "WEBHOOK OK",
                currentTask: "n8n devolvio respuesta y el piloto quedo conectado.",
                tasksCompleted: agent.tasksCompleted + 1,
              },
              [createLog("communication", "Webhook ejecutado y sincronizado con la demo de Office AI.")]
            );
          }

          if (agent.id === "echo") {
            return appendAgentLogs(
              {
                ...standbyAgent,
                status: "thinking",
                animation: "talking",
                isSummoned: true,
                zone: "collab",
                lane: "beta",
                interactionTargetId: "aria",
                statusDetail: "OUTPUT LISTO",
                currentTask: "Mostrando la salida comercial que devolvio n8n.",
                tasksCompleted: agent.tasksCompleted + 1,
              },
              [createLog("communication", summary)]
            );
          }

          return standbyAgent;
        })
      );

      setMetrics((prev) => ({
        ...prev,
        activeTasks: 3,
        totalTasks: prev.totalTasks + 2,
        tokensTotal: prev.tokensTotal + Math.ceil(summary.length / 4),
      }));
    } catch (error: unknown) {
      const message = getErrorMessage(error, "No pude ejecutar la demo de n8n");

      setN8nDemoStatus("error");
      setN8nDemoMessage(message);

      setAgents((prev) =>
        prev.map((agent) => {
          const standbyAgent = buildStandbyAgent(agent);

          if (agent.id === "aria") {
            return appendAgentLogs(standbyAgent, [createLog("system", `ERROR N8N: ${message}`)]);
          }

          if (agent.id === "forge") {
            return appendAgentLogs(
              {
                ...standbyAgent,
                status: "running",
                animation: "typing",
                isSummoned: true,
                zone: "collab",
                lane: "alpha",
                interactionTargetId: "aria",
                statusDetail: "WEBHOOK FAIL",
                currentTask: "La conexion con n8n fallo. Revisar instancia local y webhook.",
              },
              [createLog("system", message)]
            );
          }

          return standbyAgent;
        })
      );

      setMetrics((prev) => ({ ...prev, activeTasks: 1 }));
    }
  }, []);

  return { agents, metrics, teamModeEnabled, orchestratorRefreshKey, handleCommand, handleN8nDemo, n8nDemoStatus, n8nDemoMessage, liveStream, liveTokens, agentProviders };
}
