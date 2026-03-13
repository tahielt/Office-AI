import { promises as fs } from "node:fs";
import path from "node:path";

import { buildTeamAssignments, getTeamMembersForAgent } from "@/lib/agentTeams";
import { AgentLane, AgentZone, TeamAssignment } from "@/types/agent";
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

interface AgentStep {
  agentId: AgentId;
  task: string;
  thought: string;
  message: string;
  provider: ProviderId;
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

const AGENT_LABELS: Record<AgentId, string> = {
  SCOUT: "investigación web e inteligencia",
  APEX: "ingeniería",
  VERA: "análisis",
  ZION: "estrategia",
  FORGE: "automatización",
  ECHO: "comunicaciones",
  VOX: "contenido",
  ARIA: "orquestación",
};

const ROUTING_RULES: Array<{ agentId: SpecialistAgentId; patterns: RegExp[] }> = [
  {
    agentId: "SCOUT",
    patterns: [/\binvestig/i, /\bweb\b/i, /\binternet\b/i, /\bfuentes?\b/i, /\bmercado\b/i, /\bcompet/i, /\btendenc/i, /\bbenchmark/i],
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
    patterns: [/\bestrateg/i, /\broadmap\b/i, /\bpriori/i, /\bnegocio\b/i, /\bdecision/i, /\btrade/i, /\bplan\b/i],
  },
  {
    agentId: "FORGE",
    patterns: [/\bautomat/i, /\bworkflow\b/i, /\bwebhook\b/i, /\bintegr/i, /\bn8n\b/i, /\bdocker\b/i, /\bcron\b/i, /\btrigger\b/i, /\bpipeline\b/i],
  },
  {
    agentId: "ECHO",
    patterns: [/\bemail\b/i, /\bmail\b/i, /\bmensaje/i, /\bwhatsapp\b/i, /\bcliente\b/i, /\brespuesta\b/i, /\bfollow/i, /\bpropuesta\b/i],
  },
  {
    agentId: "VOX",
    patterns: [/\bcontenido\b/i, /\breel\b/i, /\bpost\b/i, /\bguion\b/i, /\bcaption\b/i, /\bcopy\b/i, /\blinkedin\b/i, /\binstagram\b/i, /\btiktok\b/i, /\bcarrusel\b/i],
  },
];

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

function isAgentDescriptor(value: unknown): value is AgentDescriptor {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AgentDescriptor>;
  return typeof candidate.id === "string" && typeof candidate.name === "string" && typeof candidate.role === "string";
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

function plan(prompt: string): RoutePlan {
  const explicitlyMentioned = extractMentionedAgents(prompt);
  const delegatedAgents = explicitlyMentioned.length > 0 ? explicitlyMentioned : inferDelegatedAgents(prompt);
  const task = delegatedAgents.length > 0 ? extractDelegatedTask(prompt, delegatedAgents) : stripLeadingMention(prompt) || prompt.trim();

  return {
    entry: "ARIA",
    delegatedAgents,
    task,
  };
}

function joinAgentMentions(agentIds: SpecialistAgentId[]) {
  if (agentIds.length === 0) return "";
  if (agentIds.length === 1) return `@${agentIds[0].toLowerCase()}`;
  if (agentIds.length === 2) return `@${agentIds[0].toLowerCase()} y @${agentIds[1].toLowerCase()}`;
  return `@${agentIds[0].toLowerCase()}, @${agentIds[1].toLowerCase()} y @${agentIds[2].toLowerCase()}`;
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

function buildApexExtractiveResponse(task: string, context: string) {
  const snippets = context
    .split("\n\n")
    .filter(Boolean)
    .slice(0, 3)
    .map((chunk, index) => `- [${index + 1}] ${clip(chunk.replace(/\s+/g, " "), 220)}`);

  return [
    "Diagnóstico técnico",
    `- APEX enfocó la revisión sobre "${task}".`,
    "Superficie detectada",
    ...(snippets.length > 0 ? snippets : ["- No encontré archivos obvios en el repo para esta consulta."]),
    "Próximo paso",
    "- Validá el cambio mínimo en el área afectada y corré typecheck, lint y build antes de cerrar.",
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
    message: `Puedo ayudarte con "${task}". Si querés más precisión, derivame a @scout, @apex, @forge, @vera, @echo, @vox o @zion.`,
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
  const specialists = steps.filter((step) => step.agentId !== "ARIA");
  if (specialists.length === 0) {
    return `Cierro el seguimiento de "${task}" sin respuestas especialistas disponibles todavía.`;
  }

  return [
    `Cierre coordinado para "${task}":`,
    ...specialists.map((step) => {
      const firstLine = step.message.split("\n").find((line) => line.trim()) ?? "sin novedad";
      return `- ${step.agentId}: ${clip(firstLine.replace(/^-+\s*/, ""), 140)}`;
    }),
  ].join("\n");
}

function buildAriaStep(
  task: string,
  message: string,
  thought: string,
  teamModeEnabled: boolean,
  coordination: Partial<Pick<AgentStep, "lane" | "zone" | "interactionTargetId" | "statusDetail" | "handoffTargets">> = {}
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
      },
      teamAssignments,
      teamModeEnabled
    ),
    coordination
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
  return attachTeamData(
    {
      agentId,
      task,
      provider: generation.provider,
      thought: buildOperationalThought(agentId, task, teamAssignments),
      message: cleaned || generation.text,
    },
    teamAssignments,
    teamModeEnabled
  );
}

async function runScout(task: string, roster: string, teamModeEnabled: boolean) {
  const { teamAssignments, teamContext } = buildTeamContext("SCOUT", task, teamModeEnabled);

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

  const extractiveMessage = buildScoutExtractiveResponse(task, results);
  const synthesisMode = getScoutSynthesisMode();

  if (synthesisMode === "extractive") {
    return attachTeamData(
      {
        agentId: "SCOUT",
        task,
        provider: "stub",
        thought: buildOperationalThought("SCOUT", task, teamAssignments, results.length),
        message: extractiveMessage,
        sources: results.map(({ title, url, snippet }) => ({ title, url, snippet })),
      },
      teamAssignments,
      teamModeEnabled
    );
  }

  const generation = await tryGenerateWithOptions(
    `${AGENT_PROMPTS.SCOUT}${roster}\nActuás como un investigador estilo Perplexity: navegás, contrastás y citás solo lo que aparece en fuentes reales.`,
    [
      `Consulta:\n${task}`,
      teamContext ? `Contexto de squad:\n${teamContext}` : "",
      `Contexto web:\n${scoutContextBlock(results)}`,
      "Instrucciones:\n- Respondé con: Resumen ejecutivo, Hallazgos clave, Oportunidades, Riesgos y Fuentes.\n- Citá afirmaciones con [1], [2], etc.\n- Si algo no está soportado por las fuentes, no lo inventes.\n- Mantené la respuesta en no más de 7 bullets.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    {
      agentId: "SCOUT",
      maxOutputTokens: 120,
      timeoutMs: 12000,
      numCtx: 2048,
    }
  );

  if (!generation.text) {
    return attachTeamData(
      {
        agentId: "SCOUT",
        task,
        provider: "stub",
        thought: `${buildOperationalThought("SCOUT", task, teamAssignments, results.length)} La síntesis volvió en modo extractivo por presupuesto de tiempo.`,
        message: extractiveMessage,
        sources: results.map(({ title, url, snippet }) => ({ title, url, snippet })),
      },
      teamAssignments,
      teamModeEnabled
    );
  }

  const cleaned = stripThoughtTags(generation.text);
  const message = /fuentes:/i.test(cleaned) ? cleaned : `${cleaned}\n\n${sourceBlock(results)}`.trim();

  return attachTeamData(
    {
      agentId: "SCOUT",
      task,
      provider: generation.provider,
      thought: buildOperationalThought("SCOUT", task, teamAssignments, results.length),
      message,
      sources: results.map(({ title, url, snippet }) => ({ title, url, snippet })),
    },
    teamAssignments,
    teamModeEnabled
  );
}

async function runApex(task: string, roster: string, teamModeEnabled: boolean) {
  const context = await repoContext(task);
  return runGeneric(
    "APEX",
    task,
    roster,
    teamModeEnabled,
    context || "No encontré matches claros en el repo actual.",
    "- Si proponés cambios, nombrá archivos o áreas afectadas.\n- Cerrá con validaciones o riesgos concretos."
  );
}

async function runRapidScout(task: string, teamModeEnabled: boolean) {
  const { teamAssignments } = buildTeamContext("SCOUT", task, teamModeEnabled);

  try {
    const results = await searchWeb(task);
    if (results.length === 0) {
      return attachTeamData(fallback("SCOUT", task, "No se obtuvo contexto web útil"), teamAssignments, teamModeEnabled);
    }

    return attachTeamData(
      {
        agentId: "SCOUT",
        task,
        provider: "stub",
        thought: `${buildOperationalThought("SCOUT", task, teamAssignments, results.length)} Ejecuté modo rápido para no frenar al resto de agentes principales.`,
        message: buildScoutExtractiveResponse(task, results.slice(0, 4)),
        sources: results.slice(0, 4).map(({ title, url, snippet }) => ({ title, url, snippet })),
      },
      teamAssignments,
      teamModeEnabled
    );
  } catch (error) {
    return attachTeamData(fallback("SCOUT", task, getErrorMessage(error)), teamAssignments, teamModeEnabled);
  }
}

async function runRapidSpecialist(agentId: Exclude<AgentId, "ARIA" | "SCOUT" | "APEX">, task: string, teamModeEnabled: boolean) {
  const { teamAssignments } = buildTeamContext(agentId, task, teamModeEnabled);
  return attachTeamData(
    {
      agentId,
      task,
      provider: "stub",
      thought: buildOperationalThought(agentId, task, teamAssignments),
      message: buildRapidSpecialistResponse(agentId, task),
    },
    teamAssignments,
    teamModeEnabled
  );
}

async function runRapidApex(task: string, teamModeEnabled: boolean) {
  const { teamAssignments } = buildTeamContext("APEX", task, teamModeEnabled);
  const context = await repoContext(task);
  return attachTeamData(
    {
      agentId: "APEX",
      task,
      provider: "stub",
      thought: buildOperationalThought("APEX", task, teamAssignments),
      message: buildApexExtractiveResponse(task, context),
    },
    teamAssignments,
    teamModeEnabled
  );
}

async function execute(agentId: AgentId, task: string, roster: string, teamModeEnabled: boolean, rapidMode = false) {
  if (agentId === "SCOUT") return rapidMode ? runRapidScout(task, teamModeEnabled) : runScout(task, roster, teamModeEnabled);
  if (agentId === "APEX") return rapidMode ? runRapidApex(task, teamModeEnabled) : runApex(task, roster, teamModeEnabled);
  if (rapidMode && agentId !== "ARIA") {
    return runRapidSpecialist(agentId as Exclude<AgentId, "ARIA" | "SCOUT" | "APEX">, task, teamModeEnabled);
  }
  if (agentId === "FORGE") {
    return runGeneric("FORGE", task, roster, teamModeEnabled, "", "- Si aparece n8n o Docker, priorizá flujo local y gratis.");
  }
  if (agentId === "ARIA") {
    return runGeneric(
      "ARIA",
      task,
      roster,
      teamModeEnabled,
      "",
      "- Respondé como cerebro principal y secretaria.\n- Si conviene delegar, sugerí el especialista adecuado en una línea final."
    );
  }
  return runGeneric(agentId, task, roster, teamModeEnabled);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OrchestratorRequest;
    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      return NextResponse.json({ error: "Prompt inválido." }, { status: 400 });
    }

    const currentAgents = Array.isArray(body.currentAgents) ? body.currentAgents.filter(isAgentDescriptor) : [];
    const prompt = body.prompt.trim();
    const teamModeEnabled = isTeamModeEnabled(body.teamMode);
    const structuredResponse = getStructuredAriaResponse(prompt, teamModeEnabled);
    if (structuredResponse) {
      return NextResponse.json({ steps: structuredResponse });
    }
    const fastResponse = getFastAriaResponse(prompt, teamModeEnabled);
    if (fastResponse) {
      return NextResponse.json({ steps: fastResponse });
    }

    const routePlan = plan(prompt);
    const roster = rosterContext(currentAgents);
    const steps: AgentStep[] = [];

    if (routePlan.delegatedAgents.length > 0) {
      const delegatedMentions = joinAgentMentions(routePlan.delegatedAgents);
      const delegationLabel = routePlan.delegatedAgents.map((agentId) => AGENT_LABELS[agentId]).join(", ");
      steps.push(
        buildAriaStep(
          routePlan.task,
          routePlan.delegatedAgents.length === 1
            ? `Recibido. Tomo el pedido como secretaria central y lo derivo a ${delegatedMentions} como agente principal.\n\nEncargo: ${routePlan.task}`
            : `Recibido. Activo a ${delegatedMentions} como agentes principales en paralelo para cubrir el pedido desde varios frentes.\n\nEncargo compartido: ${routePlan.task}`,
          routePlan.delegatedAgents.length === 1
            ? `INBOX clasificó la intención. SWITCH asignó ${delegationLabel} y LEDGER abrió seguimiento para que el pedido no pierda contexto.`
            : `INBOX detectó un pedido multi-frente. SWITCH activó ${delegationLabel} como lanes de trabajo y LEDGER dejó coordinación abierta para consolidar resultados sin sumar latencia.`,
          teamModeEnabled,
          {
            zone: "collab",
            statusDetail:
              routePlan.delegatedAgents.length === 1
                ? "DERIVANDO A PRINCIPAL"
                : `DERIVANDO A ${routePlan.delegatedAgents.length} PRINCIPALES`,
            handoffTargets: routePlan.delegatedAgents,
          }
        )
      );

      const delegatedResults = await Promise.allSettled(
        routePlan.delegatedAgents.map((agentId, index) =>
          withTimeout(
            execute(agentId, routePlan.task, roster, teamModeEnabled, routePlan.delegatedAgents.length > 1).then((step) =>
              attachCoordinationData(step, {
                lane: getLeadLane(index),
                zone: "collab",
                interactionTargetId: "aria",
                statusDetail: getLeadStatusLabel(agentId, getLeadLane(index)),
              })
            ),
            routePlan.delegatedAgents.length > 1 ? 4500 : 5000,
            () =>
              attachCoordinationData(fallback(agentId, routePlan.task, "Timeout operativo > 5s"), {
                lane: getLeadLane(index),
                zone: "collab",
                interactionTargetId: "aria",
                statusDetail: getLeadStatusLabel(agentId, getLeadLane(index)),
              })
          )
        )
      );

      const fulfilledSteps: AgentStep[] = [];
      delegatedResults.forEach((result, index) => {
        const agentId = routePlan.delegatedAgents[index];
        if (result.status === "fulfilled") {
          fulfilledSteps.push(result.value);
          steps.push(result.value);
          return;
        }

        steps.push(
          attachCoordinationData(fallback(agentId, routePlan.task, getErrorMessage(result.reason)), {
            lane: getLeadLane(index),
            zone: "collab",
            interactionTargetId: "aria",
            statusDetail: getLeadStatusLabel(agentId, getLeadLane(index)),
          })
        );
      });

      steps.push(
        buildAriaStep(
          routePlan.task,
          buildAriaLeadWrapUp(routePlan.task, fulfilledSteps),
          routePlan.delegatedAgents.length === 1
            ? `ARIA cerró el handoff con ${routePlan.delegatedAgents[0]} y devolvió el resumen consolidado.`
            : `ARIA sincronizó ${routePlan.delegatedAgents.length} lanes, deduplicó hallazgos y devolvió un cierre único para "${routePlan.task}".`,
          teamModeEnabled,
          {
            zone: "collab",
            statusDetail: routePlan.delegatedAgents.length === 1 ? "CIERRE PRINCIPAL" : `SYNC ${routePlan.delegatedAgents.length} LANES`,
            handoffTargets: routePlan.delegatedAgents,
          }
        )
      );
    } else {
      steps.push(await execute("ARIA", routePlan.task, roster, teamModeEnabled));
    }

    return NextResponse.json({ steps });
  } catch (error) {
    console.error("Error en el Orquestador:", error);
    return NextResponse.json({
      steps: [
        {
          agentId: "ARIA",
          task: "soporte",
          provider: "stub",
          thought: `Hubo un error en el backend. ${getErrorMessage(error)}`,
          message: "La oficina sigue en pie, pero este pedido falló. Probá otra vez y, si persiste, reviso el orquestador.",
        },
      ],
    });
  }
}
