import { promises as fs } from "node:fs";
import path from "node:path";

import { buildTeamAssignments } from "@/lib/agentTeams";
import { TeamAssignment } from "@/types/agent";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AgentId = "SCOUT" | "APEX" | "VERA" | "ZION" | "FORGE" | "ECHO" | "VOX" | "ARIA";
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

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  pageExcerpt?: string;
}

interface AgentStep {
  agentId: AgentId;
  task: string;
  thought: string;
  message: string;
  provider: ProviderId;
  teamAssignments?: TeamAssignment[];
  teamModeUsed?: boolean;
  sources?: SearchResult[];
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

function splitThought(text: string) {
  const match = text.match(/<THOUGHT>([\s\S]*?)<\/THOUGHT>/i);
  if (!match) {
    return {
      thought: "",
      message: text
        .replace(/^\*\*<THOUGHT>\*\*\s*/i, "")
        .replace(/^<THOUGHT>\s*/i, "")
        .replace(/<\/THOUGHT>/gi, "")
        .trim(),
    };
  }
  return {
    thought: match[1].replace(/\s+/g, " ").trim(),
    message: text.slice((match.index ?? 0) + match[0].length).trim(),
  };
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

function classifyAgent(prompt: string): AgentId {
  const lower = prompt.toLowerCase();
  if (/(código|codigo|bug|error|función|funcion|typescript|react|next|repo|archivo)/.test(lower)) return "APEX";
  if (/(datos|métrica|metrica|análisis|analisis|forecast|dashboard)/.test(lower)) return "VERA";
  if (/(mercado|competencia|tendencia|investig|buscar|web|internet|noticia)/.test(lower)) return "SCOUT";
  if (/(email|mensaje|redactar|respuesta|cliente)/.test(lower)) return "ECHO";
  if (/(automatiz|integrar|api|webhook|workflow|n8n|docker)/.test(lower)) return "FORGE";
  if (/(reel|post|contenido|instagram|linkedin|youtube|tiktok)/.test(lower)) return "VOX";
  if (/(estrategia|negocio|roadmap|prioridad|\/summon_all|\/report)/.test(lower)) return "ZION";
  return "ARIA";
}

function stripLeadingMention(prompt: string) {
  return prompt.replace(/^@\w+\s*/i, "").trim();
}

function extractDelegatedTask(prompt: string, delegated: AgentId) {
  const name = delegated.toLowerCase();
  return (
    stripLeadingMention(prompt)
      .replace(
        new RegExp(`^(decile|decíle|pedile|pedíle|delegale|delegá|pasale|encargale|asignale|dile)\\s+(a\\s+)?@${name}\\s+(que\\s+)?`, "i"),
        ""
      )
      .replace(new RegExp(`^@${name}\\s+`, "i"), "")
      .replace(new RegExp(`@${name}\\b`, "ig"), "")
      .replace(/^(que|sobre|para|por favor)\s+/i, "")
      .trim() ||
    stripLeadingMention(prompt) ||
    prompt.trim()
  );
}

function plan(prompt: string) {
  const mentions = [...prompt.matchAll(/@(\w+)/gi)]
    .map((item) => normalizeAgentId(item[1]))
    .filter(Boolean) as AgentId[];

  const delegated = mentions.find((item) => item !== "ARIA") ?? null;
  if (delegated) {
    return {
      entry: "ARIA" as AgentId,
      delegated,
      task: extractDelegatedTask(prompt, delegated),
    };
  }

  const normalizedPrompt = stripLeadingMention(prompt) || prompt.trim();
  const inferred = classifyAgent(normalizedPrompt);
  return {
    entry: "ARIA" as AgentId,
    delegated: inferred === "ARIA" ? null : inferred,
    task: normalizedPrompt,
  };
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

async function tryGenerate(system: string, prompt: string, maxOutputTokens = 800) {
  const preferred = getRequestedProvider();
  if (preferred === "stub") return { text: null, provider: "stub" as ProviderId, errors: ["AI_PROVIDER=stub"] };

  const errors: string[] = [];
  const providers = getProviders().filter((provider) => provider.enabled && (preferred === "auto" || provider.id === preferred));

  for (const provider of providers) {
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

  return [...new Set(variants)].slice(0, 3);
}

async function searchDuckDuckGo(query: string) {
  const response = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": SEARCH_UA, Accept: "text/html,application/xhtml+xml" },
  });

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
  const queries = buildScoutQueries(task);
  const combined: SearchResult[] = [];
  const errors: string[] = [];

  for (const query of queries) {
    try {
      const results = await searchDuckDuckGo(query);
      for (const result of results) {
        if (combined.some((item) => item.url === result.url)) continue;
        combined.push(result);
        if (combined.length >= 5) break;
      }
      if (combined.length >= 5) break;
    } catch (error) {
      errors.push(`${query}: ${getErrorMessage(error)}`);
    }
  }

  if (combined.length === 0 && errors.length > 0) {
    throw new Error(errors.join(" | "));
  }

  return combined.slice(0, 5);
}

function extractReadableText(html: string) {
  const text = decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<img[^>]*>/gi, " ")
      .replace(/<\/(p|div|li|section|article|h1|h2|h3|h4|h5|h6)>/gi, "\n")
  );

