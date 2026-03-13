import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const workflowDir = path.join(repoRoot, 'n8n', 'workflows');
const repoDbPaths = [
  path.join(repoRoot, 'n8n', '.n8n', 'database.sqlite'),
  path.join(repoRoot, 'n8n', '.n8n', '.n8n', 'database.sqlite'),
];

function randomId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function assignment(name, value, type = 'string') {
  return {
    id: randomId(name),
    name,
    value,
    type,
  };
}

function manualTrigger(id, position, name = 'Manual Trigger') {
  return {
    parameters: {},
    id,
    name,
    type: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    position,
  };
}

function executeWorkflowTrigger(id, position, name = 'Execute Workflow Trigger') {
  return {
    parameters: {
      inputSource: 'passthrough',
    },
    id,
    name,
    type: 'n8n-nodes-base.executeWorkflowTrigger',
    typeVersion: 1.1,
    position,
  };
}

function webhook(id, position, name, routePath) {
  return {
    parameters: {
      httpMethod: 'POST',
      path: routePath,
      responseMode: 'responseNode',
    },
    id,
    name,
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2.1,
    position,
  };
}

function respondToWebhook(id, position, name = 'Respond to Webhook') {
  return {
    parameters: {
      respondWith: 'firstIncomingItem',
    },
    id,
    name,
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.5,
    position,
  };
}

function executeWorkflowNode(id, position, name, workflowId) {
  return {
    parameters: {
      source: 'database',
      workflowId,
      mode: 'once',
      options: {
        waitForSubWorkflow: true,
      },
    },
    id,
    name,
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.3,
    position,
  };
}

function setAssignments(id, position, name, assignments) {
  return {
    parameters: {
      assignments: {
        assignments,
      },
      includeOtherFields: true,
    },
    id,
    name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position,
  };
}

function codeNode(id, position, name, jsCode, mode = 'runOnceForAllItems') {
  return {
    parameters: {
      mode,
      jsCode,
    },
    id,
    name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position,
  };
}

function switchNode(id, position, name, outputExpression, numberOutputs = 2) {
  return {
    parameters: {
      mode: 'expression',
      numberOutputs,
      output: outputExpression,
    },
    id,
    name,
    type: 'n8n-nodes-base.switch',
    typeVersion: 3.4,
    position,
  };
}

function mergeNode(id, position, name, numberInputs = 2) {
  return {
    parameters: {
      mode: 'append',
      numberInputs,
    },
    id,
    name,
    type: 'n8n-nodes-base.merge',
    typeVersion: 3.2,
    position,
  };
}

function workflowBase(name, nodes, connections, description) {
  return {
    name,
    nodes,
    connections,
    pinData: {},
    settings: {
      executionOrder: 'v1',
    },
    staticData: null,
    meta: {
      templateCredsSetupCompleted: true,
      officeAiFreeOnly: true,
    },
    active: false,
    description,
  };
}

