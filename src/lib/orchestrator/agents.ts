import { promises as fs } from "node:fs";
import path from "node:path";

import { buildTeamAssignments } from "@/lib/agentTeams";
import { TeamAssignment } from "@/types/agent";

import { AGENT_PROMPTS, CONFIG, getScoutSynthesisMode } from "./config";
import { tryGenerate } from "./providers";
import {
  AgentId,
  AgentStep,
  AgentStructuredOutput,
  SearchResult,
  SpecialistAgentId,
  SubAgentStep,
} from "./types";
import { clip, dedupeStrings, getErrorMessage, stripThoughtTags, withTimeout } from "./text";
import { scoutContextBlock, searchWeb, selectRelevantEvidence, sourceBlock } from "./search";
import {
  buildApexStructuredOutput,
  buildOutputFromSubSteps,
  buildRapidSpecialistResponse,
  buildScoutExtractiveResponse,
  buildScoutOpportunities,
  buildScoutRisks,
  buildScoutStructuredOutput,
  deriveStructuredOutputFromMessage,
  formatStructuredOutput,
} from "./structured-output";

const REPO_FILES = ["src", "package.json", "README.md", "next.config.ts", "tsconfig.json"];

export function buildTeamContext(agentId: AgentId, task: string, teamModeEnabled: boolean) {
  const teamAssignments = teamModeEnabled ? buildTeamAssignments(agentId.toLowerCase(), task) : [];
  const teamContext =
    teamAssignments.length === 0
      ? ""
      : `Agents Team activo para ${agentId}:\n${teamAssignments
          .map((assignment) => `- ${assignment.subAgentName} (${assignment.subAgentRole}): ${assignment.objective}`)
          .join("\n")}`;
  return { teamAssignments, teamContext };
}

export function attachTeamData(step: AgentStep, teamAssignments: TeamAssignment[], teamModeEnabled: boolean) {
  if (!teamModeEnabled || teamAssignments.length === 0) return step;
  return { ...step, teamAssignments, teamModeUsed: true };
}

function attachSubStepMeta(step: SubAgentStep, startedAtMs: number): SubAgentStep {
  return {
    ...step,
    trace: {
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Math.max(1, Date.now() - startedAtMs),
    },
  };
}

function pickSubAgentAssignments(teamAssignments: TeamAssignment[], rapidMode: boolean) {
  if (teamAssignments.length === 0) return [];
  return rapidMode ? teamAssignments.slice(0, Math.min(2, teamAssignments.length)) : teamAssignments;
}

function buildSubStepFallbackMessage(parentAgentId: AgentId, assignment: TeamAssignment, task: string, reason: string) {
  return [
    "Resumen",
    `- ${assignment.subAgentName} cubrió "${assignment.objective}" dentro de "${task}".`,
    "Evidencia",
    `- ${parentAgentId} mantuvo este frente vivo con una guía mínima porque el modelo no respondió.`,
    "Riesgos",
    `- ${reason}.`,
    "Próximos pasos",
    `- Revalidar este frente cuando el modelo vuelva a estar disponible para ${assignment.subAgentName}.`,
  ].join("\n");
}