  return clip(text.replace(/\s+/g, " ").trim(), 1400);
}

async function enrichResults(results: SearchResult[]) {
  const primaryResults = results.slice(0, 3);
  const settled = await Promise.allSettled(
    primaryResults.map(async (result) => {
      const response = await fetchWithTimeout(
        result.url,
        {
          headers: { "User-Agent": SEARCH_UA, Accept: "text/html,application/xhtml+xml" },
        },
        6000
      );

      if (!response.ok) {
        throw new Error(`Fuente ${result.url} devolvió ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return result;
      }

      const html = await response.text();
      return { ...result, pageExcerpt: extractReadableText(html) };
    })
  );

  return results.map((result, index) => {
    const settledResult = settled[index];
    if (index >= primaryResults.length || !settledResult || settledResult.status !== "fulfilled") {
      return result;
    }
    return settledResult.value;
  });
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
    if (matches.length >= 6) break;

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

function buildAriaStep(task: string, message: string, thought: string, teamModeEnabled: boolean) {
  const { teamAssignments } = buildTeamContext("ARIA", task, teamModeEnabled);
  return attachTeamData(
    {
      agentId: "ARIA",
      task,
      provider: "stub",
      thought,
      message,
    },
    teamAssignments,
    teamModeEnabled
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
  const generation = await tryGenerate(
    `${AGENT_PROMPTS[agentId]}${roster}`,
    [
      `Consulta:\n${task}`,
      teamContext ? `Contexto de squad:\n${teamContext}` : "",
      context ? `Contexto:\n${context}` : "",
      `Instrucciones:\n- Primero devolvé <THOUGHT>...</THOUGHT>.\n- Después respondé con una salida concreta.\n- Si el squad interno está activo, integrá sus frentes como un único equipo coordinado.\n${extra}`.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
    agentId === "ARIA" ? 500 : 700
  );

  if (!generation.text) {
    return attachTeamData(fallback(agentId, task, generation.errors.join(" | ")), teamAssignments, teamModeEnabled);
  }

  const parts = splitThought(generation.text);
  return attachTeamData(
    {
      agentId,
      task,
      provider: generation.provider,
      thought: parts.thought || `Procesé la consulta como ${agentId}.`,
      message: parts.message || generation.text,
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
    if (results.length > 0) {
      results = await enrichResults(results);
    }
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

  const generation = await tryGenerate(
    `${AGENT_PROMPTS.SCOUT}${roster}\nActuás como un investigador estilo Perplexity: navegás, contrastás y citás solo lo que aparece en fuentes reales.`,
    [
      `Consulta:\n${task}`,
      teamContext ? `Contexto de squad:\n${teamContext}` : "",
      `Contexto web:\n${scoutContextBlock(results)}`,
      'Instrucciones:\n- Primero devolvé <THOUGHT>...</THOUGHT> contando cómo trabajó tu squad interno.\n- Luego respondé con: Resumen ejecutivo, Hallazgos clave, Oportunidades, Riesgos, Próximos pasos y Fuentes.\n- Citá afirmaciones con [1], [2], etc.\n- Si algo no está soportado por las fuentes, no lo inventes.\n- Mantené la respuesta concreta y accionable.',
    ]
      .filter(Boolean)
      .join("\n\n"),
    900
  );

  if (!generation.text) {
    return attachTeamData(
      fallback("SCOUT", task, [searchError, ...generation.errors].filter(Boolean).join(" | "), results),
      teamAssignments,
      teamModeEnabled
    );
  }

  const parts = splitThought(generation.text);
  const message = /fuentes:/i.test(parts.message) ? parts.message : `${parts.message}\n\n${sourceBlock(results)}`.trim();

  return attachTeamData(
    {
      agentId: "SCOUT",
      task,
      provider: generation.provider,
      thought: parts.thought || `RADAR reunió fuentes, DOSSIER comparó patrones y SIGNAL sintetizó hallazgos para "${task}".`,
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

async function execute(agentId: AgentId, task: string, roster: string, teamModeEnabled: boolean) {
  if (agentId === "SCOUT") return runScout(task, roster, teamModeEnabled);
  if (agentId === "APEX") return runApex(task, roster, teamModeEnabled);
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
    const fastResponse = getFastAriaResponse(prompt, teamModeEnabled);
    if (fastResponse) {
      return NextResponse.json({ steps: fastResponse });
    }

    const routePlan = plan(prompt);
    const roster = rosterContext(currentAgents);
    const steps: AgentStep[] = [];

    if (routePlan.delegated) {
      steps.push(
        buildAriaStep(
          routePlan.task,
          `Recibido. Tomo el pedido como secretaria central y lo derivo a @${routePlan.delegated.toLowerCase()}.\n\nEncargo: ${routePlan.task}`,
          `INBOX clasificó la intención. SWITCH asignó ${AGENT_LABELS[routePlan.delegated]} y LEDGER abrió seguimiento para que el pedido no pierda contexto.`,
          teamModeEnabled
        )
      );
      steps.push(await execute(routePlan.delegated, routePlan.task, roster, teamModeEnabled));
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
