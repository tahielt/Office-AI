import { NAME_MAP } from "./config";
import { AgentId, RoutePlan, SpecialistAgentId } from "./types";
import { normalizePlainText, stripLeadingMention } from "./text";

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

export function normalizeAgentId(value: string | null | undefined): AgentId | null {
  if (!value) return null;
  return NAME_MAP[value.replace(/^@/, "").trim().toUpperCase()] ?? null;
}

export function extractMentionedAgents(prompt: string) {
  const mentioned = [...prompt.matchAll(/@(\w+)/gi)]
    .map((item) => normalizeAgentId(item[1]))
    .filter((item): item is SpecialistAgentId => Boolean(item && item !== "ARIA"));
  return [...new Set(mentioned)].slice(0, 3);
}

export function extractDelegatedTask(prompt: string, delegatedAgents: AgentId[]) {
  let cleaned = stripLeadingMention(prompt);
  cleaned = cleaned.replace(/^(decile|pedile|delegale|asignale|dile|activa|convoca|suma|pone)\s+/i, "");
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

  if (scored.length === 0) return [];

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
  if (!COMMERCIAL_INTENT_PATTERN.test(normalized)) return [];

  const selected: SpecialistAgentId[] = [];
  if (COMMERCIAL_DISCOVERY_PATTERN.test(normalized)) selected.push("SCOUT");
  selected.push("ZION");
  if (OPERATIONAL_EXECUTION_PATTERN.test(normalized)) selected.push("FORGE");
  selected.push("ECHO");
  return [...new Set(selected)].slice(0, 3);
}

function inferAlphaReadinessAgents(prompt: string) {
  const normalized = normalizePlainText(stripLeadingMention(prompt) || prompt);
  if (!ALPHA_READINESS_PATTERN.test(normalized)) return [];
  if (!OPERATIONAL_EXECUTION_PATTERN.test(normalized) && !/\b(funcional|funcione|usable|estable)\b/i.test(normalized)) {
    return [];
  }

  const selected: SpecialistAgentId[] = [];
  if (OPERATIONAL_EXECUTION_PATTERN.test(normalized)) selected.push("FORGE");
  selected.push("APEX");
  selected.push("ZION");
  return [...new Set(selected)].slice(0, 3);
}

export function buildHeuristicPlan(prompt: string): RoutePlan {
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
  const task =
    delegatedAgents.length > 0 ? extractDelegatedTask(prompt, delegatedAgents) : stripLeadingMention(prompt) || prompt.trim();

  return { entry: "ARIA", delegatedAgents, task };
}
