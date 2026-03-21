"use client";

import { useCallback, useState } from "react";

import { INITIAL_AGENTS, getInitialMetrics } from "@/lib/agents";
import { sanitizeAgentDescriptors, sanitizeCommandInput } from "@/lib/inputSanitizers";
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
  stage?: string;
  dependsOnSubAgentIds?: string[];
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
};

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

type OrchestratorQueueStatus = "queued" | "running" | "completed" | "failed";

type OrchestratorQueueJobPayload = {
  id: string;
  kind: "orchestrator" | "n8n-handoff";
  status: OrchestratorQueueStatus;
  result?: OrchestratorSuccessPayload & OrchestratorErrorPayload;
  error?: string;
};

type N8nRunPayload = {
  companyName: string;
  website: string;
  painPoint: string;
  goal: string;
  channel: string;
  requestedDeliverable: string;
  prompt: string;
};

type N8nRunResponse = {
  ok?: boolean;
  summary?: string;
  webhookUrl?: string;
  error?: string;
  site?: {
    id?: string;
    url?: string;
    title?: string;
  };
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function hasWebBuildIntent(command: string) {
  const lower = command.toLowerCase();
  const creationSignal = /(crear|crea|hacer|armar|generar|disenar|diseñar|mejorar|redisenar|rediseñar|bajar)/.test(lower);
  const webSignal = /(landing|sitio|website|web\b|pagina|página|home|homepage|portal|micrositio|v0|interfaz|ui|ux)/.test(lower);
  const automationSignal = /(n8n|webhook|workflow|automat)/.test(lower);
  return (creationSignal && webSignal) || (automationSignal && webSignal) || /\bv0\b/.test(lower);
}

function extractFirstUrl(command: string) {
  return command.match(/https?:\/\/[^\s)]+/i)?.[0] ?? "";
}

function inferCompanyName(command: string, website: string) {
  if (website) {
    try {
      const hostname = new URL(website).hostname.replace(/^www\./i, "");
      const label = hostname.split(".")[0]?.replace(/[-_]+/g, " ").trim();
      if (label) {
        return label
          .split(" ")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      }
    } catch {
      return "Proyecto web";
    }
  }

  if (/aria/i.test(command)) {
    return "Office AI";
  }

  return "Proyecto web";
}

function guessRequestedDeliverable(command: string) {
  const lower = command.toLowerCase();
  if (/(portal|dashboard|cockpit|panel)/.test(lower)) return "ops-cockpit";
  if (/(landing|sitio|website|web\b|pagina|página|home|v0)/.test(lower)) return "landing-page-v0";
  return "web-deliverable";
}

