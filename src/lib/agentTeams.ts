import { SubAgent, TeamAssignment } from "@/types/agent";

export type TeamAgentKey =
  | "aria"
  | "scout"
  | "apex"
  | "vera"
  | "zion"
  | "forge"
  | "echo"
  | "vox";

type TeamBlueprint = {
  members: SubAgent[];
  objectives: string[];
};

const TEAM_BLUEPRINTS: Record<TeamAgentKey, TeamBlueprint> = {
  aria: {
    members: [
      { id: "inbox", name: "INBOX", role: "Triage", specialty: "clasifica pedidos entrantes" },
      { id: "switch", name: "SWITCH", role: "Routing", specialty: "elige el agente correcto y escala" },
      { id: "ledger", name: "LEDGER", role: "Follow-up", specialty: "da seguimiento y deja trazabilidad" },
    ],
    objectives: [
      "clasificar la intención principal de \"{task}\"",
      "elegir el mejor especialista para ejecutar \"{task}\"",
      "registrar próximos pasos y dependencias para \"{task}\"",
    ],
  },
  scout: {
    members: [
      { id: "radar", name: "RADAR", role: "Discovery", specialty: "encuentra fuentes y señales" },
      { id: "dossier", name: "DOSSIER", role: "Benchmark", specialty: "compara competidores y patrones" },
      { id: "signal", name: "SIGNAL", role: "Synthesis", specialty: "extrae implicancias y oportunidades" },
    ],
    objectives: [
      "rastrear fuentes y noticias relevantes sobre \"{task}\"",
      "comparar actores, tendencias o benchmarks ligados a \"{task}\"",
      "sintetizar riesgos y oportunidades accionables para \"{task}\"",
    ],
  },
  apex: {
    members: [
      { id: "trace", name: "TRACE", role: "Debug", specialty: "encuentra la superficie exacta del problema" },
      { id: "patch", name: "PATCH", role: "Fix", specialty: "propone el cambio minimo viable" },
      { id: "guard", name: "GUARD", role: "QA", specialty: "valida regresiones y estabilidad" },
    ],
    objectives: [
      "aislar el origen tecnico de \"{task}\"",
      "proponer una correccion concreta para \"{task}\"",
      "definir validaciones y riesgos de despliegue para \"{task}\"",
    ],
  },
  vera: {
    members: [
      { id: "pulse", name: "PULSE", role: "KPI", specialty: "reune metricas y baseline" },
      { id: "delta", name: "DELTA", role: "Variance", specialty: "detecta cambios y desvios" },
      { id: "prism", name: "PRISM", role: "Narrative", specialty: "traduce datos en decisiones" },
    ],
    objectives: [
      "reunir metricas o indicadores clave para \"{task}\"",
      "comparar periodos, segmentos o desvios dentro de \"{task}\"",
      "convertir los datos de \"{task}\" en lectura ejecutiva y accionable",
    ],
  },
  zion: {
    members: [
      { id: "atlas", name: "ATLAS", role: "Options", specialty: "mapea caminos posibles" },
      { id: "north", name: "NORTH", role: "Prioritization", specialty: "marca foco y secuencia" },
      { id: "board", name: "BOARD", role: "Decision", specialty: "baja estrategia a plan" },
    ],
    objectives: [
      "mapear opciones estrategicas para \"{task}\"",
      "priorizar trade-offs y orden de ejecucion en \"{task}\"",
      "definir un plan corto de decisiones para \"{task}\"",
    ],
  },
  forge: {
    members: [
      { id: "pipe", name: "PIPE", role: "Workflow", specialty: "diseña flujos y nodos" },
      { id: "hook", name: "HOOK", role: "Integration", specialty: "conecta eventos, APIs y webhooks" },
      { id: "link", name: "LINK", role: "Reliability", specialty: "asegura reintentos y observabilidad" },
    ],
    objectives: [
      "diagramar el workflow operativo para \"{task}\"",
      "definir integraciones, triggers y payloads de \"{task}\"",
      "asegurar confiabilidad, logs y recuperacion para \"{task}\"",
    ],
  },
  echo: {
    members: [
      { id: "tone", name: "TONE", role: "Voice", specialty: "elige tono y marco del mensaje" },
      { id: "reply", name: "REPLY", role: "Draft", specialty: "redacta la pieza principal" },
      { id: "follow", name: "FOLLOW", role: "CTA", specialty: "optimiza cierre y seguimiento" },
    ],
    objectives: [
      "definir el tono ideal para \"{task}\"",
      "redactar el mensaje principal de \"{task}\"",
      "ajustar CTA, seguimiento o cierre para \"{task}\"",
    ],
  },
  vox: {
    members: [
      { id: "hook", name: "HOOK", role: "Angle", specialty: "crea el angulo de entrada" },
      { id: "frame", name: "FRAME", role: "Structure", specialty: "ordena el formato y beats" },
      { id: "spark", name: "SPARK", role: "Creative", specialty: "potencia retencion y CTA" },
    ],
    objectives: [
      "definir el hook principal para \"{task}\"",
      "estructurar las piezas o formatos de \"{task}\"",
      "maximizar retencion, energia y CTA en \"{task}\"",
    ],
  },
};

function normalizeTeamKey(agentId: string): TeamAgentKey | null {
  const normalized = agentId.replace(/^@/, "").trim().toLowerCase();

  if (normalized === "lyra") return "scout";
  if (normalized === "pulse") return "vox";
  if (
    normalized === "aria" ||
    normalized === "scout" ||
    normalized === "apex" ||
    normalized === "vera" ||
    normalized === "zion" ||
    normalized === "forge" ||
    normalized === "echo" ||
    normalized === "vox"
  ) {
    return normalized;
  }

  return null;
}

export function getTeamMembersForAgent(agentId: string): SubAgent[] {
  const key = normalizeTeamKey(agentId);
  return key ? TEAM_BLUEPRINTS[key].members : [];
}

export function buildTeamAssignments(agentId: string, task: string): TeamAssignment[] {
  const key = normalizeTeamKey(agentId);
  if (!key) return [];

  const blueprint = TEAM_BLUEPRINTS[key];
  return blueprint.members.map((member, index) => ({
    subAgentId: member.id,
    subAgentName: member.name,
    subAgentRole: member.role,
    objective: blueprint.objectives[index].replaceAll("{task}", task),
  }));
}
