import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { buildTeamAssignments, getTeamMembersForAgent } from "@/lib/agentTeams";
import { sanitizeOrchestratorPayload } from "@/lib/inputSanitizers";
import { AgentLane, AgentZone, SubAgentStage, TeamAssignment } from "@/types/agent";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AgentId = "SCOUT" | "APEX" | "VERA" | "ZION" | "FORGE" | "ECHO" | "VOX" | "ARIA";
type SpecialistAgentId = Exclude<AgentId, "ARIA">;
type ProviderId = "auto" | "gemini" | "openai" | "groq" | "ollama" | "stub";
type ModelFactory = () => Parameters<typeof generateText>[0]["model"];

interface AgentDescriptor {
  id: string;
  name: string;
  role: string;
}

interface OrchestratorRequest {
  prompt?: unknown;
  currentAgents?: unknown;
  teamMode?: unknown;
}

interface ProviderCandidate {
  id: Exclude<ProviderId, "auto" | "stub">;
  label: string;
  enabled: boolean;
  createModel: ModelFactory;
}

interface GenerationOptions {
  agentId?: AgentId;
  maxOutputTokens?: number;
  timeoutMs?: number;
  temperature?: number;
  numCtx?: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  pageExcerpt?: string;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface AgentEvidence {
  title: string;
  claim: string;
  url?: string;
  snippet?: string;
}

interface AgentArtifact {
  kind: string;
  title: string;
  content: string;
}

interface AgentStructuredOutput {
  summary: string;
  evidence: AgentEvidence[];
  risks: string[];
  nextSteps: string[];
  artifacts: AgentArtifact[];
}

interface AgentExecutionTrace {
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

interface SubAgentStep {
  subAgentId: string;
  subAgentName: string;
  subAgentRole: string;
  objective: string;
  stage?: SubAgentStage;
  dependsOnSubAgentIds?: string[];
  thought: string;
  message: string;
  provider: ProviderId;
  output?: AgentStructuredOutput;
  trace?: AgentExecutionTrace;
}

interface AgentStep {
  agentId: AgentId;
  task: string;
  thought: string;
  message: string;
  provider: ProviderId;
  runId?: string;
  output?: AgentStructuredOutput;
  trace?: AgentExecutionTrace;
  subSteps?: SubAgentStep[];
  teamAssignments?: TeamAssignment[];
  teamModeUsed?: boolean;
  lane?: AgentLane;
  zone?: AgentZone;
  interactionTargetId?: string;
  statusDetail?: string;
  handoffTargets?: string[];
  sources?: SearchResult[];
}

interface RoutePlan {
  entry: "ARIA";
  delegatedAgents: SpecialistAgentId[];
  task: string;
}

interface AriaPlannerDecision {
  task: string;
  shouldDelegate: boolean;
  delegatedAgents: SpecialistAgentId[];
  reason: string;
}

interface PlannedRoute {
  routePlan: RoutePlan;
  plannerSubSteps: SubAgentStep[];
  plannerReason: string;
  usedModelPlanner: boolean;
}

interface RouteTrace {
  runId: string;
  task: string;
  delegatedAgents: SpecialistAgentId[];
  mode: "delegated" | "direct";
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  steps: Array<{
    agentId: AgentId;
    provider: ProviderId;
    durationMs: number;
    lane?: AgentLane;
    statusDetail?: string;
  }>;
}

type RunDecisionSource = "structured_shortcut" | "fast_path" | "planner" | "error";
type PersistedRunStatus = "completed" | "error";

interface PersistedOrchestratorRunRecord {
  runId: string;
  prompt: string;
  task: string;
  entry: "ARIA";
  delegatedAgents: SpecialistAgentId[];
  teamModeEnabled: boolean;
  mode: "delegated" | "direct";
  decisionSource: RunDecisionSource;
  status: PersistedRunStatus;
  createdAt: string;
  completedAt: string;
  totalDurationMs: number;
  trace: RouteTrace;
  steps: AgentStep[];
  error?: string;
}

interface PersistedOrchestratorRunSummary {
  runId: string;
  createdAt: string;
  task: string;
  mode: "delegated" | "direct";
  decisionSource: RunDecisionSource;
  delegatedAgents: SpecialistAgentId[];
  status: PersistedRunStatus;
  totalDurationMs: number;
  stepCount: number;
  summary: string;
}

const AGENT_PROMPTS: Record<AgentId, string> = {
  SCOUT:
    "Sos SCOUT, agente de inteligencia. Investigás en la web, detectás señales, competidores, tendencias, riesgos y oportunidades. Respondé en español.",
  APEX:
    "Sos APEX, agente de ingeniería. Diagnosticás código, arquitectura y bugs con foco en Next.js, React, TypeScript y Node.js. Respondé en español.",
  VERA: "Sos VERA, agente de análisis. Interpretás métricas, datos, cohortes y forecasts. Respondé en español.",
  ZION: "Sos ZION, agente de estrategia. Priorizás decisiones, trade-offs y próximos pasos. Respondé en español.",
  FORGE:
    "Sos FORGE, agente de automatización. Diseñás integraciones, APIs, webhooks, n8n, Docker y workflows confiables. Respondé en español.",
  ECHO: "Sos ECHO, agente de comunicaciones. Redactás mensajes, emails y propuestas listas para usar. Respondé en español.",
  VOX: "Sos VOX, agente de contenido. Creás hooks, guiones, captions y piezas para redes. Respondé en español.",
  ARIA:
    "Sos ARIA, secretaria ejecutiva y cerebro principal del sistema. Clasificás pedidos, coordinás squads internos y derivás al especialista correcto sin perder contexto. Respondé en español.",
};

const NAME_MAP: Record<string, AgentId> = {
  LYRA: "SCOUT",
  SCOUT: "SCOUT",
  APEX: "APEX",
  VERA: "VERA",
  ZION: "ZION",
  FORGE: "FORGE",
  ECHO: "ECHO",
  VOX: "VOX",
  ARIA: "ARIA",
  PULSE: "VOX",
};

const ROUTING_RULES: Array<{ agentId: SpecialistAgentId; patterns: RegExp[] }> = [
  {
    agentId: "SCOUT",
    patterns: [
      /\binvestig/i,
      /\bweb\b/i,
      /\binternet\b/i,
      /\bfuentes?\b/i,
      /\bmercado\b/i,
      /\bcompet/i,
      /\btendenc/i,
      /\bbenchmark/i,
      /\bicp\b/i,
      /\bnicho\b/i,
      /\bsegmento\b/i,
    ],
  },
  {
    agentId: "APEX",
    patterns: [/\bcodigo\b/i, /\bc[oó]digo\b/i, /\brepo\b/i, /\bbug\b/i, /\berror\b/i, /\bbackend\b/i, /\bfrontend\b/i, /\bfix\b/i, /\bdebug\b/i, /\btest\b/i],
  },
  {
    agentId: "VERA",
    patterns: [/\bmetric/i, /\bm[eé]trica/i, /\bdatos?\b/i, /\ban[aá]lis/i, /\bkpi\b/i, /\bforecast\b/i, /\bconversion/i, /\bcohort/i, /\bchurn\b/i],
  },
  {
    agentId: "ZION",
    patterns: [
      /\bestrateg/i,
      /\broadmap\b/i,
      /\bpriori/i,
      /\bnegocio\b/i,
      /\bdecision/i,
      /\btrade/i,
      /\bplan\b/i,
      /\bvender\b/i,
      /\bventa\b/i,
      /\bpitch\b/i,
      /\boferta\b/i,
      /\balpha\b/i,
      /\bmvp\b/i,
      /\bposicion/i,
      /\bdemo\b/i,
      /\bpricing\b/i,
    ],
  },
  {
    agentId: "FORGE",
    patterns: [/\bautomat/i, /\bworkflow\b/i, /\bwebhook\b/i, /\bintegr/i, /\bn8n\b/i, /\bdocker\b/i, /\bcron\b/i, /\btrigger\b/i, /\bpipeline\b/i],
  },
  {
    agentId: "ECHO",
    patterns: [
      /\bemail\b/i,
      /\bmail\b/i,
      /\bmensaje/i,
      /\bwhatsapp\b/i,
      /\bcliente\b/i,
      /\brespuesta\b/i,
      /\bfollow/i,
      /\bpropuesta\b/i,
      /\bpitch\b/i,
      /\bcopy\b/i,
      /\bventa\b/i,
      /\boferta\b/i,
    ],
  },
  {
    agentId: "VOX",
    patterns: [/\bcontenido\b/i, /\breel\b/i, /\bpost\b/i, /\bguion\b/i, /\bcaption\b/i, /\bcopy\b/i, /\blinkedin\b/i, /\binstagram\b/i, /\btiktok\b/i, /\bcarrusel\b/i],
  },
];

const COMMERCIAL_INTENT_PATTERN =
  /\b(vender|venta|pitch|oferta|posicionamiento|posicionar|demo|gtm|go to market|pricing|precio)\b/i;
const COMMERCIAL_DISCOVERY_PATTERN = /\b(mercado|competencia|competidor|benchmark|icp|segmento|nicho)\b/i;
const ALPHA_READINESS_PATTERN = /\b(alpha|mvp|piloto|funcional|funcione|usable|estable|beta)\b/i;
const OPERATIONAL_EXECUTION_PATTERN = /\b(n8n|workflow|automatizacion|automatizar|proceso|pipeline|operacion)\b/i;

const REPO_FILES = ["src", "package.json", "README.md", "next.config.ts", "tsconfig.json"];
const SEARCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36 Office-AI/1.0";
const SHORT_GREETING_SET = new Set(["hola", "holi", "buenas", "hello", "hey", "buen dia", "buen dia aria", "buen dia equipo"]);
const SEARCH_STOPWORDS = new Set([
  "como",
  "qué",
  "que",
  "para",
  "sobre",
  "del",
  "de",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "por",
  "favor",
  "investigue",
  "investigar",
  "investiga",
  "investigacion",
  "necesito",
  "quiero",
  "decile",
  "decilele",
  "decilel",
  "pedile",
  "delegale",
  "asignale",
  "dile",
  "decile",
  "que",
  "aria",
  "scout",
]);
const SCOUT_TRANSLATIONS = [
  { pattern: /\borquestador(?:es)? de agentes de ia\b/gi, replacement: "AI agent orchestration" },
  { pattern: /\bagentes? de ia\b/gi, replacement: "AI agents" },
  { pattern: /\bescalar\b/gi, replacement: "scaling" },
  { pattern: /\bescalabilidad\b/gi, replacement: "scalability" },
  { pattern: /\bcomo\b/gi, replacement: "how to" },
  { pattern: /\bconsultas\b/gi, replacement: "orchestration" },
];

const AGENT_DIRECTORY: Record<AgentId, { role: string; summary: string }> = {
  ARIA: {
    role: "Secretaria IA y cerebro principal",
    summary: "recibe pedidos, clasifica intenciones y coordina squads internos",
  },
  SCOUT: {
    role: "Agente de Inteligencia",
    summary: "investiga en web, contrasta fuentes y encuentra oportunidades",
  },
  APEX: {
    role: "Agente de Ingeniería",
    summary: "diagnostica código, bugs y arquitectura del proyecto",
  },
  VERA: {
    role: "Agente de Análisis",
    summary: "lee métricas, variaciones y señales de negocio",
  },
  ZION: {
    role: "Agente de Estrategia",
    summary: "prioriza decisiones y arma planes de acción",
  },
  FORGE: {
    role: "Agente de Automatización",
    summary: "diseña workflows, integraciones y ejecuciones operativas",
  },
  ECHO: {
    role: "Agente de Comunicaciones",
    summary: "redacta mensajes, emails y respuestas comerciales",
  },
  VOX: {
    role: "Agente de Contenido",
    summary: "crea hooks, guiones y piezas para redes",
  },
};

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const scoutSearchCache = new Map<string, { expiresAt: number; results: SearchResult[] }>();
const ORCHESTRATOR_RUNS_DIR = path.join(process.cwd(), ".office-ai", "orchestrator-runs");
const MAX_STORED_ORCHESTRATOR_RUNS = 48;

const SECTION_BUCKETS = {
  summary: new Set([
    "resumen",
    "resumen ejecutivo",
    "diagnostico tecnico",
    "diagnóstico técnico",
    "decision ejecutiva",
    "decisión ejecutiva",
    "workflow operativo fragmentado",
    "lectura analitica",
    "lectura analítica",
    "marco de comunicacion",
    "marco de comunicación",
    "direccion de contenido",
    "dirección de contenido",
    "presentacion del sistema",
    "presentación del sistema",
    "saludo inicial",
    "cierre coordinado",
  ]),
  evidence: new Set(["evidencia", "hallazgos clave", "superficie detectada", "fuentes"]),
  risks: new Set(["riesgos", "riesgo"]),
  nextSteps: new Set([
    "proximos pasos",
    "próximos pasos",
    "oportunidades",
    "proximo paso",
    "próximo paso",
    "prioridades",
    "chequeos",
    "reglas",
    "borrador base",
    "salida sugerida",
  ]),
};

function createRunId() {
  return `run-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function cleanStructuredLine(line: string) {
  return line
    .replace(/^[-*•]\s*/u, "")
    .replace(/^\[\d+\]\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getSectionBucket(line: string): keyof typeof SECTION_BUCKETS | null {
  const normalized = normalizePlainText(line).replace(/[:\s]+$/g, "");
  if (SECTION_BUCKETS.summary.has(normalized)) return "summary";
  if (SECTION_BUCKETS.evidence.has(normalized)) return "evidence";
  if (SECTION_BUCKETS.risks.has(normalized)) return "risks";
  if (SECTION_BUCKETS.nextSteps.has(normalized)) return "nextSteps";
  return null;
}

function parseStructuredMessage(message: string) {
  const sections: Record<keyof typeof SECTION_BUCKETS | "misc", string[]> = {
    summary: [],
    evidence: [],
    risks: [],
    nextSteps: [],
    misc: [],
  };

  let activeBucket: keyof typeof SECTION_BUCKETS | "misc" = "misc";

  for (const rawLine of message.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const bucket = getSectionBucket(line);
    if (bucket) {
      activeBucket = bucket;
      continue;
    }

    const cleaned = cleanStructuredLine(line);
    if (!cleaned) continue;
    sections[activeBucket].push(cleaned);
  }

  return sections;
}

function buildDefaultRisks(agentId: AgentId, task: string) {
  if (agentId === "SCOUT") {
    return [`Validar que las señales relevadas para "${task}" sigan siendo relevantes y comparables.`];
  }

  if (agentId === "APEX") {
    return [`Si no se prueba el cambio mínimo para "${task}", el fix puede abrir regresiones.`];
  }

  if (agentId === "FORGE") {
    return [`Sin límites operativos, "${task}" puede crecer de un workflow simple a una automatización frágil.`];
  }

  if (agentId === "ARIA") {
    return [`Si faltan outputs estructurados, ARIA podría cerrar "${task}" con poca trazabilidad.`];
  }

  return [`Si el alcance de "${task}" no se recorta, el agente puede responder demasiado general.`];
}

function buildDefaultNextSteps(agentId: AgentId, task: string) {
  if (agentId === "SCOUT") {
    return [`Contrastar 2 o 3 hallazgos críticos antes de mover "${task}" a ejecución.`];
  }

  if (agentId === "APEX") {
    return [`Aplicar el cambio mínimo para "${task}" y validar con typecheck, lint y build.`];
  }

  if (agentId === "FORGE") {
    return [`Bajar "${task}" a un flujo corto en n8n con trigger, handoff y cierre trazable.`];
  }

  if (agentId === "ECHO") {
    return [`Convertir "${task}" en un mensaje con una sola CTA y una promesa concreta.`];
  }

  if (agentId === "ZION") {
    return [`Elegir un frente principal para "${task}" y dejar el resto como backlog.`];
  }

  return [`Definir el siguiente paso más corto y medible para "${task}".`];
}

function formatStructuredOutput(output: AgentStructuredOutput) {
  const lines = ["Resumen", `- ${output.summary}`];

  if (output.evidence.length > 0) {
    lines.push("Evidencia");
    lines.push(
      ...output.evidence.slice(0, 3).map((item) => `- ${item.claim}${item.url ? ` (${item.url})` : ""}`)
    );
  }

  if (output.risks.length > 0) {
    lines.push("Riesgos");
    lines.push(...output.risks.slice(0, 3).map((item) => `- ${item}`));
  }

  if (output.nextSteps.length > 0) {
    lines.push("Próximos pasos");
    lines.push(...output.nextSteps.slice(0, 3).map((item) => `- ${item}`));
  }

  if (output.artifacts.length > 0) {
    lines.push("Artifacts");
    lines.push(...output.artifacts.slice(0, 2).map((item) => `- ${item.title}`));
  }

  return lines.join("\n");
}

function deriveStructuredOutputFromMessage(
  agentId: AgentId,
  task: string,
  message: string,
  sources: SearchResult[] = []
): AgentStructuredOutput {
  const sections = parseStructuredMessage(message);
  const summary =
    sections.summary[0] ??
    sections.evidence[0] ??
    sections.misc[0] ??
    `No hubo un resumen estructurado para "${task}".`;

  const evidenceFromMessage = dedupeStrings([...sections.evidence, ...sections.misc.slice(1, 3)]).slice(0, 3).map((item, index) => ({
    title: `${agentId} evidence ${index + 1}`,
    claim: item,
  }));

  const evidence =
    sources.length > 0
      ? sources.slice(0, 4).map((source) => ({
          title: source.title,
          url: source.url,
          claim: selectRelevantEvidence(source, task),
          snippet: source.snippet || source.pageExcerpt,
        }))
      : evidenceFromMessage;

  const risks = dedupeStrings(sections.risks).slice(0, 3);
  const nextSteps = dedupeStrings(sections.nextSteps).slice(0, 3);

  return {
    summary,
    evidence: evidence.slice(0, 4),
    risks: risks.length > 0 ? risks : buildDefaultRisks(agentId, task),
    nextSteps: nextSteps.length > 0 ? nextSteps : buildDefaultNextSteps(agentId, task),
    artifacts: [
      {
        kind: agentId === "ECHO" ? "draft" : "brief",
        title: `${agentId} output`,
        content: clip(message.replace(/\s+/g, " "), 320),
      },
    ],
  };
}

function buildScoutStructuredOutput(task: string, results: SearchResult[], message: string): AgentStructuredOutput {
  const executiveLine = message
    .split(/\r?\n/)
    .map((line) => cleanStructuredLine(line))
    .find((line) => line && !/^(Resumen ejecutivo|Hallazgos clave|Oportunidades|Riesgos|Fuentes)$/i.test(line));

  return {
    summary: executiveLine || `SCOUT reunió señales web útiles para "${task}".`,
    evidence: results.slice(0, 4).map((result) => ({
      title: result.title,
      url: result.url,
      claim: selectRelevantEvidence(result, task),
      snippet: result.snippet || result.pageExcerpt,
    })),
    risks: buildScoutRisks(task, results),
    nextSteps: buildScoutOpportunities(task, results),
    artifacts: [
      {
        kind: "research-brief",
        title: "Scout research brief",
        content: clip(message.replace(/\s+/g, " "), 320),
      },
    ],
  };
}

function buildApexStructuredOutput(task: string, context: string, message: string): AgentStructuredOutput {
  const snippets = context
    .split("\n\n")
    .filter(Boolean)
    .slice(0, 3)
    .map((chunk, index) => ({
      title: `Repo snippet ${index + 1}`,
      claim: clip(chunk.replace(/\s+/g, " "), 220),
    }));

  return {
    summary: `APEX revisó el repo para "${task}" y detectó la superficie mínima a tocar.`,
    evidence: snippets.length > 0 ? snippets : [{ title: "Repo scan", claim: "No encontré archivos obvios en el repo actual para esta consulta." }],
    risks: [`Sin validar el cambio mínimo para "${task}", el fix puede quedar incompleto.`],
    nextSteps: [`Aplicar el cambio mínimo para "${task}" y correr typecheck, lint y build.`],
    artifacts: [
      {
        kind: "technical-note",
        title: "Apex technical note",
        content: clip(message.replace(/\s+/g, " "), 320),
      },
    ],
  };
}

function buildAriaStructuredOutput(task: string, steps: AgentStep[]): AgentStructuredOutput {
  const specialists = steps.filter((step) => step.agentId !== "ARIA");

  if (specialists.length === 0) {
    return {
      summary: `ARIA no recibió outputs especialistas suficientes para cerrar "${task}".`,
      evidence: [],
      risks: [`Faltan resultados especialistas para cerrar "${task}" con confianza.`],
      nextSteps: [`Relanzar "${task}" con uno o dos agentes principales más definidos.`],
      artifacts: [],
    };
  }

  const evidence = specialists.flatMap((step) =>
    (step.output?.evidence ?? []).slice(0, 1).map((item) => ({
      title: `${step.agentId}: ${item.title}`,
      claim: item.claim,
      url: item.url,
      snippet: item.snippet,
    }))
  );
  const risks = dedupeStrings(specialists.flatMap((step) => step.output?.risks ?? [])).slice(0, 4);
  const nextSteps = dedupeStrings(specialists.flatMap((step) => step.output?.nextSteps ?? [])).slice(0, 4);
  const artifacts = specialists.flatMap((step) =>
    (step.output?.artifacts ?? []).slice(0, 1).map((item) => ({
      kind: item.kind,
      title: `${step.agentId}: ${item.title}`,
      content: item.content,
    }))
  );

  return {
    summary:
      specialists.length === 1
        ? `${specialists[0].agentId} devolvió un output estructurado para "${task}" y ARIA solo consolidó el cierre.`
        : `ARIA consolidó ${specialists.length} outputs especialistas para "${task}" sin inventar evidencia nueva.`,
    evidence: evidence.slice(0, 4),
    risks: risks.length > 0 ? risks : [`No hubo riesgos explícitos, así que conviene revisar el cierre antes de ejecutar "${task}".`],
    nextSteps: nextSteps.length > 0 ? nextSteps : [`Elegir el siguiente paso más corto para "${task}" y pedir aprobación humana antes de ejecutar.`],
    artifacts,
  };
}

function attachStepMeta(step: AgentStep, runId: string, startedAtMs: number): AgentStep {
  const completedAt = new Date().toISOString();
  const output = step.output ?? deriveStructuredOutputFromMessage(step.agentId, step.task, step.message, step.sources ?? []);

  return {
    ...step,
    runId,
    output,
    trace: {
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt,
      durationMs: Math.max(1, Date.now() - startedAtMs),
    },
  };
}

function buildRouteTrace(runId: string, routePlan: RoutePlan, routeStartedAtMs: number, steps: AgentStep[]): RouteTrace {
  return {
    runId,
    task: routePlan.task,
    delegatedAgents: routePlan.delegatedAgents,
    mode: routePlan.delegatedAgents.length > 0 ? "delegated" : "direct",
    startedAt: new Date(routeStartedAtMs).toISOString(),
    completedAt: new Date().toISOString(),
    totalDurationMs: Math.max(1, Date.now() - routeStartedAtMs),
    steps: steps.map((step) => ({
      agentId: step.agentId,
      provider: step.provider,
      durationMs: step.trace?.durationMs ?? 0,
      lane: step.lane,
      statusDetail: step.statusDetail,
    })),
  };
}

function buildRunSummary(record: PersistedOrchestratorRunRecord): PersistedOrchestratorRunSummary {
  const closingStep = [...record.steps].reverse().find((step) => step.agentId === "ARIA") ?? record.steps[record.steps.length - 1];
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

async function ensureOrchestratorRunsDir() {
  await fs.mkdir(ORCHESTRATOR_RUNS_DIR, { recursive: true });
}

async function trimStoredOrchestratorRuns() {
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
    .slice(MAX_STORED_ORCHESTRATOR_RUNS);

  await Promise.all(staleFiles.map((file) => fs.rm(file.filePath, { force: true })));
}

async function persistOrchestratorRun(record: PersistedOrchestratorRunRecord) {
  try {
    await ensureOrchestratorRunsDir();
    await fs.writeFile(
      path.join(ORCHESTRATOR_RUNS_DIR, `${record.runId}.json`),
      JSON.stringify(record, null, 2),
      "utf8"
    );
    await trimStoredOrchestratorRuns();
  } catch (error) {
    console.error("No pude persistir la corrida del orquestador:", error);
  }
}

async function listRecentOrchestratorRuns(limit: number) {
  try {
    await ensureOrchestratorRunsDir();
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

async function persistObservedRun(params: {
  runId: string;
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
  const { runId, prompt, routePlan, teamModeEnabled, decisionSource, status, routeStartedAtMs, steps, trace, error } = params;

  await persistOrchestratorRun({
    runId,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido";
}

function normalizeAgentId(value: string | null | undefined): AgentId | null {
  if (!value) return null;
  return NAME_MAP[value.replace(/^@/, "").trim().toUpperCase()] ?? null;
}

function normalizePlainText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(value: string, max = 320) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trim()}…`;
}

function stripThoughtTags(text: string) {
  return text.replace(/<THOUGHT>[\s\S]*?<\/THOUGHT>/gi, "").trim();
}

function getRequestedProvider(): ProviderId {
  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();
  return requested === "gemini" ||
    requested === "openai" ||
    requested === "groq" ||
    requested === "ollama" ||
    requested === "stub"
    ? requested
    : "auto";
}

function isTeamModeEnabled(value: unknown) {
  return typeof value === "boolean" ? value : true;
}

function getOllamaBaseUrl() {
  const raw = process.env.OLLAMA_URL?.trim() || "http://127.0.0.1:11434/v1";
  return raw.endsWith("/v1") ? raw : `${raw.replace(/\/+$/, "")}/v1`;
}

function getOllamaNativeChatUrl() {
  return `${getOllamaBaseUrl().replace(/\/v1$/, "")}/api/chat`;
}

function getEnvInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getScoutSynthesisMode() {
  const raw = process.env.SCOUT_SYNTHESIS_MODE?.trim().toLowerCase();
  return raw === "model" || raw === "hybrid" || raw === "extractive" ? raw : "extractive";
}

function getOllamaModel(agentId?: AgentId) {
  if (agentId) {
    const perAgent = process.env[`OLLAMA_MODEL_${agentId}`]?.trim();
    if (perAgent) return perAgent;
  }

  if (agentId === "ARIA") {
    return (
      process.env.OLLAMA_MODEL_ROUTER?.trim() ||
      process.env.OLLAMA_MODEL_FAST?.trim() ||
      process.env.OLLAMA_MODEL?.trim() ||
      "llama3.2:3b"
    );
  }

  return (
    process.env.OLLAMA_MODEL_SPECIALIST?.trim() ||
    process.env.OLLAMA_MODEL_FAST?.trim() ||
    process.env.OLLAMA_MODEL?.trim() ||
    "llama3.2:3b"
  );
}

function getProviders(): ProviderCandidate[] {
  return [
    {
      id: "openai",
      label: "OpenAI",
      enabled: Boolean(process.env.OPENAI_API_KEY),
      createModel: () => createOpenAI({ apiKey: process.env.OPENAI_API_KEY })("gpt-4o-mini"),
    },
    {
      id: "groq",
      label: "Groq",
      enabled: Boolean(process.env.GROQ_API_KEY),
      createModel: () =>
        createOpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: process.env.GROQ_API_KEY })(
          "llama-3.3-70b-versatile"
        ),
    },
    {
      id: "gemini",
      label: "Gemini",
      enabled: Boolean(process.env.GEMINI_API_KEY),
      createModel: () => createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })("gemini-2.0-flash"),
    },
    {
      id: "ollama",
      label: "Ollama",
      enabled: Boolean(process.env.OLLAMA_URL) || getRequestedProvider() === "ollama",
      createModel: () =>
        createOpenAI({ baseURL: getOllamaBaseUrl(), apiKey: "ollama" }).chat(process.env.OLLAMA_MODEL || "qwen2.5:7b"),
    },
  ];
}

