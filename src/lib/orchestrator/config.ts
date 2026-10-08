import { AgentId, ProviderId } from "./types";

export function getEnvInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getRequestedProvider(): ProviderId {
  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();
  return requested === "gemini" ||
    requested === "openai" ||
    requested === "groq" ||
    requested === "ollama" ||
    requested === "stub"
    ? requested
    : "auto";
}

export function getOllamaBaseUrl() {
  const raw = process.env.OLLAMA_URL?.trim() || "http://127.0.0.1:11434/v1";
  return raw.endsWith("/v1") ? raw : `${raw.replace(/\/+$/, "")}/v1`;
}

export function getOllamaNativeChatUrl() {
  return `${getOllamaBaseUrl().replace(/\/v1$/, "")}/api/chat`;
}

export function getScoutSynthesisMode() {
  const raw = process.env.SCOUT_SYNTHESIS_MODE?.trim().toLowerCase();
  // hybrid = intenta síntesis con modelo sobre contenido real y cae a
  // extractivo si ningún provider responde.
  return raw === "model" || raw === "hybrid" || raw === "extractive" ? raw : "hybrid";
}

export function getOllamaModel(agentId?: AgentId) {
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

/**
 * Defaults sanos para modelos locales en CPU. Antes los timeouts (3.2-6.5s) y
 * tokens (80-160) estaban hardcodeados y mataban a Ollama por timeout. Ahora
 * todo es configurable por env y los defaults asumen ejecución local.
 */
export const CONFIG = {
  get defaultTimeoutMs() {
    return getEnvInt("ORCHESTRATOR_TIMEOUT_MS", 30000);
  },
  get rapidTimeoutMs() {
    return getEnvInt("ORCHESTRATOR_RAPID_TIMEOUT_MS", 20000);
  },
  get apexTimeoutMs() {
    return getEnvInt("ORCHESTRATOR_APEX_TIMEOUT_MS", 45000);
  },
  get plannerTimeoutMs() {
    return getEnvInt("ORCHESTRATOR_PLANNER_TIMEOUT_MS", 25000);
  },
  get subAgentTimeoutMs() {
    return getEnvInt("ORCHESTRATOR_SUBAGENT_TIMEOUT_MS", 20000);
  },
  get leadTokens() {
    return getEnvInt("ORCHESTRATOR_LEAD_TOKENS", 600);
  },
  get rapidTokens() {
    return getEnvInt("ORCHESTRATOR_RAPID_TOKENS", 300);
  },
  get apexTokens() {
    return getEnvInt("ORCHESTRATOR_APEX_TOKENS", 800);
  },
  get plannerTokens() {
    return getEnvInt("ORCHESTRATOR_PLANNER_TOKENS", 300);
  },
  get subAgentTokens() {
    return getEnvInt("ORCHESTRATOR_SUBAGENT_TOKENS", 320);
  },
  get ollamaNumCtx() {
    return getEnvInt("OLLAMA_NUM_CTX", 4096);
  },
  get ollamaKeepAlive() {
    return process.env.OLLAMA_KEEP_ALIVE?.trim() || "15m";
  },
  get maxStoredRuns() {
    return getEnvInt("ORCHESTRATOR_MAX_RUNS", 200);
  },
  get historyTurns() {
    return getEnvInt("ORCHESTRATOR_HISTORY_TURNS", 6);
  },
  /** Cuántas páginas top lee SCOUT en profundidad (0 desactiva la lectura). */
  get scoutPageFetchCount() {
    return getEnvInt("SCOUT_PAGE_FETCH_COUNT", 2);
  },
  get scoutPageExcerptChars() {
    return getEnvInt("SCOUT_PAGE_EXCERPT_CHARS", 1800);
  },
  get scoutPageTimeoutMs() {
    return getEnvInt("SCOUT_PAGE_TIMEOUT_MS", 6000);
  },
} as const;

export const AGENT_PROMPTS: Record<AgentId, string> = {
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

export const AGENT_DIRECTORY: Record<AgentId, { role: string; summary: string }> = {
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

export const NAME_MAP: Record<string, AgentId> = {
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