function buildIntakeRouter() {
  const nodes = [
    webhook('webhook-intake', [240, 260], 'Office Intake Webhook', 'office-ai/intake'),
    manualTrigger('manual-intake', [240, 440], 'Manual Trigger'),
    codeNode(
      'sample-intake-request',
      [520, 440],
      'Sample Intake Request',
      `return [
  {
    json: {
      prompt: 'Investiga competidores, revisa el backend y converti el flujo a n8n gratis',
      source: 'manual',
      requestId: 'manual-' + Date.now(),
    },
  },
];`
    ),
    codeNode(
      'normalize-intake',
      [780, 340],
      'Normalize Intake',
      `const input = items[0]?.json ?? {};
const payload = input.body && typeof input.body === 'object' ? input.body : input;
const prompt = [payload.prompt, payload.task, payload.message, payload.text]
  .find((value) => typeof value === 'string' && value.trim()) ?? 'Analizar la tarea actual de Office AI';
const requested = String(prompt).toLowerCase();
const mentionMap = {
  scout: 'SCOUT',
  apex: 'APEX',
  zion: 'ZION',
  forge: 'FORGE',
  echo: 'ECHO',
  vera: 'VERA',
  vox: 'VOX',
};
const scoreMap = new Map();
for (const agent of Object.values(mentionMap)) scoreMap.set(agent, 0);
const mentionedAgents = [];
for (const [token, agent] of Object.entries(mentionMap)) {
  if (requested.includes(token)) {
    mentionedAgents.push(agent);
    scoreMap.set(agent, (scoreMap.get(agent) ?? 0) + 120);
  }
}
const weightedSignals = [
  ['SCOUT', /(investig|compet|mercado|tendencia|web|noticia|research)/, 90],
  ['APEX', /(repo|backend|codigo|arquitect|bug|infra|api|frontend)/, 85],
  ['ZION', /(estrateg|growth|negocio|roadmap|plan|prioridad)/, 80],
  ['FORGE', /(workflow|automat|n8n|deploy|implement|integraci)/, 80],
  ['VERA', /(riesgo|metrica|analisis|dashboard|dato)/, 72],
  ['ECHO', /(mensaje|copy|mail|respuesta|comunic)/, 68],
  ['VOX', /(contenido|post|reel|linkedin|instagram|youtube|tiktok)/, 68],
];
for (const [agent, pattern, weight] of weightedSignals) {
  if (pattern.test(requested)) {
    scoreMap.set(agent, (scoreMap.get(agent) ?? 0) + weight);
  }
}
const rankedAgents = [...scoreMap.entries()]
  .filter(([, score]) => score > 0)
  .sort((left, right) => right[1] - left[1])
  .map(([agent]) => agent);
const complexityScore =
  prompt.length +
  rankedAgents.length * 35 +
  (/profundo|deep|completo|detallado/.test(requested) ? 80 : 0);
const responseMode = complexityScore >= 160 ? 'deep' : 'rapid';
const topScore = scoreMap.get(rankedAgents[0] ?? 'SCOUT') ?? 0;
const secondScore = scoreMap.get(rankedAgents[1] ?? '') ?? 0;
const maxLeads = mentionedAgents.length === 1
  ? 1
  : topScore >= 110 && secondScore < 55
    ? 1
    : responseMode === 'rapid'
      ? 2
      : 3;
const leadAgents = (rankedAgents.length ? rankedAgents : ['SCOUT']).slice(0, maxLeads);
const cutoffReason = maxLeads === 1
  ? (mentionedAgents.length === 1 ? 'explicit-single-lead' : 'single-high-confidence-lead')
  : responseMode === 'rapid'
    ? 'rapid-lane-cap'
    : 'deep-multi-lead';
return [
  {
    json: {
      requestId: payload.requestId ?? 'req-' + Date.now(),
      task: prompt,
      leadAgents: leadAgents.length ? leadAgents : ['SCOUT'],
      decisionOrder: leadAgents.map((agent, index) => ({
        agent,
        order: index + 1,
        score: scoreMap.get(agent) ?? 0,
      })),
      reserveLeadPool: rankedAgents.slice(maxLeads, 3),
      source: payload.source ?? 'webhook',
      freeOnly: true,
      complexityScore,
      responseMode,
      earlyStopEligible: maxLeads === 1,
      cutoffReason,
      maxLeads,
      maxLatencyMs: responseMode === 'rapid' ? 2500 : 4500,
    },
  },
];`
    ),
    switchNode(
      'switch-mode',
      [1060, 340],
      'Route Mode',
      "={{$json.responseMode === 'deep' ? 1 : 0}}"
    ),
    setAssignments('rapid-lane', [1340, 240], 'Rapid Lane', [
      assignment('lane', 'rapid'),
      assignment('targetLatencyMs', 2500, 'number'),
      assignment('handoffPlan', 'brief-builder -> specialist-runner -> compact-assembler'),
    ]),
    setAssignments('deep-lane', [1340, 440], 'Deep Lane', [
      assignment('lane', 'deep'),
      assignment('targetLatencyMs', 4500, 'number'),
      assignment('handoffPlan', 'brief-builder -> specialist-runner -> full-assembler'),
    ]),
    executeWorkflowNode(
      'run-lead-brief-builder',
      [1620, 340],
      'Run Lead Brief Builder',
      '__LEAD_BRIEF_BUILDER_ID__'
    ),
    executeWorkflowNode(
      'run-specialist-runner',
      [1900, 340],
      'Run Specialist Runner',
      '__SPECIALIST_RUNNER_ID__'
    ),
    codeNode(
      'detect-tie-break',
      [2180, 340],
      'Detect Tie Break',
      `const leadResults = items.map((item) => item.json);
const reserveLeadPool = Array.isArray(leadResults[0]?.reserveLeadPool) ? leadResults[0].reserveLeadPool : [];
const lowerTask = String(leadResults[0]?.task ?? '').toLowerCase();
const familyMap = {
  SCOUT: 'discovery',
  VERA: 'discovery',
  APEX: 'build',
  FORGE: 'build',
  ZION: 'strategy',
  ECHO: 'message',
  VOX: 'message',
};
const families = [...new Set(leadResults.map((result) => familyMap[result.lead] ?? 'general'))];
const conflictSignals = /(versus| vs |compar|elegir|tradeoff|conflict|contradic|priorizar|balance|decision|primero)/.test(lowerTask);
const tieBreakerLead = reserveLeadPool[0] ?? null;
const tieBreakerRequired = Boolean(tieBreakerLead) && leadResults.length === 2 && (conflictSignals || families.length > 1);
return [
  {
    json: {
      ...leadResults[0],
      originalLeadResults: leadResults,
      tieBreakerRequired,
      tieBreakerLead,
      tieBreakerReason: tieBreakerRequired
        ? (conflictSignals ? 'prompt-signals-conflict' : 'cross-discipline-conflict')
        : 'not-needed',
    },
  },
];`
    ),
    switchNode(
      'tie-break-gate',
      [2440, 340],
      'Tie Break Gate',
      "={{$json.tieBreakerRequired ? 1 : 0}}"
    ),
    codeNode(
      'prepare-tie-break-request',
      [2720, 520],
      'Prepare Tie Break Request',
      `const leadResults = Array.isArray($json.originalLeadResults) ? $json.originalLeadResults : [];
const existingOrder = Array.isArray($json.decisionOrder) ? $json.decisionOrder : [];
return [
  {
    json: {
      requestId: $json.requestId ?? 'manual',
      task: leadResults[0]?.task ?? $json.task ?? 'Resolver la tarea actual',
      leadAgents: [$json.tieBreakerLead],
      source: $json.source ?? 'workflow',
      responseMode: $json.responseMode ?? 'rapid',
      lane: $json.lane ?? 'rapid',
      reserveLeadPool: [],
      decisionOrder: [
        ...existingOrder,
        {
          agent: $json.tieBreakerLead,
          order: existingOrder.length + 1,
          score: 0,
        },
      ],
      cutoffReason: $json.tieBreakerReason ?? 'tie-breaker',
      originalLeadResults: leadResults,
      tieBreakerLead: $json.tieBreakerLead,
      tieBreakerReason: $json.tieBreakerReason ?? 'tie-breaker',
      freeOnly: true,
    },
  },
];`
    ),
    executeWorkflowNode(
      'run-lead-brief-builder-tie-break',
      [3000, 520],
      'Run Lead Brief Builder Tie Break',
      '__LEAD_BRIEF_BUILDER_ID__'
    ),
    executeWorkflowNode(
      'run-specialist-runner-tie-break',
      [3280, 520],
      'Run Specialist Runner Tie Break',
      '__SPECIALIST_RUNNER_ID__'
    ),
    mergeNode(
      'merge-tie-break-results',
      [3560, 440],
      'Merge Tie Break Results'
    ),
    codeNode(
      'combine-tie-break-results',
      [3840, 440],
      'Combine Tie Break Results',
      `const wrapper = items.find((item) => Array.isArray(item.json.originalLeadResults))?.json ?? {};
const tieBreakerResults = items
  .filter((item) => !Array.isArray(item.json.originalLeadResults))
  .map((item) => item.json);
return [
  {
    json: {
      ...wrapper,
      tieBreakerResults,
      tieBreakerUsed: tieBreakerResults.length > 0,
    },
  },
];`
    ),
    executeWorkflowNode(
      'run-response-assembler',
      [4120, 340],
      'Run Response Assembler',
      '__RESPONSE_ASSEMBLER_ID__'
    ),
    switchNode(
      'return-mode',
      [4400, 340],
      'Return Mode',
      "={{$json.source === 'webhook' ? 1 : 0}}"
    ),
    setAssignments('preview-result', [4680, 240], 'Preview Result', [
      assignment('resultMode', 'manual-preview'),
      assignment('summarySource', 'n8n-office-router'),
    ]),
    respondToWebhook('respond-intake', [4680, 440]),
  ];

  const connections = {
    'Office Intake Webhook': {
      main: [[{ node: 'Normalize Intake', type: 'main', index: 0 }]],
    },
    'Manual Trigger': {
      main: [[{ node: 'Sample Intake Request', type: 'main', index: 0 }]],
    },
    'Sample Intake Request': {
      main: [[{ node: 'Normalize Intake', type: 'main', index: 0 }]],
    },
    'Normalize Intake': {
      main: [[{ node: 'Route Mode', type: 'main', index: 0 }]],
    },
    'Route Mode': {
      main: [
        [{ node: 'Rapid Lane', type: 'main', index: 0 }],
        [{ node: 'Deep Lane', type: 'main', index: 0 }],
      ],
    },
    'Rapid Lane': {
      main: [[{ node: 'Run Lead Brief Builder', type: 'main', index: 0 }]],
    },
    'Deep Lane': {
      main: [[{ node: 'Run Lead Brief Builder', type: 'main', index: 0 }]],
    },
    'Run Lead Brief Builder': {
      main: [[{ node: 'Run Specialist Runner', type: 'main', index: 0 }]],
    },
    'Run Specialist Runner': {
      main: [[{ node: 'Detect Tie Break', type: 'main', index: 0 }]],
    },
    'Detect Tie Break': {
      main: [[{ node: 'Tie Break Gate', type: 'main', index: 0 }]],
    },
    'Tie Break Gate': {
      main: [
        [{ node: 'Run Response Assembler', type: 'main', index: 0 }],
        [{ node: 'Prepare Tie Break Request', type: 'main', index: 0 }],
      ],
    },
    'Prepare Tie Break Request': {
      main: [
        [{ node: 'Run Lead Brief Builder Tie Break', type: 'main', index: 0 }],
        [{ node: 'Merge Tie Break Results', type: 'main', index: 0 }],
      ],
    },
    'Run Lead Brief Builder Tie Break': {
      main: [[{ node: 'Run Specialist Runner Tie Break', type: 'main', index: 0 }]],
    },
    'Run Specialist Runner Tie Break': {
      main: [[{ node: 'Merge Tie Break Results', type: 'main', index: 1 }]],
    },
    'Merge Tie Break Results': {
      main: [[{ node: 'Combine Tie Break Results', type: 'main', index: 0 }]],
    },
    'Combine Tie Break Results': {
      main: [[{ node: 'Run Response Assembler', type: 'main', index: 0 }]],
    },
    'Run Response Assembler': {
      main: [[{ node: 'Return Mode', type: 'main', index: 0 }]],
    },
    'Return Mode': {
      main: [
        [{ node: 'Preview Result', type: 'main', index: 0 }],
        [{ node: 'Respond to Webhook', type: 'main', index: 0 }],
      ],
    },
  };

  return workflowBase(
    'Office AI - Intake Router',
    nodes,
    connections,
    'Router gratuito con webhook y modo manual que decide orden, tope 1/2/3 leads, corte temprano y desempate antes de llamar a los subworkflows de Office AI.'
  );
}