function getStructuredAriaResponse(prompt: string, teamModeEnabled: boolean) {
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

function extractMentionedAgents(prompt: string) {
  const mentioned = [...prompt.matchAll(/@(\w+)/gi)]
    .map((item) => normalizeAgentId(item[1]))
    .filter((item): item is SpecialistAgentId => Boolean(item && item !== "ARIA"));

  return [...new Set(mentioned)].slice(0, 3);
}

function stripLeadingMention(prompt: string) {
  return prompt.replace(/^@\w+\s*/i, "").trim();
}

function extractDelegatedTask(prompt: string, delegatedAgents: AgentId[]) {
  let cleaned = stripLeadingMention(prompt);

  cleaned = cleaned.replace(/^(decile|decile|decile|pedile|delegale|asignale|dile|activa|convoca|suma|pone)\s+/i, "");
  for (const delegated of delegatedAgents) {
    cleaned = cleaned
      .replace(new RegExp(`\\b(a\\s+)?@${delegated.toLowerCase()}\\b`, "ig"), " ")
      .replace(new RegExp(`@${delegated.toLowerCase()}\\b`, "ig"), " ");
  }

  cleaned = cleaned.replace(/\s+y\s+(?=que\b)/gi, " ").replace(/\s+/g, " ").trim();

  let previous = "";
  while (cleaned && cleaned !== previous) {
    previous = cleaned;
    cleaned = cleaned
      .replace(/^[,.;:-]+\s*/g, "")
      .replace(/^(a|al|la|los|las|que|para|por favor|porfa|y|e)\s+/i, "")
      .trim();
  }

  return cleaned || stripLeadingMention(prompt) || prompt.trim();
}

function inferDelegatedAgents(prompt: string) {
  const normalized = normalizePlainText(stripLeadingMention(prompt) || prompt);
  const hasMultiCue = /\b(y|ademas|tambien|junto|suma|mas|con)\b/.test(normalized);
  const scored = ROUTING_RULES.map((rule) => ({
    agentId: rule.agentId,
    score: rule.patterns.reduce((total, pattern) => total + (pattern.test(normalized) ? 1 : 0), 0),
  }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scored.length === 0) {
    return [];
  }

  const selected: SpecialistAgentId[] = [scored[0].agentId];
  if (scored[1] && (scored[1].score >= 2 || (hasMultiCue && scored[1].score >= 1))) {
    selected.push(scored[1].agentId);
  }
  if (scored[2] && hasMultiCue && scored[2].score >= 1) {
    selected.push(scored[2].agentId);
  }

  return selected.slice(0, 3);
}

function inferCommercialAgents(prompt: string) {
  const normalized = normalizePlainText(stripLeadingMention(prompt) || prompt);
  if (!COMMERCIAL_INTENT_PATTERN.test(normalized)) {
    return [];
  }

  const selected: SpecialistAgentId[] = [];

  if (COMMERCIAL_DISCOVERY_PATTERN.test(normalized)) {
    selected.push("SCOUT");
  }

  selected.push("ZION");

  if (OPERATIONAL_EXECUTION_PATTERN.test(normalized)) {
    selected.push("FORGE");
  }

  selected.push("ECHO");

  return [...new Set(selected)].slice(0, 3);
}

function inferAlphaReadinessAgents(prompt: string) {
  const normalized = normalizePlainText(stripLeadingMention(prompt) || prompt);
  if (!ALPHA_READINESS_PATTERN.test(normalized)) {
    return [];
  }

  if (!OPERATIONAL_EXECUTION_PATTERN.test(normalized) && !/\b(funcional|funcione|usable|estable)\b/i.test(normalized)) {
    return [];
  }

  const selected: SpecialistAgentId[] = [];

  if (OPERATIONAL_EXECUTION_PATTERN.test(normalized)) {
    selected.push("FORGE");
  }

  selected.push("APEX");
  selected.push("ZION");

  return [...new Set(selected)].slice(0, 3);
}

function plan(prompt: string): RoutePlan {
  const explicitlyMentioned = extractMentionedAgents(prompt);
  const commercialAgents = inferCommercialAgents(prompt);
  const alphaReadinessAgents = inferAlphaReadinessAgents(prompt);
  const delegatedAgents =
    explicitlyMentioned.length > 0
      ? explicitlyMentioned
      : commercialAgents.length > 0
        ? commercialAgents
        : alphaReadinessAgents.length > 0
          ? alphaReadinessAgents
          : inferDelegatedAgents(prompt);
  const task = delegatedAgents.length > 0 ? extractDelegatedTask(prompt, delegatedAgents) : stripLeadingMention(prompt) || prompt.trim();

  return {
    entry: "ARIA",
    delegatedAgents,
    task,
  };
}

function joinAgentMentions(agentIds: SpecialistAgentId[]) {
  if (agentIds.length === 0) return "";
  if (agentIds.length === 1) return agentIds[0];
  if (agentIds.length === 2) return `${agentIds[0]} y ${agentIds[1]}`;
  return `${agentIds[0]}, ${agentIds[1]} y ${agentIds[2]}`;
}

function getLeadLane(index: number): AgentLane {
  if (index === 0) return "alpha";
  if (index === 1) return "beta";
  return "gamma";
}

function getLeadStatusLabel(agentId: SpecialistAgentId, lane: AgentLane) {
  return `LANE ${lane.toUpperCase()} · ${agentId}`;
}

function attachCoordinationData(
  step: AgentStep,
  coordination: Partial<Pick<AgentStep, "lane" | "zone" | "interactionTargetId" | "statusDetail" | "handoffTargets">>
) {
  return {
    ...step,
    ...coordination,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => T): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(onTimeout()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function rosterContext(currentAgents: AgentDescriptor[]) {
  if (currentAgents.length === 0) return "";
  return `\n\nAgentes visibles:\n${currentAgents.map((agent) => `- ${agent.name} (${agent.id}): ${agent.role}`).join("\n")}`;
}

function buildTeamContext(agentId: AgentId, task: string, teamModeEnabled: boolean) {
  const teamAssignments = teamModeEnabled ? buildTeamAssignments(agentId.toLowerCase(), task) : [];
  const teamContext =
    teamAssignments.length === 0
      ? ""
      : `Agents Team activo para ${agentId}:\n${teamAssignments
          .map((assignment) => `- ${assignment.subAgentName} (${assignment.subAgentRole}): ${assignment.objective}`)
          .join("\n")}`;
  return { teamAssignments, teamContext };
}

function attachTeamData(step: AgentStep, teamAssignments: TeamAssignment[], teamModeEnabled: boolean) {
  if (!teamModeEnabled || teamAssignments.length === 0) return step;
  return { ...step, teamAssignments, teamModeUsed: true };
}

function attachSubStepMeta(step: SubAgentStep, startedAtMs: number): SubAgentStep {
  const completedAt = new Date().toISOString();
  return {
    ...step,
    trace: {
      startedAt: new Date(startedAtMs).toISOString(),
      completedAt,
      durationMs: Math.max(1, Date.now() - startedAtMs),
    },
  };
}

const SUB_AGENT_STAGE_ORDER: Record<SubAgentStage, number> = {
  intake: 0,
  discover: 1,
  shape: 2,
  synthesize: 3,
  validate: 4,
  followup: 5,
};

function getSubAgentStageLabel(stage?: SubAgentStage) {
  if (stage === "intake") return "intake";
  if (stage === "discover") return "discover";
  if (stage === "shape") return "shape";
  if (stage === "synthesize") return "synthesize";
  if (stage === "validate") return "validate";
  if (stage === "followup") return "followup";
  return "task";
}

function scoreSubAgentAssignment(assignment: TeamAssignment, task: string) {
  const normalizedTask = normalizePlainText(`${task} ${assignment.objective}`);
  let score = (assignment.priority ?? 1) * 10;

  for (const hint of assignment.activationHints ?? []) {
    const normalizedHint = normalizePlainText(hint);
    if (normalizedHint && normalizedTask.includes(normalizedHint)) {
      score += 8;
    }
  }

  if ((assignment.stage === "discover" || assignment.stage === "intake") && /\b(investig|hallaz|origen|buscar|clasific|triage)\b/.test(normalizedTask)) {
    score += 5;
  }
  if ((assignment.stage === "shape" || assignment.stage === "synthesize") && /\b(plan|workflow|propuesta|mensaje|guion|roadmap|fix|correccion)\b/.test(normalizedTask)) {
    score += 5;
  }
  if ((assignment.stage === "validate" || assignment.stage === "followup") && /\b(valid|riesgo|deploy|regresi|seguimiento|siguiente paso|qa)\b/.test(normalizedTask)) {
    score += 6;
  }

  return score;
}

function sortAssignmentsForExecution(assignments: TeamAssignment[], task: string) {
  return [...assignments].sort((left, right) => {
    const stageDelta = (SUB_AGENT_STAGE_ORDER[left.stage ?? "shape"] ?? 99) - (SUB_AGENT_STAGE_ORDER[right.stage ?? "shape"] ?? 99);
    if (stageDelta !== 0) return stageDelta;

    const scoreDelta = scoreSubAgentAssignment(right, task) - scoreSubAgentAssignment(left, task);
    if (scoreDelta !== 0) return scoreDelta;

    return (right.priority ?? 0) - (left.priority ?? 0);
  });
}

function pickSubAgentAssignments(teamAssignments: TeamAssignment[], task: string, rapidMode: boolean) {
  if (teamAssignments.length === 0) return [];

  const selectedIds = new Set<string>();
  const lookup = new Map(teamAssignments.map((assignment) => [assignment.subAgentId, assignment]));
  const scored = [...teamAssignments].sort((left, right) => scoreSubAgentAssignment(right, task) - scoreSubAgentAssignment(left, task));
  const discoverAnchor =
    scored.find((assignment) => assignment.stage === "intake" || assignment.stage === "discover") ?? scored[0];
  const closer =
    [...scored].reverse().find((assignment) =>
      assignment.stage === "synthesize" || assignment.stage === "validate" || assignment.stage === "followup"
    ) ?? scored[scored.length - 1];

  const includeAssignment = (assignment: TeamAssignment | undefined) => {
    if (!assignment || selectedIds.has(assignment.subAgentId)) return;

    for (const dependencyId of assignment.dependsOnSubAgentIds ?? []) {
      includeAssignment(lookup.get(dependencyId));
    }

    selectedIds.add(assignment.subAgentId);
  };

  includeAssignment(discoverAnchor);

  const targetCount = rapidMode ? Math.min(2, teamAssignments.length) : teamAssignments.length;
  for (const assignment of scored) {
    includeAssignment(assignment);
    if (selectedIds.size >= targetCount) break;
  }

  includeAssignment(closer);

  return sortAssignmentsForExecution(
    teamAssignments.filter((assignment) => selectedIds.has(assignment.subAgentId)),
    task
  );
}

function buildSubAgentPlanContext(assignments: TeamAssignment[]) {
  if (assignments.length === 0) return "";

  return assignments
    .map((assignment, index) => {
      const dependencyBlock =
        assignment.dependsOnSubAgentIds && assignment.dependsOnSubAgentIds.length > 0
          ? ` | depende de ${assignment.dependsOnSubAgentIds.join(", ")}`
          : "";
      return `${index + 1}. [${getSubAgentStageLabel(assignment.stage)}] ${assignment.subAgentName}: ${assignment.objective}${dependencyBlock}`;
    })
    .join("\n");
}

function buildDependentSubStepsContext(subSteps: SubAgentStep[], assignment: TeamAssignment) {
  const dependencyIds = assignment.dependsOnSubAgentIds ?? [];
  const relevantSteps =
    dependencyIds.length > 0 ? subSteps.filter((step) => dependencyIds.includes(step.subAgentId)) : subSteps;
  return buildSubStepsContext(relevantSteps.slice(-3));
}

function buildStageExecutionGroups(assignments: TeamAssignment[], task: string) {
  const orderedAssignments = sortAssignmentsForExecution(assignments, task);
  const groups = new Map<number, TeamAssignment[]>();

  for (const assignment of orderedAssignments) {
    const stageKey = SUB_AGENT_STAGE_ORDER[assignment.stage ?? "shape"] ?? 99;
    const currentGroup = groups.get(stageKey) ?? [];
    currentGroup.push(assignment);
    groups.set(stageKey, currentGroup);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, assignmentsInStage]) => assignmentsInStage);
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

function buildSubStepsContext(subSteps: SubAgentStep[]) {
  if (subSteps.length === 0) return "";
  return subSteps
    .map((step) =>
      [
        `${step.subAgentName} (${step.subAgentRole})`,
        `Etapa: ${getSubAgentStageLabel(step.stage)}`,
        `Objetivo: ${step.objective}`,
        step.dependsOnSubAgentIds?.length ? `Depende de: ${step.dependsOnSubAgentIds.join(" | ")}` : "",
        `Resumen: ${step.output?.summary ?? clip(step.message.replace(/\s+/g, " "), 180)}`,
        step.output?.risks?.length ? `Riesgos: ${step.output.risks.slice(0, 2).join(" | ")}` : "",
        step.output?.nextSteps?.length ? `Próximos pasos: ${step.output.nextSteps.slice(0, 2).join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function buildOutputFromSubSteps(agentId: AgentId, task: string, subSteps: SubAgentStep[], sources: SearchResult[] = []): AgentStructuredOutput {
  const summaryHighlights = dedupeStrings(
    subSteps.map((step) => step.output?.summary ?? cleanStructuredLine(step.message)).filter(Boolean)
  ).slice(0, 2);
  const stageCoverage = dedupeStrings(subSteps.map((step) => getSubAgentStageLabel(step.stage))).join(" -> ");
  const evidence =
    sources.length > 0
      ? sources.slice(0, 4).map((source) => ({
          title: source.title,
          url: source.url,
          claim: selectRelevantEvidence(source, task),
          snippet: source.snippet || source.pageExcerpt,
        }))
      : subSteps.flatMap((step) => {
          const subEvidence = step.output?.evidence ?? [];
          if (subEvidence.length > 0) {
            return subEvidence.slice(0, 1).map((item) => ({
              title: `${step.subAgentName}: ${item.title}`,
              claim: item.claim,
              url: item.url,
              snippet: item.snippet,
            }));
          }

          return [
            {
              title: `${step.subAgentName} summary`,
              claim: step.output?.summary ?? clip(step.message.replace(/\s+/g, " "), 180),
            },
          ];
        });
  const risks = dedupeStrings(subSteps.flatMap((step) => step.output?.risks ?? [])).slice(0, 4);
  const nextSteps = dedupeStrings(subSteps.flatMap((step) => step.output?.nextSteps ?? [])).slice(0, 4);

  return {
    summary:
      summaryHighlights.length > 0
        ? clip(
            `${agentId} coordinó ${subSteps.length} subagentes${stageCoverage ? ` (${stageCoverage})` : ""}: ${summaryHighlights.join(" / ")}`,
            240
          )
        : `${agentId} consolidó ${subSteps.length} subagentes internos para "${task}".`,
    evidence: evidence.slice(0, 4),
    risks: risks.length > 0 ? risks : buildDefaultRisks(agentId, task),
    nextSteps: nextSteps.length > 0 ? nextSteps : buildDefaultNextSteps(agentId, task),
    artifacts: subSteps.slice(0, 3).map((step) => ({
      kind: "subagent-note",
      title: `${step.subAgentName} (${getSubAgentStageLabel(step.stage)})`,
      content: clip(step.message.replace(/\s+/g, " "), 320),
    })),
  };
}

async function runSubAgent(
  parentAgentId: AgentId,
  task: string,
  assignment: TeamAssignment,
  context: string,
  rapidMode: boolean,
  extraInstructions = "",
  coordinationContext = ""
) {
  const startedAtMs = Date.now();
  const generation = await tryGenerateWithOptions(
    [
      `Sos ${assignment.subAgentName}, subagente interno de ${parentAgentId}.`,
      `Rol: ${assignment.subAgentRole}.`,
      `Etapa de ejecución: ${getSubAgentStageLabel(assignment.stage)}.`,
      `Objetivo puntual: ${assignment.objective}.`,
      "Respondé en español y no repitas que sos un modelo.",
    ].join(" "),
    [
      `Tarea principal:\n${task}`,
      `Objetivo puntual:\n${assignment.objective}`,
      context ? `Contexto operativo:\n${context}` : "",
      coordinationContext ? `Cadena interna y handoff previo:\n${coordinationContext}` : "",
      [
        "Instrucciones:",
        "- Enfocate solo en tu frente y no cierres toda la tarea.",
        "- Si recibís contexto previo, apoyate en él; si detectás tensión o contradicción, dejala explícita.",
        "- Respondé con secciones: Resumen, Evidencia, Riesgos y Próximos pasos.",
        "- Usá Próximos pasos como mini handoff para el siguiente subagente o para el lead.",
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
      maxOutputTokens: rapidMode ? 84 : 120,
      timeoutMs: rapidMode ? 3200 : 4500,
      numCtx: context ? 1536 : 1024,
      temperature: 0.1,
    }
  );

  const resolvedMessage = generation.text
    ? stripThoughtTags(generation.text) || generation.text
    : buildSubStepFallbackMessage(
        parentAgentId,
        assignment,
        task,
        generation.errors.join(" | ") || "El modelo no respondió"
      );

  const output = deriveStructuredOutputFromMessage(parentAgentId, `${task} · ${assignment.objective}`, resolvedMessage);

  return attachSubStepMeta(
    {
      subAgentId: assignment.subAgentId,
      subAgentName: assignment.subAgentName,
      subAgentRole: assignment.subAgentRole,
      objective: assignment.objective,
      stage: assignment.stage,
      dependsOnSubAgentIds: assignment.dependsOnSubAgentIds,
      thought: `${assignment.subAgentName} atacó "${assignment.objective}" para ${parentAgentId} en etapa ${getSubAgentStageLabel(assignment.stage)}.`,
      message: resolvedMessage,
      provider: generation.text ? generation.provider : "stub",
      output,
    },
    startedAtMs
  );
}

async function runSubAgentBatch(
  parentAgentId: AgentId,
  task: string,
  selectedAssignments: TeamAssignment[],
  context: string,
  rapidMode: boolean,
  extraInstructions = ""
) {
  if (selectedAssignments.length === 0) return [];

  const executedSubSteps: SubAgentStep[] = [];
  const executionPlan = buildStageExecutionGroups(selectedAssignments, task);
  const planContext = buildSubAgentPlanContext(selectedAssignments);

  for (const stageAssignments of executionPlan) {
    const stageCarryover = executedSubSteps.length > 0 ? buildSubStepsContext(executedSubSteps.slice(-4)) : "";
    const settled = await Promise.allSettled(
      stageAssignments.map((assignment) => {
        const coordinationContext = [planContext, stageCarryover, buildDependentSubStepsContext(executedSubSteps, assignment)]
          .filter(Boolean)
          .join("\n\n");

        return withTimeout(
          runSubAgent(parentAgentId, task, assignment, context, rapidMode, extraInstructions, coordinationContext),
          rapidMode ? 3600 : 5000,
          () =>
            attachSubStepMeta(
              {
                subAgentId: assignment.subAgentId,
                subAgentName: assignment.subAgentName,
                subAgentRole: assignment.subAgentRole,
                objective: assignment.objective,
                stage: assignment.stage,
                dependsOnSubAgentIds: assignment.dependsOnSubAgentIds,
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
        );
      })
    );

    const stageResults = settled.map((result, index) => {
      if (result.status === "fulfilled") return result.value;

      const assignment = stageAssignments[index];
      const fallbackMessage = buildSubStepFallbackMessage(
        parentAgentId,
        assignment,
        task,
        getErrorMessage(result.reason)
      );
      return attachSubStepMeta(
        {
          subAgentId: assignment.subAgentId,
          subAgentName: assignment.subAgentName,
          subAgentRole: assignment.subAgentRole,
          objective: assignment.objective,
          stage: assignment.stage,
          dependsOnSubAgentIds: assignment.dependsOnSubAgentIds,
          thought: `${assignment.subAgentName} devolvió fallback por error de ejecución.`,
          message: fallbackMessage,
          provider: "stub",
          output: deriveStructuredOutputFromMessage(parentAgentId, `${task} · ${assignment.objective}`, fallbackMessage),
        },
        Date.now()
      );
    });

    executedSubSteps.push(...stageResults);
  }

  return executedSubSteps;
}

function buildRoutingDirectory() {
  return (Object.entries(AGENT_DIRECTORY) as Array<[AgentId, (typeof AGENT_DIRECTORY)[AgentId]]>)
    .filter(([agentId]) => agentId !== "ARIA")
    .map(([agentId, info]) => `- ${agentId}: ${info.role}. ${info.summary}.`)
    .join("\n");
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return text.trim();
}

function parsePlannerDecision(rawText: string, prompt: string): AriaPlannerDecision | null {
  try {
    const parsed = JSON.parse(extractJsonObject(rawText)) as {
      task?: unknown;
      shouldDelegate?: unknown;
      delegatedAgents?: unknown;
      reason?: unknown;
    };

    const delegatedAgents = Array.isArray(parsed.delegatedAgents)
      ? [...new Set(parsed.delegatedAgents.map((item) => normalizeAgentId(String(item))).filter((item): item is SpecialistAgentId => Boolean(item && item !== "ARIA")))].slice(0, 3)
      : [];
    const shouldDelegate =
      typeof parsed.shouldDelegate === "boolean" ? parsed.shouldDelegate && delegatedAgents.length > 0 : delegatedAgents.length > 0;
    const task =
      typeof parsed.task === "string" && parsed.task.trim()
        ? parsed.task.trim()
        : stripLeadingMention(prompt) || prompt.trim();

    return {
      task,
      shouldDelegate,
      delegatedAgents: shouldDelegate ? delegatedAgents : [],
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? clip(parsed.reason.replace(/\s+/g, " ").trim(), 220)
          : "",
    };
  } catch {
    return null;
  }
}

async function planWithAria(prompt: string, roster: string, teamModeEnabled: boolean): Promise<PlannedRoute> {
  const heuristicPlan = plan(prompt);
  const { teamAssignments } = buildTeamContext("ARIA", heuristicPlan.task, teamModeEnabled);
  const selectedPlannerAssignments = pickSubAgentAssignments(teamAssignments, prompt, false);
  const plannerSubSteps = await runSubAgentBatch(
    "ARIA",
    prompt,
    selectedPlannerAssignments,
    `Pedido del usuario:\n${prompt}\n\nEspecialistas disponibles:\n${buildRoutingDirectory()}`,
    false,
    "- Enfocate en triage, routing y seguimiento. No redactes la respuesta final."
  );

  const generation = await tryGenerateWithOptions(
    `${AGENT_PROMPTS.ARIA}${roster}\nTu trabajo actual es decidir routing, no redactar la solución final.`,
    [
      `Pedido del usuario:\n${prompt}`,
      `Especialistas disponibles:\n${buildRoutingDirectory()}`,
      plannerSubSteps.length > 0 ? `Lecturas internas de ARIA:\n${buildSubStepsContext(plannerSubSteps)}` : "",
      [
        "Instrucciones:",
        "- Decidí si ARIA responde directo o si delega.",
        "- Si delegás, elegí como máximo 3 especialistas.",
        "- No delegues saludos, meta-consultas sobre el sistema ni coordinación simple.",
        '- Devolvé JSON estricto con esta forma: {"task":"...","shouldDelegate":true,"delegatedAgents":["SCOUT"],"reason":"..."}',
      ].join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n"),
    {
      agentId: "ARIA",
      maxOutputTokens: 160,
      timeoutMs: 4500,
      numCtx: 1600,
      temperature: 0.1,
    }
  );

  const parsedDecision = generation.text
    ? parsePlannerDecision(stripThoughtTags(generation.text) || generation.text, prompt)
    : null;

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
    },
    plannerSubSteps,
    plannerReason:
      parsedDecision.reason ||
      (parsedDecision.shouldDelegate
        ? "ARIA detectó que conviene abrir especialistas."
        : "ARIA detectó que puede cerrar el pedido en forma directa."),
    usedModelPlanner: true,
  };
}

async function tryGenerateWithOptions(system: string, prompt: string, options: GenerationOptions = {}) {
  const preferred = getRequestedProvider();
  const maxOutputTokens = options.maxOutputTokens ?? 800;
  const timeoutMs = options.timeoutMs ?? getEnvInt("OLLAMA_TIMEOUT_MS", 15000);
  const numCtx = options.numCtx ?? getEnvInt("OLLAMA_NUM_CTX", 2048);
  const temperature = options.temperature ?? 0.2;
  const modelName = getOllamaModel(options.agentId);

  if (preferred === "stub") return { text: null, provider: "stub" as ProviderId, errors: ["AI_PROVIDER=stub"] };

  const errors: string[] = [];
  if (preferred === "auto" || preferred === "ollama") {
    try {
      const response = await fetchWithTimeout(
        getOllamaNativeChatUrl(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            stream: false,
            keep_alive: "15m",
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ],
            options: {
              temperature,
              num_predict: maxOutputTokens,
              num_ctx: numCtx,
            },
          }),
        },
        timeoutMs
      );

      if (response.ok) {
        const payload = (await response.json()) as OllamaChatResponse;
        const text = payload.message?.content?.trim();
        if (text) {
          return { text, provider: "ollama" as ProviderId, errors };
        }
        errors.push("Ollama: respuesta vacía");
      } else {
        errors.push(`Ollama: ${response.status}`);
      }
    } catch (error) {
      errors.push(`Ollama: ${getErrorMessage(error)}`);
    }
    if (preferred === "ollama") {
      return {
        text: null,
        provider: "stub" as ProviderId,
        errors: errors.length ? errors : ["Ollama no respondió"],
      };
    }
  }

  const providers = getProviders().filter((provider) => provider.enabled && (preferred === "auto" || provider.id === preferred));

  for (const provider of providers) {
    if (provider.id === "ollama") continue;
    try {
      const result = await generateText({
        model: provider.createModel(),
        system,
        prompt,
        maxOutputTokens,
        maxRetries: 0,
      });

      if (result.text.trim()) {
        return { text: result.text.trim(), provider: provider.id as ProviderId, errors };
      }

      errors.push(`${provider.label}: respuesta vacía`);
    } catch (error) {
      console.error(`Error en proveedor ${provider.label}:`, error);
      errors.push(`${provider.label}: ${getErrorMessage(error)}`);
    }
  }

  return {
    text: null,
    provider: "stub" as ProviderId,
    errors: errors.length ? errors : ["No hay proveedores configurados"],
  };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function unwrapDuckUrl(raw: string) {
  const absolute = raw.startsWith("//") ? `https:${raw}` : raw;
  const url = new URL(absolute, "https://duckduckgo.com");
  return decodeURIComponent(url.searchParams.get("uddg") ?? absolute);
}

function buildKeywordQuery(task: string) {
  const keywords = normalizePlainText(task)
    .split(" ")
    .filter((word) => word.length > 2 && !SEARCH_STOPWORDS.has(word))
    .slice(0, 8);

  return keywords.join(" ");
}

function buildTranslatedScoutQuery(task: string) {
  let translated = task;
  for (const rule of SCOUT_TRANSLATIONS) {
    translated = translated.replace(rule.pattern, rule.replacement);
  }
  return translated.replace(/\s+/g, " ").trim();
}

function buildScoutQueries(task: string) {
  const variants = [task.trim(), buildTranslatedScoutQuery(task), buildKeywordQuery(task)]
    .map((query) => query.trim())
    .filter(Boolean);

  return [...new Set(variants)].slice(0, 2);
}

async function searchDuckDuckGo(query: string) {
  const response = await fetchWithTimeout(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: { "User-Agent": SEARCH_UA, Accept: "text/html,application/xhtml+xml" },
    },
    4000
  );

  if (!response.ok) {
    throw new Error(`DuckDuckGo devolvió ${response.status}`);
  }

  const html = await response.text();
  const regex =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,1600}?(?:<a[^>]*class="result__snippet"|<div[^>]*class="result__snippet"|<span[^>]*class="result__snippet")[^>]*>([\s\S]*?)<\/(?:a|div|span)>/gi;

  const results: SearchResult[] = [];

  for (const match of html.matchAll(regex)) {
    const url = unwrapDuckUrl(match[1]);
    if (!url.startsWith("http") || results.some((item) => item.url === url)) continue;
    if (url.includes("duckduckgo.com/y.js") || url.includes("duckduckgo.com/l/?")) continue;

    results.push({
      title: clip(decodeHtml(match[2]), 160),
      url,
      snippet: clip(decodeHtml(match[3]), 320),
    });

    if (results.length >= 5) break;
  }

  return results;
}

async function searchWeb(task: string) {
  const cacheKey = normalizePlainText(task);
  const cached = scoutSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const queries = buildScoutQueries(task);
  const settled = await Promise.allSettled(queries.map((query) => searchDuckDuckGo(query)));
  const combined: SearchResult[] = [];
  const errors: string[] = [];

  for (let index = 0; index < settled.length; index += 1) {
    const result = settled[index];
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        if (combined.some((existing) => existing.url === item.url)) continue;
        combined.push(item);
        if (combined.length >= 5) break;
      }
    } else {
      errors.push(`${queries[index]}: ${getErrorMessage(result.reason)}`);
    }

    if (combined.length >= 5) break;
  }

  if (combined.length === 0 && errors.length > 0) {
    throw new Error(errors.join(" | "));
  }

  const finalResults = combined.slice(0, 5);
  scoutSearchCache.set(cacheKey, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    results: finalResults,
  });

  return finalResults;
}

function sourceBlock(results: SearchResult[]) {
  if (results.length === 0) return "";
  return `Fuentes:\n${results.map((item, index) => `[${index + 1}] ${item.title} - ${item.url}`).join("\n")}`;
}

function scoutContextBlock(results: SearchResult[]) {
  if (results.length === 0) return "No se obtuvo contexto web útil.";
  return results
    .map((item, index) =>
      [
        `[${index + 1}] ${item.title}`,
        `URL: ${item.url}`,
        `Snippet: ${item.snippet}`,
        item.pageExcerpt ? `Lectura de página: ${item.pageExcerpt}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function buildScoutSignalCorpus(task: string, results: SearchResult[]) {
  return normalizePlainText(`${task} ${results.map((result) => `${result.title} ${result.snippet}`).join(" ")}`);
}

function buildTopThemes(task: string, results: SearchResult[]) {
  const corpus = buildScoutSignalCorpus(task, results);
  const themes: string[] = [];

  if (/(orquesta|orchestrat|patrones|pattern)/.test(corpus)) {
    themes.push("patrones de orquestación");
  }
  if (/(centraliz|descentraliz|concurrent|secuencial|grupo|transfer|worker)/.test(corpus)) {
    themes.push("coordinación y topologías");
  }
  if (/(estado|state|error|retry|reintento|observab|trace|logging|log)/.test(corpus)) {
    themes.push("estado y confiabilidad");
  }
  if (/(scale|scalability|latencia|throughput|capacidad|parallel|queue|async)/.test(corpus)) {
    themes.push("capacidad y latencia");
  }
  if (/(tool|workflow|api|webhook|n8n|docker|integraci)/.test(corpus)) {
    themes.push("tooling y ejecución");
  }

  return themes.slice(0, 3);
}

function selectRelevantEvidence(result: SearchResult, task: string) {
  const keywords = normalizePlainText(task)
    .split(" ")
    .filter((word) => word.length > 3 && !SEARCH_STOPWORDS.has(word));
  const segments = [result.snippet, result.pageExcerpt, result.title]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(/(?<=[.!?])\s+/))
    .map((value) => value.trim())
    .filter((value) => value.length > 40);

  if (segments.length === 0) {
    return result.snippet || result.title;
  }

  const scored = segments
    .map((segment) => ({
      segment,
      score: keywords.reduce((total, keyword) => total + (normalizePlainText(segment).includes(keyword) ? 3 : 0), 0) + segment.length / 200,
    }))
    .sort((a, b) => b.score - a.score);

  return clip(scored[0]?.segment || result.snippet || result.title, 220);
}

function buildScoutOpportunities(task: string, results: SearchResult[]) {
  const corpus = buildScoutSignalCorpus(task, results);
  const opportunities: string[] = [];

  if (/(scale|scalability|queue|async|parallel|worker|throughput|latency|latencia|capacidad)/.test(corpus)) {
    opportunities.push("Separar tareas largas en colas y workers para que el orquestador no bloquee la conversación.");
  }
  if (/(centraliz|descentraliz|concurrent|secuencial|grupo|transfer|worker)/.test(corpus)) {
    opportunities.push("Usar un router central liviano y especialistas desacoplados, en vez de activar a todos los agentes en cada turno.");
  }
  if (/(monitor|observability|telemetry|trace|logging|eval|benchmark|estado|error|reintento)/.test(corpus)) {
    opportunities.push("Medir handoffs, latencia y calidad por agente para ajustar routing y capacidad con datos.");
  }
  if (/(tool|webhook|workflow|integration|automation|n8n|docker|integraci)/.test(corpus)) {
    opportunities.push("Delegar ejecución e integraciones en workflows externos para que el cerebro central quede liviano.");
  }
  if (opportunities.length === 0) {
    opportunities.push("Convertir los patrones que más se repiten en las fuentes en playbooks operativos y métricas de capacidad.");
  }

  return opportunities.slice(0, 2);
}

function buildScoutRisks(task: string, results: SearchResult[]) {
  const corpus = buildScoutSignalCorpus(task, results);
  const risks: string[] = [];

  if (/(hallucination|quality|eval|benchmark|alignment|consistency|calidad|evaluaci)/.test(corpus)) {
    risks.push("Si no hay evaluación por agente, la delegación puede perder calidad aunque el sistema escale.");
  }
  if (/(latency|throughput|queue|worker|cost|resource|memory|cpu|latencia|capacidad|estado)/.test(corpus)) {
    risks.push("Sin límites de presupuesto por tarea, el costo en CPU y la latencia crecen rápido con cada subagente.");
  }
  if (/(monitor|observability|trace|logging|error|reintento|estado|observab)/.test(corpus)) {
    risks.push("Sin trazabilidad por handoff es difícil aislar cuellos de botella y errores de coordinación.");
  }
  if (risks.length === 0) {
    risks.push("Si cada agente toma contexto de más o genera de más, la experiencia se vuelve lenta aunque el flujo esté bien diseñado.");
  }

  return risks.slice(0, 2);
}

function buildScoutExtractiveResponse(task: string, results: SearchResult[]) {
  const topThemes = buildTopThemes(task, results);
  const executiveLine =
    topThemes.length > 0
      ? `Las fuentes se concentran en ${topThemes.join(", ")} como ejes para abordar "${task}".`
      : `Las fuentes recuperadas aportan señales útiles para orientar "${task}".`;
  const findings = results
    .slice(0, 3)
    .map((result, index) => `- [${index + 1}] ${selectRelevantEvidence(result, task)}`);
  const opportunities = buildScoutOpportunities(task, results).map((item) => `- ${item}`);
  const risks = buildScoutRisks(task, results).map((item) => `- ${item}`);

  return [
    "Resumen ejecutivo",
    `- ${executiveLine}`,
    "Hallazgos clave",
    ...findings,
    "Oportunidades",
    ...opportunities,
    "Riesgos",
    ...risks,
    "Fuentes",
    ...results.slice(0, 4).map((result, index) => `- [${index + 1}] ${result.title} - ${result.url}`),
  ].join("\n");
}

function buildRapidSpecialistResponse(agentId: Exclude<AgentId, "ARIA" | "SCOUT" | "APEX">, task: string) {
  if (agentId === "ZION") {
    return [
      "Decisión ejecutiva",
      `- ZION toma "${task}" como un frente de prioridad alta y propone resolverlo en etapas cortas.`,
      "Prioridades",
      "- Primero resolver el cuello de botella principal y recién después expandir alcance o complejidad.",
      "- Medir impacto, latencia y calidad antes de sumar más agentes o automatizaciones.",
      "Riesgo",
      "- Si se activan demasiados frentes a la vez, el sistema se vuelve más lento y difícil de operar.",
    ].join("\n");
  }

  if (agentId === "FORGE") {
    return [
      "Workflow operativo fragmentado",
      `- FORGE lo baja a microflujos rápidos para "${task}".`,
      "n8n fast lanes",
      '- `intake-router`: recibe el pedido, normaliza payload y decide los 2 team leads.',
      '- `lead-brief-builder`: arma briefs cortos por lead con contexto mínimo y timeout corto.',
      '- `specialist-runner`: ejecuta cada squad en paralelo con respuesta resumida y logs por turno.',
      '- `response-assembler`: junta salidas, deduplica y devuelve a ARIA un cierre compacto.',
      "Reglas",
      "- Separar trigger, routing, ejecución y consolidación baja latencia y evita que una sola corrida cargue todo el contexto.",
    ].join("\n");
  }

  if (agentId === "VERA") {
    return [
      "Lectura analítica",
      `- VERA enfocaría "${task}" sobre una métrica principal, una comparación y una alerta.`,
      "Chequeos",
      "- Cortar por período, segmento y canal antes de sacar conclusiones.",
      "- Separar señal real de ruido para no optimizar sobre una anomalía aislada.",
    ].join("\n");
  }

  if (agentId === "ECHO") {
    return [
      "Marco de comunicación",
      `- ECHO ordena "${task}" en objetivo, mensaje principal y cierre.`,
      "Borrador base",
      "- Abrí con contexto corto, explicá valor concreto y cerrá con una sola CTA accionable.",
    ].join("\n");
  }

  return [
    "Dirección de contenido",
    `- VOX toma "${task}" como brief y lo separa en hook, formato y CTA.`,
    "Salida sugerida",
    "- Un ángulo fuerte para captar atención, una estructura simple y un cierre que empuje respuesta o conversión.",
  ].join("\n");
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
      ? `${teamAssignments.map((assignment) => assignment.subAgentName).join(", ")} coordinaron la recepción y el seguimiento de "${task}".`
      : `ARIA coordinó la solicitud "${task}".`;
  }

  if (teamAssignments.length > 0) {
    return `${agentId} repartió "${task}" entre ${teamAssignments.map((assignment) => assignment.subAgentName).join(", ")}.`;
  }

  return `${agentId} procesó "${task}".`;
}

function buildAriaLeadWrapUp(task: string, steps: AgentStep[]) {
  return formatStructuredOutput(buildAriaStructuredOutput(task, steps));
}

function buildAriaStep(
  task: string,
  message: string,
  thought: string,
  teamModeEnabled: boolean,
  coordination: Partial<Pick<AgentStep, "lane" | "zone" | "interactionTargetId" | "statusDetail" | "handoffTargets">> = {},
  output?: AgentStructuredOutput,
  subSteps: SubAgentStep[] = []
) {
  const { teamAssignments } = buildTeamContext("ARIA", task, teamModeEnabled);
  return attachCoordinationData(
    attachTeamData(
      {
        agentId: "ARIA",
        task,
        provider: "stub",
        thought,
        message,
        output,
        ...(subSteps.length > 0 ? { subSteps } : {}),
      },
      teamAssignments,
      teamModeEnabled
    ),
    coordination
  );
}

async function runLeadWithSubAgents(
  agentId: SpecialistAgentId,
  task: string,
  roster: string,
  teamModeEnabled: boolean,
  options: {
    context?: string;
    sources?: SearchResult[];
    extraInstructions?: string;
    subAgentExtraInstructions?: string;
    rapidMode?: boolean;
    outputBuilder?: (message: string, subSteps: SubAgentStep[]) => AgentStructuredOutput;
  } = {}
) {
  const { teamAssignments, teamContext } = buildTeamContext(agentId, task, teamModeEnabled);
  const rapidMode = Boolean(options.rapidMode);
  const selectedAssignments = pickSubAgentAssignments(teamAssignments, task, rapidMode);
  const operativeContext = [options.context, teamAssignments.length === 0 ? teamContext : ""].filter(Boolean).join("\n\n");
  const subAgentPlanContext = buildSubAgentPlanContext(selectedAssignments);
  const subSteps =
    selectedAssignments.length > 0
      ? await runSubAgentBatch(
          agentId,
          task,
          selectedAssignments,
          [options.context, roster].filter(Boolean).join("\n\n"),
          rapidMode,
          options.subAgentExtraInstructions ?? ""
        )
      : [];
  const subStepsContext = buildSubStepsContext(subSteps);

  const generation = await tryGenerateWithOptions(
    `${AGENT_PROMPTS[agentId]}${roster}`,
    [
      `Consulta:\n${task}`,
      operativeContext ? `Contexto:\n${operativeContext}` : "",
      subAgentPlanContext ? `Plan interno del squad:\n${subAgentPlanContext}` : "",
      subStepsContext ? `Subagentes internos ejecutados:\n${subStepsContext}` : "",
      [
        "Instrucciones:",
        "- Respondé en español.",
        "- Integrá a tus subagentes como un solo frente coordinado.",
        "- Si hay tensiones entre subagentes, explicitá el criterio con el que cerrás.",
        "- Dejá una decisión final, un riesgo principal y un siguiente paso claro.",
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
      maxOutputTokens: rapidMode ? 96 : agentId === "APEX" ? 160 : 132,
      timeoutMs: rapidMode ? 3800 : agentId === "APEX" ? 6500 : 5200,
      numCtx: operativeContext || subStepsContext ? 2048 : 1280,
      temperature: 0.15,
    }
  );

  if (!generation.text && subSteps.length === 0) {
    return attachTeamData(
      fallback(agentId, task, generation.errors.join(" | "), options.sources ?? []),
      teamAssignments,
      teamModeEnabled
    );
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
          ? `${agentId} coordinó ${subSteps.length} subagentes internos${(options.sources ?? []).length ? ` sobre ${(options.sources ?? []).length} señales` : ""} para "${task}" con una cadena ${selectedAssignments.map((assignment) => assignment.subAgentName).join(" -> ")}.`
          : buildOperationalThought(agentId, task, teamAssignments, (options.sources ?? []).length),
      message: resolvedMessage,
      output,
      ...(subSteps.length > 0 ? { subSteps } : {}),
      ...(options.sources?.length ? { sources: options.sources.map(({ title, url, snippet }) => ({ title, url, snippet })) } : {}),
    },
    teamAssignments,
    teamModeEnabled
  );
}

async function runAriaDirect(task: string, roster: string, teamModeEnabled: boolean, plannerSubSteps: SubAgentStep[] = []) {
  const planningContext = plannerSubSteps.length > 0 ? `Triage interno de ARIA:\n${buildSubStepsContext(plannerSubSteps)}` : "";
  return runGeneric(
    "ARIA",
    task,
    roster,
    teamModeEnabled,
    planningContext,
    "- Respondé como cerebro principal y secretaria.\n- Si decidiste responder directo, cerrá sin pedir menciones manuales a otros agentes."
  );
}

function getFastAriaResponse(prompt: string, teamModeEnabled: boolean) {
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

async function runGeneric(agentId: AgentId, task: string, roster: string, teamModeEnabled: boolean, context = "", extra = "") {
  const { teamAssignments, teamContext } = buildTeamContext(agentId, task, teamModeEnabled);
  const generation = await tryGenerateWithOptions(
    `${AGENT_PROMPTS[agentId]}${roster}`,
    [
      `Consulta:\n${task}`,
      teamContext ? `Contexto de squad:\n${teamContext}` : "",
      context ? `Contexto:\n${context}` : "",
      `Instrucciones:\n- Respondé en español.\n- Sé concreto y accionable.\n- Usá como máximo 5 bullets o un párrafo corto.\n- Si el squad interno está activo, integrá sus frentes como un único equipo coordinado.\n${extra}`.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
    {
      agentId,
      maxOutputTokens: agentId === "ARIA" ? 80 : agentId === "APEX" ? 120 : 96,
      timeoutMs: agentId === "ARIA" ? 5000 : agentId === "APEX" ? 6000 : 4500,
      numCtx: context ? 1536 : 1280,
    }
  );

  if (!generation.text) {
    return attachTeamData(fallback(agentId, task, generation.errors.join(" | ")), teamAssignments, teamModeEnabled);
  }

  const cleaned = stripThoughtTags(generation.text);
  const resolvedMessage = cleaned || generation.text;
  const output = deriveStructuredOutputFromMessage(agentId, task, resolvedMessage);
  return attachTeamData(
    {
      agentId,
      task,
      provider: generation.provider,
      thought: buildOperationalThought(agentId, task, teamAssignments),
      message: resolvedMessage,
      output,
    },
    teamAssignments,
    teamModeEnabled
  );
}

async function runScout(task: string, roster: string, teamModeEnabled: boolean, rapidMode = false) {
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
  const shouldKeepExtractive = synthesisMode === "extractive" && !teamModeEnabled && !rapidMode;
  if (shouldKeepExtractive) {
    const message = buildScoutExtractiveResponse(task, results);
    return attachTeamData(
      {
        agentId: "SCOUT",
        task,
        provider: "stub",
        thought: buildOperationalThought("SCOUT", task, teamAssignments, results.length),
        message,
        output: buildScoutStructuredOutput(task, results, message),
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
    extraInstructions:
      "Respondé con Resumen ejecutivo, Hallazgos clave, Oportunidades, Riesgos y Fuentes. No inventes datos fuera de las señales encontradas.",
    subAgentExtraInstructions:
      "- Basate solo en el contexto web provisto.\n- No inventes fuentes ni URLs.\n- Si algo no está soportado, dejalo como hipótesis.",
    outputBuilder: (message) => buildScoutStructuredOutput(task, results, message),
  });

  const message = /fuentes:/i.test(step.message) ? step.message : `${step.message}\n\n${sourceBlock(results)}`.trim();
  return {
    ...step,
    message,
    output: buildScoutStructuredOutput(task, results, message),
    sources: results.map(({ title, url, snippet }) => ({ title, url, snippet })),
  };
}

async function runApex(task: string, roster: string, teamModeEnabled: boolean, rapidMode = false) {
  const context = (await repoContext(task)) || "No encontré matches claros en el repo actual.";
  const step = await runLeadWithSubAgents("APEX", task, roster, teamModeEnabled, {
    context,
    rapidMode,
    extraInstructions:
      "- Si proponés cambios, nombrá archivos o áreas afectadas.\n- Cerrá con validaciones o riesgos concretos.",
    subAgentExtraInstructions:
      "- Basate solo en el contexto del repo actual.\n- Si aparece un archivo o superficie concreta, nombralo.\n- Priorizá corrección mínima y validación.",
    outputBuilder: (message) => buildApexStructuredOutput(task, context, message),
  });

  return {
    ...step,
    output: buildApexStructuredOutput(task, context, step.message),
  };
}

async function runSpecialist(agentId: Exclude<AgentId, "ARIA" | "SCOUT" | "APEX">, task: string, roster: string, teamModeEnabled: boolean, rapidMode = false) {
  if (rapidMode && !teamModeEnabled) {
    const message = buildRapidSpecialistResponse(agentId, task);
    return {
      agentId,
      task,
      provider: "stub" as ProviderId,
      thought: `${agentId} respondió en modo rápido local para no bloquear el handoff.`,
      message,
      output: deriveStructuredOutputFromMessage(agentId, task, message),
    };
  }

  const extraInstructionsMap: Record<Exclude<AgentId, "ARIA" | "SCOUT" | "APEX">, string> = {
    VERA: "- Convertí la lectura en señal, riesgo y decisión. Priorizá claridad sobre volumen.",
    ZION: "- Priorizá trade-offs, secuencia y foco. No abras más frentes de los necesarios.",
    FORGE: "- Bajá la respuesta a trigger, handoff, ejecución y confiabilidad. Priorizá local y gratis cuando aparezca n8n o Docker.",
    ECHO: "- Cerrá con una propuesta comunicacional concreta, con una sola CTA fuerte.",
    VOX: "- Transformá el brief en hook, estructura y CTA sin dispersarte.",
  };
  const subAgentInstructionsMap: Record<Exclude<AgentId, "ARIA" | "SCOUT" | "APEX">, string> = {
    VERA: "- Aislá señal principal, desviación y lectura ejecutiva.",
    ZION: "- Aislá opción, trade-off y orden de decisión.",
    FORGE: "- Aislá workflow, integración y confiabilidad.",
    ECHO: "- Aislá tono, mensaje y cierre.",
    VOX: "- Aislá hook, formato y CTA.",
  };

  return runLeadWithSubAgents(agentId, task, roster, teamModeEnabled, {
    rapidMode,
    extraInstructions: extraInstructionsMap[agentId],
    subAgentExtraInstructions: subAgentInstructionsMap[agentId],
  });
}

async function execute(agentId: AgentId, task: string, roster: string, teamModeEnabled: boolean, rapidMode = false) {
  if (agentId === "SCOUT") return runScout(task, roster, teamModeEnabled, rapidMode);
  if (agentId === "APEX") return runApex(task, roster, teamModeEnabled, rapidMode);
  if (agentId === "FORGE" || agentId === "VERA" || agentId === "ZION" || agentId === "ECHO" || agentId === "VOX") {
    return runSpecialist(agentId, task, roster, teamModeEnabled, rapidMode);
  }
  if (agentId === "ARIA") {
    return runAriaDirect(task, roster, teamModeEnabled);
  }
  return runGeneric(agentId, task, roster, teamModeEnabled);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "6", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 12) : 6;
  const runs = await listRecentOrchestratorRuns(limit);

  return NextResponse.json({ runs });
}

export async function POST(req: Request) {
  const runId = createRunId();
  const routeStartedAtMs = Date.now();

  try {
    const body = (await req.json().catch(() => null)) as OrchestratorRequest | null;
    const { prompt, currentAgents, teamMode } = sanitizeOrchestratorPayload(body);

    if (!prompt) {
      return NextResponse.json({ runId, error: "Prompt inválido." }, { status: 400 });
    }

    const teamModeEnabled = isTeamModeEnabled(teamMode);
    const structuredResponse = getStructuredAriaResponse(prompt, teamModeEnabled);
    if (structuredResponse) {
      const instantRoutePlan: RoutePlan = {
        entry: "ARIA",
        delegatedAgents: [],
        task: prompt,
      };
      const steps = structuredResponse.map((step) => attachStepMeta(step, runId, routeStartedAtMs));
      const trace = buildRouteTrace(runId, instantRoutePlan, routeStartedAtMs, steps);
      await persistObservedRun({
        runId,
        prompt,
        routePlan: instantRoutePlan,
        teamModeEnabled,
        decisionSource: "structured_shortcut",
        status: "completed",
        routeStartedAtMs,
        steps,
        trace,
      });
      return NextResponse.json({ runId, steps, trace });
    }
    const fastResponse = getFastAriaResponse(prompt, teamModeEnabled);
    if (fastResponse) {
      const instantRoutePlan: RoutePlan = {
        entry: "ARIA",
        delegatedAgents: [],
        task: prompt,
      };
      const steps = fastResponse.map((step) => attachStepMeta(step, runId, routeStartedAtMs));
      const trace = buildRouteTrace(runId, instantRoutePlan, routeStartedAtMs, steps);
      await persistObservedRun({
        runId,
        prompt,
        routePlan: instantRoutePlan,
        teamModeEnabled,
        decisionSource: "fast_path",
        status: "completed",
        routeStartedAtMs,
        steps,
        trace,
      });
      return NextResponse.json({ runId, steps, trace });
    }

    const roster = rosterContext(currentAgents);
    const plannedRoute = await planWithAria(prompt, roster, teamModeEnabled);
    const routePlan = plannedRoute.routePlan;
    const steps: AgentStep[] = [];

    if (plannedRoute.usedModelPlanner || plannedRoute.plannerSubSteps.length > 0) {
      const ariaPlanningStartedAtMs = Date.now();
      const delegatedLabel = joinAgentMentions(routePlan.delegatedAgents);
      steps.push(
        attachStepMeta(
          buildAriaStep(
            routePlan.task,
            routePlan.delegatedAgents.length > 0
              ? `Recibido. ARIA abrió triage interno y deriva este pedido a ${delegatedLabel}.\n\nEncargo coordinado: ${routePlan.task}${
                  plannedRoute.plannerReason ? `\n\nCriterio: ${plannedRoute.plannerReason}` : ""
                }`
              : `Recibido. ARIA abrió triage interno y toma este pedido en forma directa.\n\nEncargo: ${routePlan.task}${
                  plannedRoute.plannerReason ? `\n\nCriterio: ${plannedRoute.plannerReason}` : ""
                }`,
            plannedRoute.usedModelPlanner
              ? `INBOX, SWITCH y LEDGER evaluaron el pedido. ${plannedRoute.plannerReason}`
              : plannedRoute.plannerReason,
            teamModeEnabled,
            {
              zone: "collab",
              statusDetail:
                routePlan.delegatedAgents.length > 0
                  ? `DERIVANDO A ${routePlan.delegatedAgents.length} PRINCIPALES`
                  : "TRIAGE DIRECTO",
              ...(routePlan.delegatedAgents.length > 0 ? { handoffTargets: routePlan.delegatedAgents } : {}),
            },
            undefined,
            plannedRoute.plannerSubSteps
          ),
          runId,
          ariaPlanningStartedAtMs
        )
      );
    }

    if (routePlan.delegatedAgents.length > 0) {
      const delegatedTasks = routePlan.delegatedAgents.map((agentId, index) => {
        const startedAtMs = Date.now();
        return {
          agentId,
          index,
          startedAtMs,
          promise: withTimeout(
            execute(agentId, routePlan.task, roster, teamModeEnabled, routePlan.delegatedAgents.length > 1).then((step) =>
              attachStepMeta(
                attachCoordinationData(step, {
                  lane: getLeadLane(index),
                  zone: "collab",
                  interactionTargetId: "aria",
                  statusDetail: getLeadStatusLabel(agentId, getLeadLane(index)),
                }),
                runId,
                startedAtMs
              )
            ),
            routePlan.delegatedAgents.length > 1 ? 4500 : 5000,
            () =>
              attachStepMeta(
                attachCoordinationData(fallback(agentId, routePlan.task, "Timeout operativo > 5s"), {
                  lane: getLeadLane(index),
                  zone: "collab",
                  interactionTargetId: "aria",
                  statusDetail: getLeadStatusLabel(agentId, getLeadLane(index)),
                }),
                runId,
                startedAtMs
              )
          ),
        };
      });

      const delegatedResults = await Promise.allSettled(delegatedTasks.map((task) => task.promise));
      const fulfilledSteps: AgentStep[] = [];

      delegatedResults.forEach((result, index) => {
        const delegatedTask = delegatedTasks[index];
        if (result.status === "fulfilled") {
          fulfilledSteps.push(result.value);
          steps.push(result.value);
          return;
        }

        steps.push(
          attachStepMeta(
            attachCoordinationData(fallback(delegatedTask.agentId, routePlan.task, getErrorMessage(result.reason)), {
              lane: getLeadLane(delegatedTask.index),
              zone: "collab",
              interactionTargetId: "aria",
              statusDetail: getLeadStatusLabel(delegatedTask.agentId, getLeadLane(delegatedTask.index)),
            }),
            runId,
            delegatedTask.startedAtMs
          )
        );
      });

      const ariaOutput = buildAriaStructuredOutput(routePlan.task, fulfilledSteps);
      const ariaWrapUpStartedAtMs = Date.now();
      steps.push(
        attachStepMeta(
          buildAriaStep(
            routePlan.task,
            buildAriaLeadWrapUp(routePlan.task, fulfilledSteps),
            routePlan.delegatedAgents.length === 1
              ? `ARIA cerró el handoff con ${routePlan.delegatedAgents[0]} y devolvió el output consolidado sin reescribir la evidencia.`
              : `ARIA sincronizó ${routePlan.delegatedAgents.length} lanes, deduplicó artifacts y devolvió un cierre trazable para "${routePlan.task}".`,
            teamModeEnabled,
            {
              zone: "collab",
              statusDetail:
                routePlan.delegatedAgents.length === 1 ? "CIERRE PRINCIPAL" : `SYNC ${routePlan.delegatedAgents.length} LANES`,
              handoffTargets: routePlan.delegatedAgents,
            },
            ariaOutput
          ),
          runId,
          ariaWrapUpStartedAtMs
        )
      );
    } else {
      const ariaStartedAtMs = Date.now();
      steps.push(
        attachStepMeta(
          await runAriaDirect(routePlan.task, roster, teamModeEnabled, plannedRoute.plannerSubSteps),
          runId,
          ariaStartedAtMs
        )
      );
    }

    const trace = buildRouteTrace(runId, routePlan, routeStartedAtMs, steps);
    await persistObservedRun({
      runId,
      prompt,
      routePlan,
      teamModeEnabled,
      decisionSource: "planner",
      status: "completed",
      routeStartedAtMs,
      steps,
      trace,
    });

    return NextResponse.json({ runId, steps, trace });
  } catch (error) {
    console.error("Error en el Orquestador:", error);
    const fallbackStartedAtMs = Date.now();
    const fallbackStep = attachStepMeta(
      {
        agentId: "ARIA",
        task: "soporte",
        provider: "stub",
        thought: `Hubo un error en el backend. ${getErrorMessage(error)}`,
        message: "La oficina sigue en pie, pero este pedido falló. Probá otra vez y, si persiste, reviso el orquestador.",
      },
      runId,
      fallbackStartedAtMs
    );
    const fallbackRoutePlan: RoutePlan = {
      entry: "ARIA",
      delegatedAgents: [],
      task: "soporte",
    };
    const trace = buildRouteTrace(runId, fallbackRoutePlan, routeStartedAtMs, [fallbackStep]);

    await persistObservedRun({
      runId,
      prompt: "error",
      routePlan: fallbackRoutePlan,
      teamModeEnabled: false,
      decisionSource: "error",
      status: "error",
      routeStartedAtMs,
      steps: [fallbackStep],
      trace,
      error: getErrorMessage(error),
    });

    return NextResponse.json({
      runId,
      steps: [fallbackStep],
      trace,
    });
  }
}