export function buildSubStepsContext(subSteps: SubAgentStep[]) {
  if (subSteps.length === 0) return "";
  return subSteps
    .map((step) =>
      [
        `${step.subAgentName} (${step.subAgentRole})`,
        `Objetivo: ${step.objective}`,
        `Resumen: ${step.output?.summary ?? clip(step.message.replace(/\s+/g, " "), 180)}`,
        step.output?.risks?.length ? `Riesgos: ${step.output.risks.slice(0, 2).join(" | ")}` : "",
        step.output?.nextSteps?.length ? `Próximos pasos: ${step.output.nextSteps.slice(0, 2).join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

async function runSubAgent(
  parentAgentId: AgentId,
  task: string,
  assignment: TeamAssignment,
  context: string,
  rapidMode: boolean,
  extraInstructions = ""
) {
  const startedAtMs = Date.now();
  const generation = await tryGenerate(
    [
      `Sos ${assignment.subAgentName}, subagente interno de ${parentAgentId}.`,
      `Rol: ${assignment.subAgentRole}.`,
      `Objetivo puntual: ${assignment.objective}.`,
      "Respondé en español y no repitas que sos un modelo.",
    ].join(" "),
    [
      `Tarea principal:\n${task}`,
      `Objetivo puntual:\n${assignment.objective}`,
      context ? `Contexto operativo:\n${context}` : "",
      [
        "Instrucciones:",
        "- Enfocate solo en tu frente y no cierres toda la tarea.",
        "- Respondé con secciones: Resumen, Evidencia, Riesgos y Próximos pasos.",
        `- Mantené la salida ${rapidMode ? "muy corta" : "corta"} y accionable.`,
        extraInstructions,
      ]
        .filter(Boolean)
        .join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n"),
    {
      agentId: parentAgentId,
      maxOutputTokens: CONFIG.subAgentTokens,
      timeoutMs: CONFIG.subAgentTimeoutMs,
      numCtx: CONFIG.ollamaNumCtx,
      temperature: 0.1,
    }
  );

  const resolvedMessage = generation.text
    ? stripThoughtTags(generation.text) || generation.text
    : buildSubStepFallbackMessage(parentAgentId, assignment, task, generation.errors.join(" | ") || "El modelo no respondió");

  const output = deriveStructuredOutputFromMessage(parentAgentId, `${task} · ${assignment.objective}`, resolvedMessage);

  return attachSubStepMeta(
    {
      subAgentId: assignment.subAgentId,
      subAgentName: assignment.subAgentName,
      subAgentRole: assignment.subAgentRole,
      objective: assignment.objective,
      thought: `${assignment.subAgentName} atacó "${assignment.objective}" para ${parentAgentId}.`,
      message: resolvedMessage,
      provider: generation.text ? generation.provider : "stub",
      output,
    },
    startedAtMs
  );
}

export async function runSubAgentBatch(
  parentAgentId: AgentId,
  task: string,
  teamAssignments: TeamAssignment[],
  context: string,
  rapidMode: boolean,
  extraInstructions = ""
) {
  const selectedAssignments = pickSubAgentAssignments(teamAssignments, rapidMode);
  if (selectedAssignments.length === 0) return [];

  const settled = await Promise.allSettled(
    selectedAssignments.map((assignment) =>
      withTimeout(
        runSubAgent(parentAgentId, task, assignment, context, rapidMode, extraInstructions),
        CONFIG.subAgentTimeoutMs + 2000,
        () =>
          attachSubStepMeta(
            {
              subAgentId: assignment.subAgentId,
              subAgentName: assignment.subAgentName,
              subAgentRole: assignment.subAgentRole,
              objective: assignment.objective,
              thought: `${assignment.subAgentName} devolvió fallback por timeout.`,
              message: buildSubStepFallbackMessage(parentAgentId, assignment, task, "Timeout operativo interno"),
              provider: "stub",
              output: deriveStructuredOutputFromMessage(
                parentAgentId,
                `${task} · ${assignment.objective}`,
                buildSubStepFallbackMessage(parentAgentId, assignment, task, "Timeout operativo interno")
              ),
            },
            Date.now()
          )
      )
    )
  );

  return settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const assignment = selectedAssignments[index];
    const fallbackMessage = buildSubStepFallbackMessage(parentAgentId, assignment, task, getErrorMessage(result.reason));
    return attachSubStepMeta(
      {
        subAgentId: assignment.subAgentId,
        subAgentName: assignment.subAgentName,
        subAgentRole: assignment.subAgentRole,
        objective: assignment.objective,
        thought: `${assignment.subAgentName} devolvió fallback por error de ejecución.`,
        message: fallbackMessage,
        provider: "stub",
        output: deriveStructuredOutputFromMessage(parentAgentId, `${task} · ${assignment.objective}`, fallbackMessage),
      },
      Date.now()
    );
  });
}

function buildOperationalThought(agentId: AgentId, task: string, teamAssignments: TeamAssignment[], sourcesCount = 0) {
  if (agentId === "SCOUT") {
    return sourcesCount > 0
      ? `SCOUT relevó ${sourcesCount} fuentes y sintetizó señales sobre "${task}".`
      : `SCOUT activó su squad para investigar "${task}".`;
  }
  if (agentId === "APEX") {
    return `APEX revisó contexto técnico y separó diagnóstico, corrección y validación para "${task}".`;
  }
  if (agentId === "FORGE") {
    return `FORGE dividió "${task}" entre workflow, integración y confiabilidad.`;
  }
  if (agentId === "ARIA") {
    return teamAssignments.length > 0
      ? `${teamAssignments.map((a) => a.subAgentName).join(", ")} coordinaron la recepción y el seguimiento de "${task}".`
      : `ARIA coordinó la solicitud "${task}".`;
  }
  if (teamAssignments.length > 0) {
    return `${agentId} repartió "${task}" entre ${teamAssignments.map((a) => a.subAgentName).join(", ")}.`;
  }
  return `${agentId} procesó "${task}".`;
}

function fallback(agentId: AgentId, task: string, reason: string, sources: SearchResult[] = []): AgentStep {
  if (agentId === "SCOUT") {
    return {
      agentId,
      task,
      provider: "stub",
      thought: `Hice investigación web local, pero no pude sintetizar con un modelo. Motivo: ${reason}`,
      message: [
        `Investigué: ${task}.`,
        sources.length ? `Encontré ${sources.length} fuentes iniciales para validar señales.` : "No encontré resultados útiles en la web.",
        sourceBlock(sources),
      ]
        .filter(Boolean)
        .join("\n\n"),
      sources,
    };
  }
  if (agentId === "APEX") {
    return {
      agentId,
      task,
      provider: "stub",
      thought: `No tuve respuesta del modelo y devuelvo un diagnóstico mínimo. Motivo: ${reason}`,
      message: `Para avanzar con "${task}":\n1. Reproducí el problema.\n2. Identificá archivo, request o estado.\n3. Aplicá el cambio mínimo.\n4. Validá con typecheck, lint y build.`,
    };
  }
  return {
    agentId,
    task,
    provider: "stub",
    thought: `Estoy respondiendo en modo local porque el modelo no estuvo disponible. Motivo: ${reason}`,
    message: `Puedo ayudarte con "${task}". Si hace falta más profundidad, ARIA puede derivarlo sola al especialista correcto sin que tengas que invocar agentes manualmente.`,
  };
}

/**
 * Contexto de streaming opcional. Si está presente, la generación del mensaje
 * visible del lead/especialista emite deltas por onToken. Los subagentes no
 * streamean (serían ruido en la terminal); solo el frente principal de cada
 * agente llega como tokens en vivo.
 */
export interface StreamContext {
  emit: (agentId: AgentId, delta: string) => void;
}

interface RunLeadOptions {
  context?: string;
  sources?: SearchResult[];
  extraInstructions?: string;
  subAgentExtraInstructions?: string;
  rapidMode?: boolean;
  historyContext?: string;
  stream?: StreamContext;
  outputBuilder?: (message: string, subSteps: SubAgentStep[]) => AgentStructuredOutput;
}

async function runLeadWithSubAgents(
  agentId: SpecialistAgentId,
  task: string,
  roster: string,
  teamModeEnabled: boolean,
  options: RunLeadOptions = {}
) {
  const { teamAssignments, teamContext } = buildTeamContext(agentId, task, teamModeEnabled);
  const rapidMode = Boolean(options.rapidMode);
  const operativeContext = [options.context, teamAssignments.length === 0 ? teamContext : ""].filter(Boolean).join("\n\n");
  const subSteps =
    teamAssignments.length > 0
      ? await runSubAgentBatch(
          agentId,
          task,
          teamAssignments,
          [options.context, roster].filter(Boolean).join("\n\n"),
          rapidMode,
          options.subAgentExtraInstructions ?? ""
        )
      : [];
  const subStepsContext = buildSubStepsContext(subSteps);

  const generation = await tryGenerate(
    `${AGENT_PROMPTS[agentId]}${roster}`,
    [
      options.historyContext ?? "",
      `Consulta:\n${task}`,
      operativeContext ? `Contexto:\n${operativeContext}` : "",
      subStepsContext ? `Subagentes internos ejecutados:\n${subStepsContext}` : "",
      [
        "Instrucciones:",
        "- Respondé en español.",
        "- Integrá a tus subagentes como un solo frente coordinado.",
        `- Mantené la salida ${rapidMode ? "corta" : "profunda pero concreta"}.`,
        options.extraInstructions ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n"),
    {
      agentId,
      maxOutputTokens: rapidMode ? CONFIG.rapidTokens : agentId === "APEX" ? CONFIG.apexTokens : CONFIG.leadTokens,
      timeoutMs: rapidMode ? CONFIG.rapidTimeoutMs : agentId === "APEX" ? CONFIG.apexTimeoutMs : CONFIG.defaultTimeoutMs,
      numCtx: CONFIG.ollamaNumCtx,
      temperature: 0.15,
      ...(options.stream ? { onToken: (delta: string) => options.stream!.emit(agentId, delta) } : {}),
    }
  );

  if (!generation.text && subSteps.length === 0) {
    return attachTeamData(fallback(agentId, task, generation.errors.join(" | "), options.sources ?? []), teamAssignments, teamModeEnabled);
  }

  const fallbackOutput = subSteps.length > 0 ? buildOutputFromSubSteps(agentId, task, subSteps, options.sources ?? []) : null;
  const resolvedMessage = generation.text
    ? stripThoughtTags(generation.text) || generation.text
    : [
        formatStructuredOutput(fallbackOutput!),
        agentId === "SCOUT" && (options.sources ?? []).length > 0 ? sourceBlock(options.sources ?? []) : "",
      ]
        .filter(Boolean)
        .join("\n\n");
  const output = generation.text
    ? options.outputBuilder
      ? options.outputBuilder(resolvedMessage, subSteps)
      : deriveStructuredOutputFromMessage(agentId, task, resolvedMessage, options.sources ?? [])
    : fallbackOutput!;

  return attachTeamData(
    {
      agentId,
      task,
      provider: generation.text ? generation.provider : "stub",
      thought:
        subSteps.length > 0
          ? `${agentId} ejecutó ${subSteps.length} subagentes internos${(options.sources ?? []).length ? ` sobre ${(options.sources ?? []).length} señales` : ""} para "${task}".`
          : buildOperationalThought(agentId, task, teamAssignments, (options.sources ?? []).length),
      message: resolvedMessage,
      output,
      ...(generation.usage ? { usage: generation.usage } : {}),
      ...(subSteps.length > 0 ? { subSteps } : {}),
      ...(options.sources?.length ? { sources: options.sources.map(({ title, url, snippet }) => ({ title, url, snippet })) } : {}),
    },
    teamAssignments,
    teamModeEnabled
  );
}

async function repoContext(query: string) {
  const root = process.cwd();
  const terms = [...new Set(query.toLowerCase().match(/[a-z0-9._-]{3,}/g) ?? [])].slice(0, 8);
  if (terms.length === 0) return "";

  const files: string[] = [];
  async function walk(target: string) {
    const stats = await fs.stat(target);
    if (stats.isFile()) {
      files.push(target);
      return;
    }
    const entries = await fs.readdir(target, { withFileTypes: true });
    for (const entry of entries) {
      if (["node_modules", ".next", "public"].includes(entry.name)) continue;
      await walk(path.join(target, entry.name));
    }
  }

  await Promise.all(
    REPO_FILES.map(async (entry) => {
      try {
        await walk(path.join(root, entry));
      } catch {
        return;
      }
    })
  );

  const matches: string[] = [];
  for (const file of files) {
    if (matches.length >= 4) break;
    let content = "";
    try {
      content = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].toLowerCase();
      if (!terms.some((term) => line.includes(term))) continue;
      const start = Math.max(0, index - 1);
      const end = Math.min(lines.length, index + 2);
      matches.push(
        `${path.relative(root, file)}\n${lines
          .slice(start, end)
          .map((item, offset) => `${start + offset + 1}: ${item}`)
          .join("\n")}`
      );
      break;
    }
  }
  return matches.join("\n\n");
}

async function runScout(
  task: string,
  roster: string,
  teamModeEnabled: boolean,
  rapidMode: boolean,
  historyContext: string,
  stream?: StreamContext
) {
  const { teamAssignments } = buildTeamContext("SCOUT", task, teamModeEnabled);

  let results: SearchResult[] = [];
  let searchError = "";
  try {
    results = await searchWeb(task);
  } catch (error) {
    searchError = getErrorMessage(error);
  }

  if (results.length === 0) {
    return attachTeamData(
      fallback("SCOUT", task, searchError || "No se obtuvo contexto web útil", results),
      teamAssignments,
      teamModeEnabled
    );
  }

  const synthesisMode = getScoutSynthesisMode();
  if (synthesisMode === "extractive" && !teamModeEnabled && !rapidMode) {
    const message = buildScoutExtractiveResponse(task, results);
    stream?.emit("SCOUT", message);
    return attachTeamData(
      {
        agentId: "SCOUT",
        task,
        provider: "stub",
        thought: buildOperationalThought("SCOUT", task, teamAssignments, results.length),
        message,
        output: buildScoutStructuredOutput(task, results, message, buildScoutRisks, buildScoutOpportunities),
        sources: results.map(({ title, url, snippet }) => ({ title, url, snippet })),
      },
      teamAssignments,
      teamModeEnabled
    );
  }

  const step = await runLeadWithSubAgents("SCOUT", task, roster, teamModeEnabled, {
    context: scoutContextBlock(results),
    sources: results,
    rapidMode,
    historyContext,
    stream,
    extraInstructions:
      "Respondé con Resumen ejecutivo, Hallazgos clave, Oportunidades, Riesgos y Fuentes. No inventes datos fuera de las señales encontradas.",
    subAgentExtraInstructions:
      "- Basate solo en el contexto web provisto.\n- No inventes fuentes ni URLs.\n- Si algo no está soportado, dejalo como hipótesis.",
    outputBuilder: (message) => buildScoutStructuredOutput(task, results, message, buildScoutRisks, buildScoutOpportunities),
  });

  const message = /fuentes:/i.test(step.message) ? step.message : `${step.message}\n\n${sourceBlock(results)}`.trim();
  return {
    ...step,
    message,
    output: buildScoutStructuredOutput(task, results, message, buildScoutRisks, buildScoutOpportunities),
    sources: results.map(({ title, url, snippet }) => ({ title, url, snippet })),
  };
}

async function runApex(
  task: string,
  roster: string,
  teamModeEnabled: boolean,
  rapidMode: boolean,
  historyContext: string,
  stream?: StreamContext
) {
  const context = (await repoContext(task)) || "No encontré matches claros en el repo actual.";
  const step = await runLeadWithSubAgents("APEX", task, roster, teamModeEnabled, {
    context,
    rapidMode,
    historyContext,
    stream,
    extraInstructions:
      "- Si proponés cambios, nombrá archivos o áreas afectadas.\n- Cerrá con validaciones o riesgos concretos.",
    subAgentExtraInstructions:
      "- Basate solo en el contexto del repo actual.\n- Si aparece un archivo o superficie concreta, nombralo.\n- Priorizá corrección mínima y validación.",
    outputBuilder: (message) => buildApexStructuredOutput(task, context, message),
  });
  return { ...step, output: buildApexStructuredOutput(task, context, step.message) };
}

const SPECIALIST_INSTRUCTIONS: Record<Exclude<AgentId, "ARIA" | "SCOUT" | "APEX">, { extra: string; sub: string }> = {
  VERA: {
    extra: "- Convertí la lectura en señal, riesgo y decisión. Priorizá claridad sobre volumen.",
    sub: "- Aislá señal principal, desviación y lectura ejecutiva.",
  },
  ZION: {
    extra: "- Priorizá trade-offs, secuencia y foco. No abras más frentes de los necesarios.",
    sub: "- Aislá opción, trade-off y orden de decisión.",
  },
  FORGE: {
    extra: "- Bajá la respuesta a trigger, handoff, ejecución y confiabilidad. Priorizá local y gratis cuando aparezca n8n o Docker.",
    sub: "- Aislá workflow, integración y confiabilidad.",
  },
  ECHO: {
    extra: "- Cerrá con una propuesta comunicacional concreta, con una sola CTA fuerte.",
    sub: "- Aislá tono, mensaje y cierre.",
  },
  VOX: {
    extra: "- Transformá el brief en hook, estructura y CTA sin dispersarte.",
    sub: "- Aislá hook, formato y CTA.",
  },
};

async function runSpecialist(
  agentId: Exclude<AgentId, "ARIA" | "SCOUT" | "APEX">,
  task: string,
  roster: string,
  teamModeEnabled: boolean,
  rapidMode: boolean,
  historyContext: string,
  stream?: StreamContext
) {
  if (rapidMode && !teamModeEnabled) {
    const message = buildRapidSpecialistResponse(agentId, task);
    stream?.emit(agentId, message);
    return {
      agentId,
      task,
      provider: "stub" as const,
      thought: `${agentId} respondió en modo rápido local para no bloquear el handoff.`,
      message,
      output: deriveStructuredOutputFromMessage(agentId, task, message),
    };
  }

  return runLeadWithSubAgents(agentId, task, roster, teamModeEnabled, {
    rapidMode,
    historyContext,
    stream,
    extraInstructions: SPECIALIST_INSTRUCTIONS[agentId].extra,
    subAgentExtraInstructions: SPECIALIST_INSTRUCTIONS[agentId].sub,
  });
}

export async function runGeneric(
  agentId: AgentId,
  task: string,
  roster: string,
  teamModeEnabled: boolean,
  context = "",
  extra = "",
  historyContext = "",
  stream?: StreamContext
) {
  const { teamAssignments, teamContext } = buildTeamContext(agentId, task, teamModeEnabled);
  const generation = await tryGenerate(
    `${AGENT_PROMPTS[agentId]}${roster}`,
    [
      historyContext,
      `Consulta:\n${task}`,
      teamContext ? `Contexto de squad:\n${teamContext}` : "",
      context ? `Contexto:\n${context}` : "",
      `Instrucciones:\n- Respondé en español.\n- Sé concreto y accionable.\n- Usá como máximo 5 bullets o un párrafo corto.\n- Si el squad interno está activo, integrá sus frentes como un único equipo coordinado.\n${extra}`.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
    {
      agentId,
      maxOutputTokens: agentId === "ARIA" ? CONFIG.leadTokens : agentId === "APEX" ? CONFIG.apexTokens : CONFIG.leadTokens,
      timeoutMs: agentId === "ARIA" ? CONFIG.defaultTimeoutMs : agentId === "APEX" ? CONFIG.apexTimeoutMs : CONFIG.defaultTimeoutMs,
      numCtx: CONFIG.ollamaNumCtx,
      ...(stream ? { onToken: (delta: string) => stream.emit(agentId, delta) } : {}),
    }
  );

  if (!generation.text) {
    return attachTeamData(fallback(agentId, task, generation.errors.join(" | ")), teamAssignments, teamModeEnabled);
  }

  const resolvedMessage = stripThoughtTags(generation.text) || generation.text;
  const output = deriveStructuredOutputFromMessage(agentId, task, resolvedMessage);
  return attachTeamData(
    {
      agentId,
      task,
      provider: generation.provider,
      thought: buildOperationalThought(agentId, task, teamAssignments),
      message: resolvedMessage,
      output,
      ...(generation.usage ? { usage: generation.usage } : {}),
    },
    teamAssignments,
    teamModeEnabled
  );
}

export async function runAriaDirect(
  task: string,
  roster: string,
  teamModeEnabled: boolean,
  plannerSubSteps: SubAgentStep[] = [],
  historyContext = "",
  stream?: StreamContext
) {
  const planningContext = plannerSubSteps.length > 0 ? `Triage interno de ARIA:\n${buildSubStepsContext(plannerSubSteps)}` : "";
  return runGeneric(
    "ARIA",
    task,
    roster,
    teamModeEnabled,
    planningContext,
    "- Respondé como cerebro principal y secretaria.\n- Si decidiste responder directo, cerrá sin pedir menciones manuales a otros agentes.",
    historyContext,
    stream
  );
}

export async function execute(
  agentId: AgentId,
  task: string,
  roster: string,
  teamModeEnabled: boolean,
  rapidMode: boolean,
  historyContext: string,
  stream?: StreamContext
) {
  if (agentId === "SCOUT") return runScout(task, roster, teamModeEnabled, rapidMode, historyContext, stream);
  if (agentId === "APEX") return runApex(task, roster, teamModeEnabled, rapidMode, historyContext, stream);
  if (agentId === "FORGE" || agentId === "VERA" || agentId === "ZION" || agentId === "ECHO" || agentId === "VOX") {
    return runSpecialist(agentId, task, roster, teamModeEnabled, rapidMode, historyContext, stream);
  }
  if (agentId === "ARIA") return runAriaDirect(task, roster, teamModeEnabled, [], historyContext, stream);
  return runGeneric(agentId, task, roster, teamModeEnabled, "", "", historyContext, stream);
}

export function dedupeRiskNext(values: string[]) {
  return dedupeStrings(values);
}

export { selectRelevantEvidence };
