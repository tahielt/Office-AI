import { getTeamMembersForAgent } from "@/lib/agentTeams";

import { AGENT_DIRECTORY, AGENT_PROMPTS, CONFIG } from "./config";
import { tryGenerateObject } from "./providers";
import {
  AgentId,
  AgentStep,
  AgentStructuredOutput,
  AriaPlannerDecision,
  PlannedRoute,
  RoutePlan,
  SpecialistAgentId,
  SubAgentStep,
} from "./types";
import { buildTeamContext, runSubAgentBatch, buildSubStepsContext, attachTeamData } from "./agents";
import { buildHeuristicPlan, normalizeAgentId } from "./routing";
import { clip, normalizePlainText, stripLeadingMention } from "./text";

const SHORT_GREETING_SET = new Set([
  "hola", "holi", "buenas", "hello", "hey", "buen dia", "buen dia aria", "buen dia equipo",
]);

function buildRoutingDirectory() {
  return (Object.entries(AGENT_DIRECTORY) as Array<[AgentId, (typeof AGENT_DIRECTORY)[AgentId]]>)
    .filter(([agentId]) => agentId !== "ARIA")
    .map(([agentId, info]) => `- ${agentId}: ${info.role}. ${info.summary}.`)
    .join("\n");
}

export function buildAriaStep(
  task: string,
  message: string,
  thought: string,
  teamModeEnabled: boolean,
  coordination: Partial<Pick<AgentStep, "lane" | "zone" | "interactionTargetId" | "statusDetail" | "handoffTargets">> = {},
  output?: AgentStructuredOutput,
  subSteps: SubAgentStep[] = []
): AgentStep {
  const { teamAssignments } = buildTeamContext("ARIA", task, teamModeEnabled);
  const base: AgentStep = {
    agentId: "ARIA",
    task,
    provider: "stub",
    thought,
    message,
    output,
    ...(subSteps.length > 0 ? { subSteps } : {}),
  };
  return { ...attachTeamData(base, teamAssignments, teamModeEnabled), ...coordination };
}

export function getStructuredAriaResponse(prompt: string, teamModeEnabled: boolean) {
  const normalized = normalizePlainText(stripLeadingMention(prompt) || prompt);

  if (/^(quienes son|quienes son los agentes|que agentes hay|lista de agentes|quien es quien)$/.test(normalized)) {
    const agentSummary = (Object.entries(AGENT_DIRECTORY) as Array<[AgentId, (typeof AGENT_DIRECTORY)[AgentId]]>)
      .map(([agentId, info]) => `- ${agentId}: ${info.role}. ${info.summary}.`)
      .join("\n");
    return [
      buildAriaStep(
        "directorio de agentes",
        `Estos son los agentes de Office AI:\n${agentSummary}`,
        "Respondí desde el directorio interno sin despertar al modelo porque esta consulta vive en la estructura del sistema.",
        teamModeEnabled
      ),
    ];
  }

  if (/^(quienes son los subagentes|que subagentes hay|mostrame los squads|como se divide el team|equipos internos)$/.test(normalized)) {
    const squadSummary = (Object.keys(AGENT_DIRECTORY) as AgentId[])
      .map((agentId) => {
        const members = getTeamMembersForAgent(agentId).map((member) => `${member.name} (${member.role})`).join(", ");
        return `- ${agentId}: ${members}`;
      })
      .join("\n");
    return [
      buildAriaStep(
        "squads internos",
        `Cada agente principal trabaja con un squad interno de 3 subroles operativos:\n${squadSummary}`,
        "Consulté la definición de squads del sistema. Esto sale directo del diseño operativo y no requiere generación del modelo.",
        teamModeEnabled
      ),
    ];
  }

  return null;
}

export function getFastAriaResponse(prompt: string, teamModeEnabled: boolean) {
  const normalized = normalizePlainText(stripLeadingMention(prompt) || prompt);

  if (SHORT_GREETING_SET.has(normalized)) {
    return [
      buildAriaStep(
        "saludo inicial",
        "ARIA online. Soy la secretaria central de Office AI y coordino squads internos por agente. Decime qué necesitás y activo al equipo correcto.",
        "INBOX detectó un saludo corto. Respondo directo sin despertar a todo el equipo para mantener la oficina ágil.",
        teamModeEnabled
      ),
    ];
  }

  if (/^(quien sos|que haces|que podes hacer|como trabajas)$/.test(normalized)) {
    return [
      buildAriaStep(
        "presentación del sistema",
        "Soy ARIA, la secretaria y cerebro principal. Recibo pedidos, los clasifico y coordino a SCOUT para investigación web, APEX para ingeniería, VERA para análisis, ZION para estrategia, FORGE para automatización, ECHO para comunicaciones y VOX para contenido.",
        "INBOX pidió una presentación general. SWITCH mantiene la respuesta en ARIA porque no hace falta delegar todavía.",
        teamModeEnabled
      ),
    ];
  }

  return null;
}