function buildLeadBriefBuilder() {
  const nodes = [
    executeWorkflowTrigger('lead-trigger', [220, 240], 'Execute Workflow Trigger'),
    manualTrigger('lead-manual', [220, 420]),
    codeNode(
      'sample-lead-input',
      [480, 420],
      'Sample Lead Input',
      `return [
  {
    json: {
      requestId: 'manual-office-ai',
      task: 'Investigar competidores y revisar la arquitectura de Office AI',
      responseMode: 'rapid',
      leadAgents: ['SCOUT', 'APEX', 'ZION'],
      freeOnly: true,
    },
  },
];`
    ),
    codeNode(
      'expand-leads',
      [760, 300],
      'Expand Leads',
      `const input = items[0]?.json ?? {};
const leadAgents = Array.isArray(input.leadAgents) && input.leadAgents.length
  ? input.leadAgents.slice(0, 3)
  : ['SCOUT'];
return leadAgents.map((lead, index) => ({
  json: {
    ...input,
    lead,
    leadIndex: index + 1,
    briefId: (input.requestId ?? 'manual') + '-' + lead.toLowerCase(),
  },
}));`
    ),
    codeNode(
      'draft-brief',
      [1040, 300],
      'Draft Brief',
      `const lead = $json.lead ?? 'SCOUT';
const task = $json.task ?? 'Resolver una tarea';
const objectiveMap = {
  SCOUT: 'Buscar informacion publica y validar supuestos',
  APEX: 'Auditar arquitectura, codigo y riesgos tecnicos',
  ZION: 'Definir enfoque estrategico y prioridades',
  FORGE: 'Bajar implementacion operativa y workflow',
  ECHO: 'Sintetizar hallazgos y narrativa',
  VERA: 'Ordenar riesgos, compliance y claridad',
  VOX: 'Adaptar salida para comunicacion externa',
};
return {
  json: {
    ...$json,
    objective: objectiveMap[lead] ?? 'Resolver la tarea asignada',
    contextBudget: $json.responseMode === 'deep' ? 'medium' : 'tight',
    constraints: [
      'usar solo nodos gratis de n8n',
      'no depender de APIs pagas',
      'priorizar respuestas cortas y accionables',
    ],
    deliverables: [
      '3 hallazgos',
      '2 riesgos',
      '2 proximos pasos',
    ],
    task,
  },
};`,
      'runOnceForEachItem'
    ),
    codeNode(
      'mark-brief-ready',
      [1320, 300],
      'Mark Brief Ready',
      `return items.map((item) => ({
  json: {
    ...item.json,
    coordinationStage: 'brief-ready',
  },
}));`
    ),
    codeNode(
      'finalize-brief',
      [1580, 300],
      'Finalize Brief',
      `return {
  json: {
    ...$json,
    briefSummary: \`\${$json.lead}: \${$json.objective}. Contexto \${$json.contextBudget}. Entrega: \${$json.deliverables.join(', ')}\`,
    readyForSpecialists: true,
  },
};`,
      'runOnceForEachItem'
    ),
  ];

  const connections = {
    'Execute Workflow Trigger': {
      main: [[{ node: 'Expand Leads', type: 'main', index: 0 }]],
    },
    'Manual Trigger': {
      main: [[{ node: 'Sample Lead Input', type: 'main', index: 0 }]],
    },
    'Sample Lead Input': {
      main: [[{ node: 'Expand Leads', type: 'main', index: 0 }]],
    },
    'Expand Leads': {
      main: [[{ node: 'Draft Brief', type: 'main', index: 0 }]],
    },
    'Draft Brief': {
      main: [[{ node: 'Mark Brief Ready', type: 'main', index: 0 }]],
    },
    'Mark Brief Ready': {
      main: [[{ node: 'Finalize Brief', type: 'main', index: 0 }]],
    },
  };

  return workflowBase(
    'Office AI - Lead Brief Builder',
    nodes,
    connections,
    'Genera briefs por lead a partir del pedido de ARIA, con input gratis y estructura lista para handoff.'
  );
}

