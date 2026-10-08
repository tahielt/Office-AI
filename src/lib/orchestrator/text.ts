import { AgentId } from "./types";

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido";
}

export function normalizePlainText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeHtml(value: string) {
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

export function clip(value: string, max = 320) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trim()}…`;
}

export function stripThoughtTags(text: string) {
  return text.replace(/<THOUGHT>[\s\S]*?<\/THOUGHT>/gi, "").trim();
}

export function cleanStructuredLine(line: string) {
  return line
    .replace(/^[-*•]\s*/u, "")
    .replace(/^\[\d+\]\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function stripLeadingMention(prompt: string) {
  return prompt.replace(/^@\w+\s*/i, "").trim();
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => T): Promise<T> {
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

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function joinAgentMentions(agentIds: string[]) {
  if (agentIds.length === 0) return "";
  if (agentIds.length === 1) return agentIds[0];
  if (agentIds.length === 2) return `${agentIds[0]} y ${agentIds[1]}`;
  return `${agentIds[0]}, ${agentIds[1]} y ${agentIds[2]}`;
}

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
} as const;

function getSectionBucket(line: string): keyof typeof SECTION_BUCKETS | null {
  const normalized = normalizePlainText(line).replace(/[:\s]+$/g, "");
  if (SECTION_BUCKETS.summary.has(normalized)) return "summary";
  if (SECTION_BUCKETS.evidence.has(normalized)) return "evidence";
  if (SECTION_BUCKETS.risks.has(normalized)) return "risks";
  if (SECTION_BUCKETS.nextSteps.has(normalized)) return "nextSteps";
  return null;
}

export function parseStructuredMessage(message: string) {
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

export function buildDefaultRisks(agentId: AgentId, task: string) {
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

export function buildDefaultNextSteps(agentId: AgentId, task: string) {
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