function buildN8nPayloadFromCommand(command: string): N8nRunPayload {
  const website = extractFirstUrl(command);
  const requestedDeliverable = guessRequestedDeliverable(command);

  return {
    companyName: inferCompanyName(command, website),
    website,
    painPoint: "",
    goal:
      requestedDeliverable === "ops-cockpit"
        ? "disenar una interfaz operativa clara para trabajar con este agente"
        : "crear una web competitiva y accionable para este pedido",
    channel: "web",
    requestedDeliverable,
    prompt: command,
  };
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [metrics, setMetrics] = useState<SystemMetrics>(getInitialMetrics());
  const [teamModeEnabled, setTeamModeEnabled] = useState(true);
  const [orchestratorRefreshKey, setOrchestratorRefreshKey] = useState(0);

  const handleCommand = useCallback(async (cmd: string) => {
    const trimmedCommand = sanitizeCommandInput(cmd);
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

    if (hasWebBuildIntent(trimmedCommand)) {
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
                statusDetail: "WEB LANE",
                currentTask: "Traduciendo el pedido a un flujo real de n8n.",
              },
              [
                createLog("command", trimmedCommand),
                createLog("communication", "Recibi tu pedido. Voy a bajar una salida web real desde el agente."),
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
                statusDetail: "N8N RUN",
                currentTask: "Disparando el workflow real para construir la web.",
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
              statusDetail: "COPY LAYER",
              currentTask: "Preparando estructura, mensaje y conversion para la web.",
            };
          }

          if (agent.id === "vox") {
            return {
              ...standbyAgent,
              status: "thinking",
              animation: "typing",
              isSummoned: true,
              zone: "collab",
              lane: "beta",
              interactionTargetId: "aria",
              statusDetail: "LOOK & FEEL",
              currentTask: "Definiendo direccion visual y experiencia para la web.",
            };
          }

          return standbyAgent;
        })
      );

      setMetrics((prev) => ({
        ...prev,
        activeTasks: 4,
        requestsPerMin: prev.requestsPerMin + 1,
      }));

      try {
        const n8nPayload = buildN8nPayloadFromCommand(trimmedCommand);
        const response = await fetch("/api/n8n/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(n8nPayload),
        });

        const payload = (await response.json().catch(() => null)) as N8nRunResponse | null;

        if (!response.ok) {
          throw new Error(payload?.error || "No pude ejecutar el flujo real de n8n.");
        }

        const summary = payload?.summary || "n8n devolvio una respuesta para la web.";
        const webhookUrl = payload?.webhookUrl || "http://127.0.0.1:5678/webhook/office-ai/intake";
        const siteUrl = payload?.site?.url || "";

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
                  statusDetail: "WEB READY",
                  currentTask: "Entregando la salida web generada por el flujo.",
                },
                [
                  createLog("system", `Webhook OK: ${webhookUrl}`),
                  ...(siteUrl ? [createLog("system", `WEB URL ${siteUrl}`)] : []),
                  ...(siteUrl ? [createLog("communication", `La web ya esta lista. Link: ${siteUrl}`)] : []),
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
                  statusDetail: "WORKFLOW OK",
                  currentTask: "n8n devolvio una salida web accionable.",
                  tasksCompleted: agent.tasksCompleted + 1,
                },
                [createLog("communication", "El workflow real ya dejo una propuesta lista para bajar.")]
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
                  statusDetail: "COPY READY",
                  currentTask: "Afinando propuesta, secciones y mensaje.",
                  tasksCompleted: agent.tasksCompleted + 1,
                },
                [createLog("communication", summary)]
              );
            }

            if (agent.id === "vox") {
              return appendAgentLogs(
                {
                  ...standbyAgent,
                  status: "thinking",
                  animation: "typing",
                  isSummoned: true,
                  zone: "collab",
                  lane: "beta",
                  interactionTargetId: "aria",
                  statusDetail: "VISUAL READY",
                  currentTask: "Traduciendo la salida a direccion visual y experiencia.",
                  tasksCompleted: agent.tasksCompleted + 1,
                },
                [createLog("communication", "La capa visual ya tiene direccion para bajar la web.")]
              );
            }

            return standbyAgent;
          })
        );

        setMetrics((prev) => ({
          ...prev,
          activeTasks: 4,
          totalTasks: prev.totalTasks + 3,
          tokensTotal: prev.tokensTotal + Math.ceil(summary.length / 4),
        }));
      } catch (error: unknown) {
        const message = getErrorMessage(error, "No pude ejecutar el flujo real de n8n.");

        setAgents((prev) =>
          prev.map((agent) => {
            const standbyAgent = buildStandbyAgent(agent);

            if (agent.id === "aria") {
              return appendAgentLogs(standbyAgent, [createLog("system", `ERROR WEB LANE: ${message}`)]);
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
                  currentTask: "La ruta web de n8n fallo. Hay que revisar el webhook o el flujo activo.",
                },
                [createLog("system", message)]
              );
            }

            return standbyAgent;
          })
        );

        setMetrics((prev) => ({ ...prev, activeTasks: 1 }));
      } finally {
        setOrchestratorRefreshKey((prev) => prev + 1);
      }

      return;
    }

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

    try {
      const enqueueRes = await fetch("/api/orchestrator/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "orchestrator",
          payload: {
            prompt: trimmedCommand,
            teamMode: teamModeEnabled,
            currentAgents: sanitizeAgentDescriptors(agents.map((agent) => ({ id: agent.id, name: agent.name, role: agent.role }))),
          },
        }),
      });

      const enqueuePayload = (await enqueueRes.json().catch(() => null)) as
        | {
            job?: {
              id?: string;
              status?: OrchestratorQueueStatus;
            };
            error?: string;
          }
        | null;

      if (!enqueueRes.ok) {
        throw new Error(enqueuePayload?.error || "No pude encolar el pedido del orquestador");
      }

      const jobId = enqueuePayload?.job?.id;
      if (!jobId) {
        throw new Error("La cola no devolvió un jobId válido");
      }

      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== "aria") return agent;
          return appendAgentLogs(agent, [
            createLog("system", `QUEUE ${jobId}`),
            createLog("system", "JOB ENCOLADO"),
            createLog("communication", "ARIA dejó el pedido en cola persistente y espera al worker externo."),
          ]);
        })
      );

      let queuedJob: OrchestratorQueueJobPayload | null = null;
      let lastKnownStatus: OrchestratorQueueStatus | null = null;

      for (let attempt = 0; attempt < 90; attempt += 1) {
        await sleep(attempt === 0 ? 250 : 1000);
        const jobRes = await fetch(`/api/orchestrator/jobs/${jobId}`, { cache: "no-store" });
        const jobPayload = (await jobRes.json().catch(() => null)) as
          | {
              job?: OrchestratorQueueJobPayload;
              error?: string;
            }
          | null;

        if (!jobRes.ok) {
          throw new Error(jobPayload?.error || `No pude leer el job ${jobId}`);
        }

        queuedJob = jobPayload?.job ?? null;
        if (!queuedJob) {
          throw new Error(`El job ${jobId} no devolvió estado`);
        }

        if (queuedJob.status !== lastKnownStatus) {
          lastKnownStatus = queuedJob.status;
          if (queuedJob.status === "running") {
            setAgents((prev) =>
              prev.map((agent) => {
                if (agent.id !== "aria") return agent;
                return appendAgentLogs(agent, [
                  createLog("system", "WORKER RUNNING"),
                  createLog("communication", "El worker tomó el pedido de la cola y está ejecutando a ARIA."),
                ]);
              })
            );
          }
        }

        if (queuedJob.status === "completed" || queuedJob.status === "failed") {
          break;
        }
      }

      if (!queuedJob) {
        throw new Error(`No pude recuperar el estado final del job ${jobId}`);
      }

      if (queuedJob.status !== "completed") {
        if (queuedJob.status === "failed") {
          throw new Error(queuedJob.error || "El worker marcó el job como fallido");
        }
        throw new Error(`La cola sigue pendiente. Verificá que el worker esté corriendo con "npm run worker".`);
      }

      const payload = queuedJob.result ?? null;
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
                logs.push(
                  createLog(
                    "system",
                    `Subagentes: ${step.subSteps.map((subStep) => `${subStep.subAgentName}[${(subStep.stage || "task").toUpperCase()}]`).join(", ")}`
                  )
                );
                logs.push(
                  ...step.subSteps.slice(0, 3).map((subStep) =>
                    createLog(
                      "system",
                      `${subStep.subAgentName}${subStep.dependsOnSubAgentIds?.length ? ` <= ${subStep.dependsOnSubAgentIds.join("+")}` : ""} -> ${
                        subStep.output?.summary || subStep.message.split("\n")[0] || subStep.objective
                      }`
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
    } finally {
      setOrchestratorRefreshKey((prev) => prev + 1);
    }
  }, [agents, teamModeEnabled]);

  return { agents, metrics, teamModeEnabled, orchestratorRefreshKey, handleCommand };
}