function buildSpecialistRunner() {
  const nodes = [
    executeWorkflowTrigger('specialist-trigger', [220, 240], 'Execute Workflow Trigger'),
    manualTrigger('specialist-manual', [220, 420]),
    codeNode(
      'sample-specialist-brief',
      [500, 420],
      'Sample Specialist Brief',
      `return [
  {
    json: {
      requestId: 'manual-office-ai',
      lead: 'FORGE',
      task: 'Convertir la idea en un workflow operable y gratis',
      responseMode: 'rapid',
      briefSummary: 'FORGE: bajar implementacion y automatizacion',
      freeOnly: true,
    },
  },
];`
    ),
    codeNode(
      'plan-specialists',
      [780, 300],
      'Plan Specialists',
      `const specialistMap = {
  SCOUT: ['web-scan', 'source-check'],
  APEX: ['repo-scan', 'risk-check'],
  ZION: ['market-framing', 'priority-map'],
  FORGE: ['workflow-map', 'ops-check'],
  ECHO: ['summary-shaper', 'clarity-pass'],
  VERA: ['risk-audit', 'policy-pass'],
  VOX: ['messaging-pass', 'formatting-pass'],
};
return items.map((item) => ({
  json: {
    ...item.json,
    specialists: specialistMap[item.json.lead] ?? ['generalist-pass'],
  },
}));`
    ),
    codeNode(
      'mark-parallel-window',
      [1040, 300],
      'Mark Parallel Window',
      `return items.map((item) => ({
  json: {
    ...item.json,
    coordinationStage: 'parallel-window',
  },
}));`
    ),
    codeNode(
      'simulate-specialist-work',
      [1300, 300],
      'Simulate Specialist Work',
      `const generated = [];
for (const item of items) {
  const source = item.json;
  const specialists = Array.isArray(source.specialists) ? source.specialists : [];
  for (const specialist of specialists) {
    generated.push({
      json: {
        requestId: source.requestId,
        lead: source.lead,
        specialist,
        task: source.task,
        source: source.source ?? 'manual',
        responseMode: source.responseMode ?? 'rapid',
        lane: source.lane ?? 'rapid',
        reserveLeadPool: source.reserveLeadPool ?? [],
        decisionOrder: source.decisionOrder ?? [],
        cutoffReason: source.cutoffReason ?? 'fallback',
        earlyStopEligible: source.earlyStopEligible ?? false,
        finding: \`\${specialist} encontro una oportunidad concreta para \${source.lead}\`,
        risk: \`\${specialist} marco una dependencia a vigilar\`,
        nextStep: \`\${specialist} propone ejecutar una accion corta y medible\`,
        freeOnly: true,
      },
    });
  }
}
return generated;`
    ),
    codeNode(
      'assemble-lead-output',
      [1580, 300],
      'Assemble Lead Output',
      `const groups = new Map();
for (const item of items) {
  const lead = item.json.lead ?? 'SCOUT';
  if (!groups.has(lead)) {
    groups.set(lead, {
      requestId: item.json.requestId ?? 'manual',
      lead,
      source: item.json.source ?? 'manual',
      responseMode: item.json.responseMode ?? 'rapid',
      lane: item.json.lane ?? 'rapid',
      reserveLeadPool: item.json.reserveLeadPool ?? [],
      decisionOrder: item.json.decisionOrder ?? [],
      cutoffReason: item.json.cutoffReason ?? 'fallback',
      earlyStopEligible: item.json.earlyStopEligible ?? false,
      findings: [],
      risks: [],
      nextSteps: [],
      specialists: [],
      freeOnly: true,
    });
  }
  const entry = groups.get(lead);
  entry.findings.push(item.json.finding);
  entry.risks.push(item.json.risk);
  entry.nextSteps.push(item.json.nextStep);
  entry.specialists.push(item.json.specialist);
}
return Array.from(groups.values()).map((entry) => ({
  json: {
    ...entry,
    specialistCount: entry.specialists.length,
    latencyMs: entry.specialists.length * 350,
    leadSummary: \`\${entry.lead} consolido \${entry.specialists.length} especialista(s)\`,
  },
}));`
    ),
  ];

  const connections = {
    'Execute Workflow Trigger': {
      main: [[{ node: 'Plan Specialists', type: 'main', index: 0 }]],
    },
    'Manual Trigger': {
      main: [[{ node: 'Sample Specialist Brief', type: 'main', index: 0 }]],
    },
    'Sample Specialist Brief': {
      main: [[{ node: 'Plan Specialists', type: 'main', index: 0 }]],
    },
    'Plan Specialists': {
      main: [[{ node: 'Mark Parallel Window', type: 'main', index: 0 }]],
    },
    'Mark Parallel Window': {
      main: [[{ node: 'Simulate Specialist Work', type: 'main', index: 0 }]],
    },
    'Simulate Specialist Work': {
      main: [[{ node: 'Assemble Lead Output', type: 'main', index: 0 }]],
    },
  };

  return workflowBase(
    'Office AI - Specialist Runner',
    nodes,
    connections,
    'Ejecuta squads internos por lead usando solo logica local de n8n y devuelve un consolidado por lider.'
  );
}

