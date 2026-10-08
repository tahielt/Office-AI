import { AgentId, AgentStep, AgentStructuredOutput, SearchResult, SubAgentStep } from "./types";
import {
  buildDefaultNextSteps,
  buildDefaultRisks,
  cleanStructuredLine,
  clip,
  dedupeStrings,
  normalizePlainText,
  parseStructuredMessage,
} from "./text";
import { selectRelevantEvidence } from "./search";

export function formatStructuredOutput(output: AgentStructuredOutput) {
  const lines = ["Resumen", `- ${output.summary}`];

  if (output.evidence.length > 0) {
    lines.push("Evidencia");
    lines.push(...output.evidence.slice(0, 3).map((item) => `- ${item.claim}${item.url ? ` (${item.url})` : ""}`));
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

export function deriveStructuredOutputFromMessage(
  agentId: AgentId,
  task: string,
  message: string,
  sources: SearchResult[] = []
): AgentStructuredOutput {
  const sections = parseStructuredMessage(message);
  const summary =
    sections.summary[0] ?? sections.evidence[0] ?? sections.misc[0] ?? `No hubo un resumen estructurado para "${task}".`;

  const evidenceFromMessage = dedupeStrings([...sections.evidence, ...sections.misc.slice(1, 3)])
    .slice(0, 3)
    .map((item, index) => ({ title: `${agentId} evidence ${index + 1}`, claim: item }));

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

export function buildScoutStructuredOutput(
  task: string,
  results: SearchResult[],
  message: string,
  riskBuilder: (task: string, results: SearchResult[]) => string[],
  opportunityBuilder: (task: string, results: SearchResult[]) => string[]
): AgentStructuredOutput {
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
    risks: riskBuilder(task, results),
    nextSteps: opportunityBuilder(task, results),
    artifacts: [{ kind: "research-brief", title: "Scout research brief", content: clip(message.replace(/\s+/g, " "), 320) }],
  };
}

export function buildApexStructuredOutput(task: string, context: string, message: string): AgentStructuredOutput {
  const snippets = context
    .split("\n\n")
    .filter(Boolean)
    .slice(0, 3)
    .map((chunk, index) => ({ title: `Repo snippet ${index + 1}`, claim: clip(chunk.replace(/\s+/g, " "), 220) }));

  return {
    summary: `APEX revisó el repo para "${task}" y detectó la superficie mínima a tocar.`,
    evidence:
      snippets.length > 0
        ? snippets
        : [{ title: "Repo scan", claim: "No encontré archivos obvios en el repo actual para esta consulta." }],
    risks: [`Sin validar el cambio mínimo para "${task}", el fix puede quedar incompleto.`],
    nextSteps: [`Aplicar el cambio mínimo para "${task}" y correr typecheck, lint y build.`],
    artifacts: [{ kind: "technical-note", title: "Apex technical note", content: clip(message.replace(/\s+/g, " "), 320) }],
  };
}

export function buildAriaStructuredOutput(task: string, steps: AgentStep[]): AgentStructuredOutput {
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
    nextSteps:
      nextSteps.length > 0
        ? nextSteps
        : [`Elegir el siguiente paso más corto para "${task}" y pedir aprobación humana antes de ejecutar.`],
    artifacts,
  };
}

export function buildOutputFromSubSteps(
  agentId: AgentId,
  task: string,
  subSteps: SubAgentStep[],
  sources: SearchResult[] = []
): AgentStructuredOutput {
  const summaryHighlights = dedupeStrings(
    subSteps.map((step) => step.output?.summary ?? cleanStructuredLine(step.message)).filter(Boolean)
  ).slice(0, 2);

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
        ? clip(`${agentId} consolidó ${subSteps.length} subagentes: ${summaryHighlights.join(" / ")}`, 220)
        : `${agentId} consolidó ${subSteps.length} subagentes internos para "${task}".`,
    evidence: evidence.slice(0, 4),
    risks: risks.length > 0 ? risks : buildDefaultRisks(agentId, task),
    nextSteps: nextSteps.length > 0 ? nextSteps : buildDefaultNextSteps(agentId, task),
    artifacts: subSteps.slice(0, 3).map((step) => ({
      kind: "subagent-note",
      title: `${step.subAgentName} output`,
      content: clip(step.message.replace(/\s+/g, " "), 320),
    })),
  };
}

const SCOUT_THEME_RULES: Array<{ pattern: RegExp; theme: string }> = [
  { pattern: /(orquesta|orchestrat|patrones|pattern)/, theme: "patrones de orquestación" },
  { pattern: /(centraliz|descentraliz|concurrent|secuencial|grupo|transfer|worker)/, theme: "coordinación y topologías" },
  { pattern: /(estado|state|error|retry|reintento|observab|trace|logging|log)/, theme: "estado y confiabilidad" },
  { pattern: /(scale|scalability|latencia|throughput|capacidad|parallel|queue|async)/, theme: "capacidad y latencia" },
  { pattern: /(tool|workflow|api|webhook|n8n|docker|integraci)/, theme: "tooling y ejecución" },
];

function buildScoutSignalCorpus(task: string, results: SearchResult[]) {
  return normalizePlainText(`${task} ${results.map((result) => `${result.title} ${result.snippet}`).join(" ")}`);
}

export function buildTopThemes(task: string, results: SearchResult[]) {
  const corpus = buildScoutSignalCorpus(task, results);
  return SCOUT_THEME_RULES.filter((rule) => rule.pattern.test(corpus))
    .map((rule) => rule.theme)
    .slice(0, 3);
}

export function buildScoutOpportunities(task: string, results: SearchResult[]) {
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

export function buildScoutRisks(task: string, results: SearchResult[]) {
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

export function buildScoutExtractiveResponse(task: string, results: SearchResult[]) {
  const topThemes = buildTopThemes(task, results);
  const executiveLine =
    topThemes.length > 0
      ? `Las fuentes se concentran en ${topThemes.join(", ")} como ejes para abordar "${task}".`
      : `Las fuentes recuperadas aportan señales útiles para orientar "${task}".`;
  const findings = results.slice(0, 3).map((result, index) => `- [${index + 1}] ${selectRelevantEvidence(result, task)}`);
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

export function buildRapidSpecialistResponse(agentId: Exclude<AgentId, "ARIA" | "SCOUT" | "APEX">, task: string) {
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
      "- `intake-router`: recibe el pedido, normaliza payload y decide los 2 team leads.",
      "- `lead-brief-builder`: arma briefs cortos por lead con contexto mínimo y timeout corto.",
      "- `specialist-runner`: ejecuta cada squad en paralelo con respuesta resumida y logs por turno.",
      "- `response-assembler`: junta salidas, deduplica y devuelve a ARIA un cierre compacto.",
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