/**
 * Schema de la decisión de routing. Con Ollama va como `format` nativo
 * (el modelo queda forzado a emitir esta forma exacta), y con providers
 * cloud va vía generateObject del AI SDK. Esto elimina el modo de falla
 * más común del planner: modelos chicos que devolvían JSON roto.
 */
const ROUTING_DECISION_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    task: { type: "string", description: "La tarea reformulada en una frase corta" },
    shouldDelegate: { type: "boolean" },
    delegatedAgents: {
      type: "array",
      items: { type: "string", enum: ["SCOUT", "APEX", "VERA", "ZION", "FORGE", "ECHO", "VOX"] },
      maxItems: 3,
    },
    reason: { type: "string", description: "Criterio de la decisión en una frase" },
  },
  required: ["task", "shouldDelegate", "delegatedAgents", "reason"],
};

function parsePlannerDecision(raw: unknown, prompt: string): AriaPlannerDecision | null {
  if (typeof raw !== "object" || raw === null) return null;
  const parsed = raw as { task?: unknown; shouldDelegate?: unknown; delegatedAgents?: unknown; reason?: unknown };

  const delegatedAgents = Array.isArray(parsed.delegatedAgents)
    ? [
        ...new Set(
          parsed.delegatedAgents
            .map((item) => normalizeAgentId(String(item)))
            .filter((item): item is SpecialistAgentId => Boolean(item && item !== "ARIA"))
        ),
      ].slice(0, 3)
    : [];
  const shouldDelegate =
    typeof parsed.shouldDelegate === "boolean" ? parsed.shouldDelegate && delegatedAgents.length > 0 : delegatedAgents.length > 0;
  const task =
    typeof parsed.task === "string" && parsed.task.trim() ? parsed.task.trim() : stripLeadingMention(prompt) || prompt.trim();

  return {
    task,
    shouldDelegate,
    delegatedAgents: shouldDelegate ? delegatedAgents : [],
    reason:
      typeof parsed.reason === "string" && parsed.reason.trim()
        ? clip(parsed.reason.replace(/\s+/g, " ").trim(), 220)
        : "",
  };
}

export async function planWithAria(
  prompt: string,
  roster: string,
  teamModeEnabled: boolean,
  historyContext = ""
): Promise<PlannedRoute> {
  const heuristicPlan = buildHeuristicPlan(prompt);
  const { teamAssignments } = buildTeamContext("ARIA", heuristicPlan.task, teamModeEnabled);
  const plannerSubSteps = await runSubAgentBatch(
    "ARIA",
    prompt,
    teamAssignments,
    [historyContext, `Pedido del usuario:\n${prompt}`, `Especialistas disponibles:\n${buildRoutingDirectory()}`]
      .filter(Boolean)
      .join("\n\n"),
    false,
    "- Enfocate en triage, routing y seguimiento. No redactes la respuesta final."
  );

  const generation = await tryGenerateObject(
    `${AGENT_PROMPTS.ARIA}${roster}\nTu trabajo actual es decidir routing, no redactar la solución final.`,
    [
      historyContext,
      `Pedido del usuario:\n${prompt}`,
      `Especialistas disponibles:\n${buildRoutingDirectory()}`,
      plannerSubSteps.length > 0 ? `Lecturas internas de ARIA:\n${buildSubStepsContext(plannerSubSteps)}` : "",
      [
        "Instrucciones:",
        "- Decidí si ARIA responde directo (shouldDelegate=false) o si delega.",
        "- Si delegás, elegí como máximo 3 especialistas de la lista.",
        "- No delegues saludos, meta-consultas sobre el sistema ni coordinación simple.",
        "- task es el pedido reformulado en una frase; reason es tu criterio en una frase.",
      ].join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n"),
    ROUTING_DECISION_SCHEMA,
    {
      agentId: "ARIA",
      maxOutputTokens: CONFIG.plannerTokens,
      timeoutMs: CONFIG.plannerTimeoutMs,
      numCtx: CONFIG.ollamaNumCtx,
      temperature: 0.1,
    }
  );

  const parsedDecision = generation.object ? parsePlannerDecision(generation.object, prompt) : null;

  if (!parsedDecision) {
    return {
      routePlan: heuristicPlan,
      plannerSubSteps,
      plannerReason:
        plannerSubSteps.length > 0
          ? "ARIA abrió triage interno, pero el planner IA no devolvió JSON válido y cayó al enrutado heurístico."
          : "ARIA cayó al enrutado heurístico por falta de planner IA.",
      usedModelPlanner: false,
    };
  }

  return {
    routePlan: {
      entry: "ARIA",
      task: parsedDecision.task,
      delegatedAgents: parsedDecision.shouldDelegate ? parsedDecision.delegatedAgents : [],
    } satisfies RoutePlan,
    plannerSubSteps,
    plannerReason:
      parsedDecision.reason ||
      (parsedDecision.shouldDelegate
        ? "ARIA detectó que conviene abrir especialistas."
        : "ARIA detectó que puede cerrar el pedido en forma directa."),
    usedModelPlanner: true,
  };
}