function buildResponseAssembler() {
  const nodes = [
    executeWorkflowTrigger('assembler-trigger', [220, 240], 'Execute Workflow Trigger'),
    manualTrigger('assembler-manual', [220, 420]),
    codeNode(
      'sample-lead-results',
      [500, 420],
      'Sample Lead Results',
      `return [
  {
    json: {
      requestId: 'manual-office-ai',
      lead: 'SCOUT',
      findings: ['Competidor X acelera con contenido tecnico'],
      risks: ['Falta una metrica unificada'],
      nextSteps: ['Comparar pricing y mensajes'],
      latencyMs: 900,
    },
  },
  {
    json: {
      requestId: 'manual-office-ai',
      lead: 'FORGE',
      findings: ['La automatizacion puede fragmentarse sin costo'],
      risks: ['Hay que evitar duplicar bases de n8n'],
      nextSteps: ['Unificar sync de workflows'],
      latencyMs: 1100,
    },
  },
];`
    ),
    codeNode(
      'normalize-results',
      [780, 300],
      'Normalize Results',
      `const expandedResults = items.flatMap((item) => {
  const payload = item.json ?? {};
  if (Array.isArray(payload.originalLeadResults)) {
    const tieBreakerResults = Array.isArray(payload.tieBreakerResults) ? payload.tieBreakerResults : [];
    return [...payload.originalLeadResults, ...tieBreakerResults].map((result) => ({
      json: {
        requestId: result.requestId ?? payload.requestId ?? 'manual',
        lead: result.lead ?? 'SCOUT',
        source: result.source ?? payload.source ?? 'manual',
        responseMode: result.responseMode ?? payload.responseMode ?? 'rapid',
        lane: result.lane ?? payload.lane ?? 'rapid',
        findings: Array.isArray(result.findings) ? result.findings : [],
        risks: Array.isArray(result.risks) ? result.risks : [],
        nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps : [],
        latencyMs: Number(result.latencyMs ?? 0),
        tieBreakerUsed: tieBreakerResults.length > 0,
        tieBreakerReason: payload.tieBreakerReason ?? payload.cutoffReason ?? 'not-needed',
        decisionOrder: payload.decisionOrder ?? result.decisionOrder ?? [],
        freeOnly: true,
      },
    }));
  }

  return [{
    json: {
      requestId: payload.requestId ?? 'manual',
      lead: payload.lead ?? 'SCOUT',
      source: payload.source ?? 'manual',
      responseMode: payload.responseMode ?? 'rapid',
      lane: payload.lane ?? 'rapid',
      findings: Array.isArray(payload.findings) ? payload.findings : [],
      risks: Array.isArray(payload.risks) ? payload.risks : [],
      nextSteps: Array.isArray(payload.nextSteps) ? payload.nextSteps : [],
      latencyMs: Number(payload.latencyMs ?? 0),
      tieBreakerUsed: Boolean(payload.tieBreakerUsed),
      tieBreakerReason: payload.tieBreakerReason ?? payload.cutoffReason ?? 'not-needed',
      decisionOrder: payload.decisionOrder ?? [],
      freeOnly: true,
    },
  }];
});
return expandedResults;`
    ),
    codeNode(
      'deduplicate-findings',
      [1060, 300],
      'Deduplicate Findings',
      `const seen = new Set();
const leadResults = items.map((item) => item.json);
const findings = [];
const risks = [];
const nextSteps = [];
let latencyMs = 0;
for (const result of leadResults) {
  latencyMs += Number(result.latencyMs ?? 0);
  for (const finding of result.findings) {
    if (!seen.has('f:' + finding)) {
      seen.add('f:' + finding);
      findings.push(finding);
    }
  }
  for (const risk of result.risks) {
    if (!seen.has('r:' + risk)) {
      seen.add('r:' + risk);
      risks.push(risk);
    }
  }
  for (const step of result.nextSteps) {
    if (!seen.has('s:' + step)) {
      seen.add('s:' + step);
      nextSteps.push(step);
    }
  }
}
return [
  {
    json: {
      requestId: leadResults[0]?.requestId ?? 'manual',
      source: leadResults[0]?.source ?? 'manual',
      responseMode: leadResults[0]?.responseMode ?? 'rapid',
      lane: leadResults[0]?.lane ?? 'rapid',
      leadResults,
      findings,
      risks,
      nextSteps,
      latencyMs,
      tieBreakerUsed: leadResults.some((result) => Boolean(result.tieBreakerUsed)),
      tieBreakerReason: leadResults.find((result) => result.tieBreakerReason)?.tieBreakerReason ?? 'not-needed',
      decisionOrder: leadResults.find((result) => Array.isArray(result.decisionOrder) && result.decisionOrder.length)?.decisionOrder ?? [],
      freeOnly: true,
    },
  },
];`
    ),
    codeNode(
      'compose-aria-summary',
      [1340, 300],
      'Compose ARIA Summary',
      `const data = items[0]?.json ?? {};
const fronts = Array.isArray(data.leadResults) ? data.leadResults.length : 0;
const decisionMode = fronts <= 1 ? 'single-lead' : 'multi-lead';
return [
  {
    json: {
      requestId: data.requestId ?? 'manual',
      source: data.source ?? 'manual',
      responseMode: data.responseMode ?? 'rapid',
      lane: data.lane ?? 'rapid',
      ariaSummary: fronts <= 1
        ? 'ARIA aplico corte temprano porque un solo lead alcanzo para resolver el pedido.'
        : \`ARIA cerro \${fronts} frente(s) de trabajo con salida gratis y orquestada\`,
      decisionMode,
      tieBreakerUsed: Boolean(data.tieBreakerUsed),
      tieBreakerReason: data.tieBreakerReason ?? 'not-needed',
      decisionOrder: data.decisionOrder ?? [],
      steps: data.nextSteps ?? [],
      findings: data.findings ?? [],
      risks: data.risks ?? [],
      sources: [],
      latencyMs: data.latencyMs ?? 0,
      freeOnly: true,
    },
  },
];`
    ),
  ];

  const connections = {
    'Execute Workflow Trigger': {
      main: [[{ node: 'Normalize Results', type: 'main', index: 0 }]],
    },
    'Manual Trigger': {
      main: [[{ node: 'Sample Lead Results', type: 'main', index: 0 }]],
    },
    'Sample Lead Results': {
      main: [[{ node: 'Normalize Results', type: 'main', index: 0 }]],
    },
    'Normalize Results': {
      main: [[{ node: 'Deduplicate Findings', type: 'main', index: 0 }]],
    },
    'Deduplicate Findings': {
      main: [[{ node: 'Compose ARIA Summary', type: 'main', index: 0 }]],
    },
  };

  return workflowBase(
    'Office AI - Response Assembler',
    nodes,
    connections,
    'Consolida resultados de leads y arma el cierre final de ARIA sin usar servicios pagos.'
  );
}

