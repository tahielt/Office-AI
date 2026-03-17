import { SubAgent, SubAgentStage, TeamAssignment } from "@/types/agent";

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
  objectives: Array<{
    memberId: string;
    objective: string;
    stage: SubAgentStage;
    priority: number;
    dependsOnSubAgentIds?: string[];
    activationHints?: string[];
  }>;
};

const TEAM_BLUEPRINTS: Record<TeamAgentKey, TeamBlueprint> = {
  aria: {
    members: [
      { id: "inbox", name: "INBOX", role: "Triage", specialty: "clasifica pedidos entrantes" },
      { id: "switch", name: "SWITCH", role: "Routing", specialty: "elige el agente correcto y escala" },
      { id: "ledger", name: "LEDGER", role: "Follow-up", specialty: "da seguimiento y deja trazabilidad" },
    ],
    objectives: [
      {
        memberId: "inbox",
        objective: "clasificar la intención principal de \"{task}\"",
        stage: "intake",
        priority: 5,
        activationHints: ["pedido", "necesito", "quiero", "ayuda", "resolver"],
      },
      {
        memberId: "switch",
        objective: "elegir el mejor especialista para ejecutar \"{task}\"",
        stage: "shape",
        priority: 5,
        dependsOnSubAgentIds: ["inbox"],
        activationHints: ["investigar", "backend", "frontend", "estrategia", "n8n", "workflow", "mensaje", "contenido"],
      },
      {
        memberId: "ledger",
        objective: "registrar próximos pasos y dependencias para \"{task}\"",
        stage: "followup",
        priority: 4,
        dependsOnSubAgentIds: ["switch"],
        activationHints: ["plan", "seguimiento", "dependencias", "siguiente paso"],
      },
    ],
  },
  scout: {
    members: [
      { id: "radar", name: "RADAR", role: "Discovery", specialty: "encuentra fuentes y señales" },
      { id: "dossier", name: "DOSSIER", role: "Benchmark", specialty: "compara competidores y patrones" },
      { id: "signal", name: "SIGNAL", role: "Synthesis", specialty: "extrae implicancias y oportunidades" },
    ],
    objectives: [
      {
        memberId: "radar",
        objective: "rastrear fuentes y noticias relevantes sobre \"{task}\"",
        stage: "discover",
        priority: 5,
        activationHints: ["fuentes", "noticias", "web", "mercado", "internet", "research", "competencia"],
      },
      {
        memberId: "dossier",
        objective: "comparar actores, tendencias o benchmarks ligados a \"{task}\"",
        stage: "shape",
        priority: 4,
        dependsOnSubAgentIds: ["radar"],
        activationHints: ["benchmark", "competidores", "comparar", "tendencias", "icp", "segmento"],
      },
      {
        memberId: "signal",
        objective: "sintetizar riesgos y oportunidades accionables para \"{task}\"",
        stage: "synthesize",
        priority: 5,
        dependsOnSubAgentIds: ["radar", "dossier"],
        activationHints: ["oportunidad", "riesgo", "estrategia", "decision", "accionable"],
      },
    ],
  },
  apex: {
    members: [
      { id: "trace", name: "TRACE", role: "Debug", specialty: "encuentra la superficie exacta del problema" },
      { id: "patch", name: "PATCH", role: "Fix", specialty: "propone el cambio minimo viable" },
      { id: "guard", name: "GUARD", role: "QA", specialty: "valida regresiones y estabilidad" },
    ],
    objectives: [
      {
        memberId: "trace",
        objective: "aislar el origen tecnico de \"{task}\"",
        stage: "discover",
        priority: 5,
        activationHints: ["bug", "error", "stack", "falla", "debug", "backend", "frontend"],
      },
      {
        memberId: "patch",
        objective: "proponer una correccion concreta para \"{task}\"",
        stage: "shape",
        priority: 5,
        dependsOnSubAgentIds: ["trace"],
        activationHints: ["fix", "correccion", "refactor", "surface", "archivo", "implementacion"],
      },
      {
        memberId: "guard",
        objective: "definir validaciones y riesgos de despliegue para \"{task}\"",
        stage: "validate",
        priority: 4,
        dependsOnSubAgentIds: ["patch"],
        activationHints: ["test", "regresion", "validar", "deploy", "riesgo"],
      },
    ],
  },
  vera: {
    members: [
      { id: "pulse", name: "PULSE", role: "KPI", specialty: "reune metricas y baseline" },
      { id: "delta", name: "DELTA", role: "Variance", specialty: "detecta cambios y desvios" },
      { id: "prism", name: "PRISM", role: "Narrative", specialty: "traduce datos en decisiones" },
    ],
    objectives: [
      {
        memberId: "pulse",
        objective: "reunir metricas o indicadores clave para \"{task}\"",
        stage: "discover",
        priority: 5,
        activationHints: ["metricas", "kpi", "datos", "indicadores", "baseline"],
      },
      {
        memberId: "delta",
        objective: "comparar periodos, segmentos o desvios dentro de \"{task}\"",
        stage: "shape",
        priority: 4,
        dependsOnSubAgentIds: ["pulse"],
        activationHints: ["comparar", "segmento", "periodo", "desvio", "cohorte", "churn"],
      },
      {
        memberId: "prism",
        objective: "convertir los datos de \"{task}\" en lectura ejecutiva y accionable",
        stage: "synthesize",
        priority: 5,
        dependsOnSubAgentIds: ["pulse", "delta"],
        activationHints: ["lectura", "decision", "ejecutivo", "accionable", "recomendacion"],
      },
    ],
  },
  zion: {
    members: [
      { id: "atlas", name: "ATLAS", role: "Options", specialty: "mapea caminos posibles" },
      { id: "north", name: "NORTH", role: "Prioritization", specialty: "marca foco y secuencia" },
      { id: "board", name: "BOARD", role: "Decision", specialty: "baja estrategia a plan" },
    ],
    objectives: [
      {
        memberId: "atlas",
        objective: "mapear opciones estrategicas para \"{task}\"",
        stage: "discover",
        priority: 5,
        activationHints: ["opciones", "mercado", "gtm", "pricing", "estrategia", "camino"],
      },
      {
        memberId: "north",
        objective: "priorizar trade-offs y orden de ejecucion en \"{task}\"",
        stage: "shape",
        priority: 5,
        dependsOnSubAgentIds: ["atlas"],
        activationHints: ["priorizar", "trade-off", "roadmap", "foco", "secuencia"],
      },
      {
        memberId: "board",
        objective: "definir un plan corto de decisiones para \"{task}\"",
        stage: "synthesize",
        priority: 4,
        dependsOnSubAgentIds: ["atlas", "north"],
        activationHints: ["plan", "decision", "pasos", "ejecucion"],
      },
    ],
  },
  forge: {
    members: [
      { id: "pipe", name: "PIPE", role: "Workflow", specialty: "diseña flujos y nodos" },
      { id: "hook", name: "HOOK", role: "Integration", specialty: "conecta eventos, APIs y webhooks" },
      { id: "link", name: "LINK", role: "Reliability", specialty: "asegura reintentos y observabilidad" },
    ],
    objectives: [
      {
        memberId: "pipe",
        objective: "diagramar el workflow operativo para \"{task}\"",
        stage: "discover",
        priority: 5,
        activationHints: ["workflow", "flujo", "pipeline", "automation", "proceso"],
      },
      {
        memberId: "hook",
        objective: "definir integraciones, triggers y payloads de \"{task}\"",
        stage: "shape",
        priority: 5,
        dependsOnSubAgentIds: ["pipe"],
        activationHints: ["webhook", "api", "trigger", "payload", "n8n", "integracion"],
      },
      {
        memberId: "link",
        objective: "asegurar confiabilidad, logs y recuperacion para \"{task}\"",
        stage: "validate",
        priority: 4,
        dependsOnSubAgentIds: ["pipe", "hook"],
        activationHints: ["retry", "observabilidad", "logs", "timeout", "reintentos", "confiabilidad"],
      },
    ],
  },
  echo: {
    members: [
      { id: "tone", name: "TONE", role: "Voice", specialty: "elige tono y marco del mensaje" },
      { id: "reply", name: "REPLY", role: "Draft", specialty: "redacta la pieza principal" },
      { id: "follow", name: "FOLLOW", role: "CTA", specialty: "optimiza cierre y seguimiento" },
    ],
    objectives: [
      {
        memberId: "tone",
        objective: "definir el tono ideal para \"{task}\"",
        stage: "discover",
        priority: 4,
        activationHints: ["tono", "cliente", "framing", "marca", "outreach"],
      },
      {
        memberId: "reply",
        objective: "redactar el mensaje principal de \"{task}\"",
        stage: "shape",
        priority: 5,
        dependsOnSubAgentIds: ["tone"],
        activationHints: ["email", "mensaje", "copy", "whatsapp", "propuesta", "respuesta"],
      },
      {
        memberId: "follow",
        objective: "ajustar CTA, seguimiento o cierre para \"{task}\"",
        stage: "validate",
        priority: 4,
        dependsOnSubAgentIds: ["reply"],
        activationHints: ["cta", "follow up", "seguimiento", "cierre"],
      },
    ],
  },
  vox: {
    members: [
      { id: "hook", name: "HOOK", role: "Angle", specialty: "crea el angulo de entrada" },
      { id: "frame", name: "FRAME", role: "Structure", specialty: "ordena el formato y beats" },
      { id: "spark", name: "SPARK", role: "Creative", specialty: "potencia retencion y CTA" },
    ],
    objectives: [
      {
        memberId: "hook",
        objective: "definir el hook principal para \"{task}\"",
        stage: "discover",
        priority: 5,
        activationHints: ["hook", "idea", "angulo", "viral", "captar atencion"],
      },
      {
        memberId: "frame",
        objective: "estructurar las piezas o formatos de \"{task}\"",
        stage: "shape",
        priority: 5,
        dependsOnSubAgentIds: ["hook"],
        activationHints: ["guion", "estructura", "carrusel", "post", "reel", "video"],
      },
      {
        memberId: "spark",
        objective: "maximizar retencion, energia y CTA en \"{task}\"",
        stage: "synthesize",
        priority: 4,
        dependsOnSubAgentIds: ["hook", "frame"],
        activationHints: ["cta", "retencion", "energia", "conversión", "conversion"],
      },
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
  const assignments: TeamAssignment[] = [];

  for (const objectiveConfig of blueprint.objectives) {
    const member = blueprint.members.find((candidate) => candidate.id === objectiveConfig.memberId);
    if (!member) continue;

    assignments.push({
      subAgentId: member.id,
      subAgentName: member.name,
      subAgentRole: member.role,
      objective: objectiveConfig.objective.replaceAll("{task}", task),
      stage: objectiveConfig.stage,
      priority: objectiveConfig.priority,
      dependsOnSubAgentIds: objectiveConfig.dependsOnSubAgentIds ?? [],
      activationHints: objectiveConfig.activationHints ?? [],
    });
  }

  return assignments;
}