const workflowDefinitions = {
  'Office AI - Intake Router': {
    fileName: 'office-ai-intake-router.json',
    workflow: buildIntakeRouter(),
  },
  'Office AI - Lead Brief Builder': {
    fileName: 'office-ai-lead-brief-builder.json',
    workflow: buildLeadBriefBuilder(),
  },
  'Office AI - Specialist Runner': {
    fileName: 'office-ai-specialist-runner.json',
    workflow: buildSpecialistRunner(),
  },
  'Office AI - Response Assembler': {
    fileName: 'office-ai-response-assembler.json',
    workflow: buildResponseAssembler(),
  },
};

function writeWorkflowFiles() {
  fs.mkdirSync(workflowDir, { recursive: true });
  for (const { fileName, workflow } of Object.values(workflowDefinitions)) {
    const targetPath = path.join(workflowDir, fileName);
    fs.writeFileSync(targetPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
  }
}

function replaceIds(value, replacements) {
  if (Array.isArray(value)) {
    return value.map((item) => replaceIds(item, replacements));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, nestedValue]) => [
      key,
      replaceIds(nestedValue, replacements),
    ]);
    return Object.fromEntries(entries);
  }

  if (typeof value === 'string' && replacements[value]) {
    return replacements[value];
  }

  return value;
}

function materializeWorkflow(workflow, replacements = {}) {
  return replaceIds(workflow, replacements);
}

function syncDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return { dbPath, updated: 0, matchedNames: [] };
  }

  const db = new DatabaseSync(dbPath);
  const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
  let updated = 0;
  const matchedNames = [];

  const rowsByName = {};

  for (const name of Object.keys(workflowDefinitions)) {
    rowsByName[name] = db
      .prepare(
        'SELECT id, versionCounter FROM workflow_entity WHERE name = ? ORDER BY createdAt DESC, id DESC'
      )
      .all(name);
  }

  function updateRow(row, workflow) {
    db.prepare(`
      UPDATE workflow_entity
      SET
        nodes = ?,
        connections = ?,
        settings = ?,
        staticData = ?,
        pinData = ?,
        meta = ?,
        versionId = ?,
        versionCounter = ?,
        description = ?,
        updatedAt = ?,
        active = ?
      WHERE id = ?
    `).run(
      JSON.stringify(workflow.nodes),
      JSON.stringify(workflow.connections),
      JSON.stringify(workflow.settings ?? {}),
      workflow.staticData === null ? null : JSON.stringify(workflow.staticData),
      JSON.stringify(workflow.pinData ?? {}),
      JSON.stringify(workflow.meta ?? {}),
      crypto.randomUUID(),
      Number(row.versionCounter ?? 1) + 1,
      workflow.description ?? null,
      now,
      workflow.active ? 1 : 0,
      row.id
    );
  }

  for (const [name, rows] of Object.entries(rowsByName)) {
    if (name === 'Office AI - Intake Router') {
      continue;
    }

    const workflow = materializeWorkflow(workflowDefinitions[name].workflow);

    for (const row of rows) {
      updateRow(row, workflow);
      updated += 1;
    }

    if (rows.length > 0) {
      matchedNames.push(`${name} x${rows.length}`);
    }
  }

  const routerRows = rowsByName['Office AI - Intake Router'] ?? [];
  const leadRows = rowsByName['Office AI - Lead Brief Builder'] ?? [];
  const specialistRows = rowsByName['Office AI - Specialist Runner'] ?? [];
  const assemblerRows = rowsByName['Office AI - Response Assembler'] ?? [];

  for (let index = 0; index < routerRows.length; index += 1) {
    const row = routerRows[index];
    const replacements = {
      __LEAD_BRIEF_BUILDER_ID__: leadRows[index]?.id ?? leadRows[0]?.id ?? '',
      __SPECIALIST_RUNNER_ID__: specialistRows[index]?.id ?? specialistRows[0]?.id ?? '',
      __RESPONSE_ASSEMBLER_ID__: assemblerRows[index]?.id ?? assemblerRows[0]?.id ?? '',
    };
    const workflow = materializeWorkflow(workflowDefinitions['Office AI - Intake Router'].workflow, replacements);
    if (!replacements.__LEAD_BRIEF_BUILDER_ID__ || !replacements.__SPECIALIST_RUNNER_ID__ || !replacements.__RESPONSE_ASSEMBLER_ID__) {
      continue;
    }
    updateRow(row, workflow);
    updated += 1;
  }

  if (routerRows.length > 0) {
    matchedNames.push(`Office AI - Intake Router x${routerRows.length}`);
  }

  return { dbPath, updated, matchedNames };
}

writeWorkflowFiles();

const results = repoDbPaths.map(syncDatabase);

for (const result of results) {
  console.log(`DB: ${result.dbPath}`);
  console.log(`Updated rows: ${result.updated}`);
  console.log(`Matched: ${result.matchedNames.join(', ') || 'none'}`);
  console.log('');
}
