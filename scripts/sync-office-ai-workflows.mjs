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
    webhookId: id,
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
      workflowId: {
        value: workflowId,
      },
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
      prompt: 'Entro un lead de Estudio Delta. Investiga el contexto, defini la oportunidad y deja listo un primer mensaje comercial junto con el siguiente paso del piloto.',
      companyName: 'Estudio Delta',
      website: 'https://estudiodelta.example',
      painPoint: 'responden leads a mano y pierden seguimiento durante la primera hora',
      goal: 'salir con un primer mensaje comercial y un piloto alpha apoyado en n8n',
      channel: 'linkedin',
      requestedDeliverable: 'first-message',
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
const executionSource = input.body && typeof input.body === 'object' ? 'webhook' : 'manual';
const upstreamSource =
  typeof payload.source === 'string' && payload.source.trim()
    ? payload.source.trim()
    : executionSource;
const accountName = typeof payload.companyName === 'string' && payload.companyName.trim()
  ? payload.companyName.trim()
  : 'Lead alpha';
const website = typeof payload.website === 'string' && payload.website.trim()
  ? payload.website.trim()
  : '';
const painPoint = typeof payload.painPoint === 'string' && payload.painPoint.trim()
  ? payload.painPoint.trim()
  : '';
const goal = typeof payload.goal === 'string' && payload.goal.trim()
  ? payload.goal.trim()
  : '';
const channel = typeof payload.channel === 'string' && payload.channel.trim()
  ? payload.channel.trim().toLowerCase()
  : 'email';
const requestedDeliverable = typeof payload.requestedDeliverable === 'string' && payload.requestedDeliverable.trim()
  ? payload.requestedDeliverable.trim()
  : 'brief';
const deliverableLabelMap = {
  'first-message': 'primer mensaje comercial',
  brief: 'brief comercial',
  'pilot-plan': 'plan piloto con n8n',
};
const deliverableLabel = deliverableLabelMap[requestedDeliverable] ?? requestedDeliverable;
const promptSeed = [payload.prompt, payload.task, payload.message, payload.text]
  .find((value) => typeof value === 'string' && value.trim());
const structuredContext = [
  'Cuenta: ' + accountName,
  website ? 'Sitio: ' + website : '',
  painPoint ? 'Dolor: ' + painPoint : '',
  goal ? 'Objetivo: ' + goal : '',
  'Canal: ' + channel,
  'Entregable: ' + deliverableLabel,
].filter(Boolean);
const prompt = promptSeed ?? ('Analizar a ' + accountName + ' y preparar ' + deliverableLabel);
const task = structuredContext.length > 0
  ? prompt + '\\n' + structuredContext.join('\\n')
  : prompt;
const requested = String([prompt, ...structuredContext].join(' ')).toLowerCase();
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
      task,
      accountName,
      website,
      painPoint,
      goal,
      channel,
      requestedDeliverable,
      deliverableLabel,
      leadAgents: leadAgents.length ? leadAgents : ['SCOUT'],
      decisionOrder: leadAgents.map((agent, index) => ({
        agent,
        order: index + 1,
        score: scoreMap.get(agent) ?? 0,
      })),
      reserveLeadPool: rankedAgents.slice(maxLeads, 3),
      source: executionSource,
      upstreamSource,
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
      task: 'Entro un lead de Chatwoot. Investigá el contexto, definí la oportunidad comercial y dejá listo un primer mensaje junto con el siguiente paso del piloto.',
      accountName: 'Chatwoot',
      website: 'https://www.chatwoot.com',
      painPoint: 'necesitan ordenar mejor el handoff entre canales, CRM y automatizaciones',
      goal: 'salir con un primer mensaje comercial y un piloto alpha apoyado en n8n',
      channel: 'linkedin',
      requestedDeliverable: 'first-message',
      deliverableLabel: 'primer mensaje comercial',
      responseMode: 'rapid',
      leadAgents: ['SCOUT', 'ZION', 'ECHO'],
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
const accountName = $json.accountName ?? 'Lead alpha';
const website = $json.website ?? '';
const painPoint = $json.painPoint ?? '';
const goal = $json.goal ?? '';
const channel = $json.channel ?? 'email';
const deliverableLabel = $json.deliverableLabel ?? 'salida accionable';
const objectiveMap = {
  SCOUT: 'Buscar informacion publica y validar supuestos',
  APEX: 'Auditar arquitectura, codigo y riesgos tecnicos',
  ZION: 'Definir enfoque estrategico y prioridades',
  FORGE: 'Bajar implementacion operativa y workflow',
  ECHO: 'Sintetizar hallazgos y narrativa',
  VERA: 'Ordenar riesgos, compliance y claridad',
  VOX: 'Adaptar salida para comunicacion externa',
};
const instructionsMap = {
  SCOUT: 'Busco senales publicas, posicionamiento, integraciones disponibles y fricciones reales del caso.',
  APEX: 'Bajo riesgos tecnicos, dependencias, arquitectura y esfuerzo de implementacion.',
  ZION: 'Priorizo decision comercial, alcance del piloto y secuencia de adopcion.',
  FORGE: 'Traduzco el caso a workflow real, webhooks, APIs y operaciones concretas en n8n.',
  ECHO: 'Convierto el analisis en mensaje claro, CTA y propuesta comercial utilizable.',
  VERA: 'Ordeno riesgos, metricas de exito y validaciones necesarias antes de activar.',
  VOX: 'Adapto el mensaje a formatos de outreach, contenido o canal externo.',
};
const objective = objectiveMap[lead] ?? 'Resolver la tarea asignada';
const promptLines = [
  '@' + lead + ' prepara un brief ejecutivo corto y accionable para esta oportunidad.',
  instructionsMap[lead] ?? 'Responde con foco operativo.',
  'Objetivo del frente: ' + objective,
  'Cuenta: ' + accountName,
  website ? 'Sitio: ' + website : '',
  painPoint ? 'Dolor principal: ' + painPoint : '',
  goal ? 'Objetivo comercial: ' + goal : '',
  'Canal: ' + channel,
  'Entregable final esperado: ' + deliverableLabel,
  'Pedido original del cliente: ' + task,
  'Formato obligatorio:',
  '- Resumen',
  '- Evidencia',
  '- Riesgos',
  '- Proximos pasos',
  'No menciones a otros agentes, no expliques el sistema y no digas "puedo ayudarte".',
].filter(Boolean);
return {
  json: {
    ...$json,
    objective,
    contextBudget: $json.responseMode === 'deep' ? 'medium' : 'tight',
    constraints: [
      'usar solo nodos gratis de n8n',
      'priorizar respuestas cortas y accionables',
      'mantener un foco comercial y operativo',
    ],
    deliverables: ['brief ejecutivo', 'riesgos', 'proximos pasos'],
    accountName,
    website,
    painPoint,
    goal,
    channel,
    deliverableLabel,
    task,
    briefPrompt: promptLines.join('\\n'),
  },
};`,
      'runOnceForEachItem'
    ),
    codeNode(
      'run-real-brief',
      [1320, 300],
      'Run Real Brief',
      `const baseUrl = String($json.appBaseUrl ?? 'http://127.0.0.1:3000').replace(/\\/+$/, '');
const timeoutMs = Number($json.responseMode === 'deep' ? 180000 : 120000);
try {
  const parsed = await this.helpers.httpRequest({
    method: 'POST',
    url: baseUrl + '/api/orchestrator',
    body: {
      prompt: $json.briefPrompt,
      teamMode: false,
      currentAgents: [],
    },
    json: true,
    timeout: timeoutMs,
  });
  return {
    json: {
      ...$json,
      appBaseUrl: baseUrl,
      briefRun: parsed,
    },
  };
} catch (error) {
  return {
    json: {
      ...$json,
      appBaseUrl: baseUrl,
      briefRun: null,
      briefError: error instanceof Error ? error.message : String(error),
      briefErrorCode:
        error && typeof error === 'object' && 'code' in error ? String(error.code) : 'ORCHESTRATOR_ERROR',
      briefErrorResponse:
        error && typeof error === 'object' && 'response' in error && error.response?.body
          ? error.response.body
          : null,
    },
  };
}`,
      'runOnceForEachItem'
    ),
    codeNode(
      'finalize-brief',
      [1600, 300],
      'Finalize Brief',
      `const run = $json.briefRun ?? {};
const steps = Array.isArray(run.steps) ? run.steps : [];
const lead = $json.lead ?? 'SCOUT';
const specialistStep =
  steps.find((step) => step.agentId === lead) ??
  steps.find((step) => typeof step?.agentId === 'string' && step.agentId !== 'ARIA') ??
  null;
const ariaStep = [...steps].reverse().find((step) => step.agentId === 'ARIA') ?? null;
const output = specialistStep?.output && typeof specialistStep.output === 'object' ? specialistStep.output : {};
const evidence = Array.isArray(output.evidence) ? output.evidence.slice(0, 3) : [];
const contextFragments = [
  $json.website ? 'Sitio: ' + $json.website : '',
  ...evidence
    .map((item) => {
      const claim = typeof item?.claim === 'string' ? item.claim.trim() : '';
      const title = typeof item?.title === 'string' ? item.title.trim() : '';
      return claim || title;
    })
    .filter(Boolean),
  ...(Array.isArray(output.nextSteps) ? output.nextSteps.slice(0, 2) : []),
].filter(Boolean);
const sources = evidence
  .map((item) => ({
    title: typeof item?.title === 'string' ? item.title : 'Fuente',
    url: typeof item?.url === 'string' ? item.url : '',
  }))
  .filter((item) => item.url);
const summary =
  typeof output.summary === 'string' && output.summary.trim()
    ? output.summary.trim()
    : typeof specialistStep?.message === 'string' && specialistStep.message.trim()
      ? specialistStep.message.trim()
      : typeof ariaStep?.output?.summary === 'string' && ariaStep.output.summary.trim()
        ? ariaStep.output.summary.trim()
        : $json.briefPrompt;
return {
  json: {
    ...$json,
    brief: summary,
    briefSummary: summary,
    briefEvidence: evidence,
    briefArtifacts: Array.isArray(output.artifacts) ? output.artifacts : [],
    contextFragments,
    sources,
    risks: Array.isArray(output.risks) ? output.risks : [],
    nextSteps: Array.isArray(output.nextSteps) ? output.nextSteps : [],
    coordinationStage: 'brief-ready',
    latencyMs: Number(run?.trace?.totalDurationMs ?? 0),
    message: specialistStep?.message ?? summary,
    thought: specialistStep?.thought ?? '',
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
      main: [[{ node: 'Run Real Brief', type: 'main', index: 0 }]],
    },
    'Run Real Brief': {
      main: [[{ node: 'Finalize Brief', type: 'main', index: 0 }]],
    },
  };

  return workflowBase(
    'Office AI - Lead Brief Builder',
    nodes,
    connections,
    'Genera briefs reales por lead llamando al orquestador vivo de la app y dejando contexto listo para el handoff.'
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
      lead: 'ECHO',
      accountName: 'Chatwoot',
      website: 'https://www.chatwoot.com',
      painPoint: 'necesitan ordenar mejor el handoff entre canales, CRM y automatizaciones',
      goal: 'salir con un primer mensaje comercial y un piloto alpha apoyado en n8n',
      channel: 'linkedin',
      deliverableLabel: 'primer mensaje comercial',
      task: 'Dejar listo el primer mensaje comercial y el siguiente paso del piloto alpha',
      responseMode: 'rapid',
      briefSummary: 'ECHO: sintetizar la oportunidad comercial para Chatwoot',
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
      'build-lead-prompt',
      [1300, 300],
      'Build Lead Prompt',
      `const lead = $json.lead ?? 'SCOUT';
const accountName = $json.accountName ?? 'Lead alpha';
const website = $json.website ?? '';
const painPoint = $json.painPoint ?? '';
const goal = $json.goal ?? '';
const channel = $json.channel ?? 'email';
const deliverableLabel = $json.deliverableLabel ?? 'salida accionable';
const briefSummary = String($json.briefSummary ?? $json.task ?? 'Resolver la tarea')
  .replace(/\\s+/g, ' ')
  .trim()
  .slice(0, 420);
const contextFragments = Array.isArray($json.contextFragments) ? $json.contextFragments.slice(0, 4) : [];
const instructionsMap = {
  SCOUT: 'Enfocate en senales publicas, posicionamiento, integraciones visibles y validacion del pain point.',
  APEX: 'Enfocate en arquitectura, dependencias tecnicas, restricciones y riesgos de implementacion.',
  ZION: 'Enfocate en decision comercial, alcance del piloto y secuencia de adopcion.',
  FORGE: 'Enfocate en workflow real, APIs, webhooks, mapeo de datos y operacion inmediata.',
  ECHO: 'Enfocate en claridad, CTA, objection handling y mensaje comercial listo para usar.',
  VERA: 'Enfocate en riesgos, metricas de exito y validaciones necesarias.',
  VOX: 'Enfocate en adaptar la propuesta a formatos de outreach o publicacion.',
};
const promptLines = [
  '@' + lead + ' resolve este frente y devolve una salida final utilizable.',
  'Cuenta: ' + accountName,
  website ? 'Sitio: ' + website : '',
  painPoint ? 'Dolor principal: ' + painPoint : '',
  goal ? 'Objetivo comercial: ' + goal : '',
  'Canal: ' + channel,
  'Entregable: ' + deliverableLabel,
  briefSummary ? 'Brief base: ' + briefSummary : '',
  contextFragments.length ? 'Contexto adicional: ' + contextFragments.join(' | ') : '',
  instructionsMap[lead] ?? 'Devuelve hallazgos, riesgos y proximos pasos.',
  'Formato obligatorio:',
  '- Resumen',
  '- Evidencia',
  '- Riesgos',
  '- Proximos pasos',
  'No repitas el prompt, no menciones a otros agentes y no digas "puedo ayudarte".',
].filter(Boolean);
return {
  json: {
    ...$json,
    leadPrompt: promptLines.join('\\n'),
  },
};`,
      'runOnceForEachItem'
    ),
    codeNode(
      'run-real-lead',
      [1580, 300],
      'Run Real Lead',
      `const baseUrl = String($json.appBaseUrl ?? 'http://127.0.0.1:3000').replace(/\\/+$/, '');
const timeoutMs = Number($json.responseMode === 'deep' ? 240000 : 180000);
try {
  const parsed = await this.helpers.httpRequest({
    method: 'POST',
    url: baseUrl + '/api/orchestrator',
    body: {
      prompt: $json.leadPrompt,
      teamMode: false,
      currentAgents: [],
    },
    json: true,
    timeout: timeoutMs,
  });
  return {
    json: {
      ...$json,
      appBaseUrl: baseUrl,
      leadRun: parsed,
    },
  };
} catch (error) {
  return {
    json: {
      ...$json,
      appBaseUrl: baseUrl,
      leadRun: null,
      leadError: error instanceof Error ? error.message : String(error),
      leadErrorCode:
        error && typeof error === 'object' && 'code' in error ? String(error.code) : 'ORCHESTRATOR_ERROR',
      leadErrorResponse:
        error && typeof error === 'object' && 'response' in error && error.response?.body
          ? error.response.body
          : null,
    },
  };
}`,
      'runOnceForEachItem'
    ),
    codeNode(
      'assemble-lead-output',
      [1860, 300],
      'Assemble Lead Output',
      `const run = $json.leadRun ?? {};
const steps = Array.isArray(run.steps) ? run.steps : [];
const lead = $json.lead ?? 'SCOUT';
const specialistStep =
  steps.find((step) => step.agentId === lead) ??
  steps.find((step) => typeof step?.agentId === 'string' && step.agentId !== 'ARIA') ??
  null;
const ariaStep = [...steps].reverse().find((step) => step.agentId === 'ARIA') ?? null;
const output = specialistStep?.output && typeof specialistStep.output === 'object' ? specialistStep.output : {};
const evidence = Array.isArray(output.evidence) ? output.evidence : [];
const sanitizeLine = (value, fallback = '') => {
  const text = String(value ?? '').replace(/\\s+/g, ' ').trim();
  if (!text) return fallback;
  if (
    text.length > 260 ||
    /formato obligatorio|no repitas el prompt|no menciones a otros agentes|puedo ayudarte|pedido original|brief base/i.test(text)
  ) {
    return fallback;
  }
  return text;
};
const findings = evidence
  .map((item) => {
    const claim = typeof item?.claim === 'string' ? item.claim.trim() : '';
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    return sanitizeLine(claim || title);
  })
  .filter(Boolean);
if (findings.length === 0 && typeof output.summary === 'string' && output.summary.trim()) {
  findings.push(sanitizeLine(output.summary, lead + ' detecto un hallazgo principal para este frente.'));
}
const risks = (Array.isArray(output.risks) ? output.risks : [])
  .map((item) =>
    sanitizeLine(item, 'Si no se acota el piloto, el frente puede crecer mas de lo necesario.')
  )
  .filter(Boolean)
  .slice(0, 3);
const nextSteps = (Array.isArray(output.nextSteps) ? output.nextSteps : [])
  .map((item) =>
    sanitizeLine(item, 'Definir el trigger, el mapeo de datos y la primera prueba end-to-end.')
  )
  .filter(Boolean)
  .slice(0, 3);
const sources = evidence
  .map((item) => ({
    title: typeof item?.title === 'string' ? item.title : 'Fuente',
    url: typeof item?.url === 'string' ? item.url : '',
  }))
  .filter((item) => item.url);
const specialists = Array.isArray($json.specialists) && $json.specialists.length ? $json.specialists : [lead];
return {
  json: {
    requestId: $json.requestId ?? 'manual',
    lead,
    accountName: $json.accountName ?? 'Lead alpha',
    channel: $json.channel ?? 'email',
    deliverableLabel: $json.deliverableLabel ?? 'salida accionable',
    source: $json.source ?? 'manual',
    responseMode: $json.responseMode ?? 'rapid',
    lane: $json.lane ?? 'rapid',
    reserveLeadPool: $json.reserveLeadPool ?? [],
    decisionOrder: $json.decisionOrder ?? [],
    cutoffReason: $json.cutoffReason ?? 'fallback',
    earlyStopEligible: $json.earlyStopEligible ?? false,
    findings,
    risks,
    nextSteps,
    specialists,
    specialistCount: specialists.length,
    sources,
    latencyMs: Number(run?.trace?.totalDurationMs ?? 0),
    leadSummary:
      typeof output.summary === 'string' && output.summary.trim()
        ? sanitizeLine(output.summary, specialistStep?.message ?? '')
        : sanitizeLine(specialistStep?.message ?? ''),
    customerFacingOutput: ariaStep?.message ?? specialistStep?.message ?? '',
    thought: specialistStep?.thought ?? '',
    message: specialistStep?.message ?? '',
    freeOnly: true,
  },
};`,
      'runOnceForEachItem'
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
      main: [[{ node: 'Build Lead Prompt', type: 'main', index: 0 }]],
    },
    'Build Lead Prompt': {
      main: [[{ node: 'Run Real Lead', type: 'main', index: 0 }]],
    },
    'Run Real Lead': {
      main: [[{ node: 'Assemble Lead Output', type: 'main', index: 0 }]],
    },
  };

  return workflowBase(
    'Office AI - Specialist Runner',
    nodes,
    connections,
    'Ejecuta cada lead contra el orquestador real de la app y devuelve un consolidado accionable por lider.'
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
      accountName: 'Chatwoot',
      channel: 'linkedin',
      deliverableLabel: 'primer mensaje comercial',
      findings: ['El sitio deja claro el dolor operativo y habilita un piloto de respuesta automatizada'],
      risks: ['Sin priorizacion de canal, el piloto puede abrir demasiados frentes al mismo tiempo'],
      nextSteps: ['Validar el orden de implementacion y el CTA del primer contacto'],
      sources: [{ title: 'Chatwoot', url: 'https://www.chatwoot.com' }],
      latencyMs: 900,
    },
  },
  {
    json: {
      requestId: 'manual-office-ai',
      lead: 'ECHO',
      accountName: 'Chatwoot',
      channel: 'linkedin',
      deliverableLabel: 'primer mensaje comercial',
      findings: ['Ya hay material suficiente para salir con un mensaje comercial corto y concreto'],
      risks: ['Si el mensaje no acota el piloto, puede sonar mas grande que la implementacion real'],
      nextSteps: ['Enviar el primer mensaje y proponer piloto alpha de 7 dias'],
      sources: [{ title: 'Chatwoot', url: 'https://www.chatwoot.com' }],
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
        accountName: result.accountName ?? payload.accountName ?? 'Lead alpha',
        channel: result.channel ?? payload.channel ?? 'email',
        deliverableLabel: result.deliverableLabel ?? payload.deliverableLabel ?? 'salida accionable',
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
        sources: Array.isArray(result.sources) ? result.sources : [],
        freeOnly: true,
      },
    }));
  }

  return [{
    json: {
      requestId: payload.requestId ?? 'manual',
      lead: payload.lead ?? 'SCOUT',
      accountName: payload.accountName ?? 'Lead alpha',
      channel: payload.channel ?? 'email',
      deliverableLabel: payload.deliverableLabel ?? 'salida accionable',
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
      sources: Array.isArray(payload.sources) ? payload.sources : [],
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
const sources = [];
let latencyMs = 0;
const seenSources = new Set();
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
  for (const source of Array.isArray(result.sources) ? result.sources : []) {
    const title = typeof source?.title === 'string' ? source.title : 'Fuente';
    const url = typeof source?.url === 'string' ? source.url : '';
    const key = title + '|' + url;
    if (!seenSources.has(key)) {
      seenSources.add(key);
      sources.push({ title, url });
    }
  }
}
return [
  {
    json: {
      requestId: leadResults[0]?.requestId ?? 'manual',
      accountName: leadResults[0]?.accountName ?? 'Lead alpha',
      channel: leadResults[0]?.channel ?? 'email',
      deliverableLabel: leadResults[0]?.deliverableLabel ?? 'salida accionable',
      source: leadResults[0]?.source ?? 'manual',
      responseMode: leadResults[0]?.responseMode ?? 'rapid',
      lane: leadResults[0]?.lane ?? 'rapid',
      leadResults,
      findings,
      risks,
      nextSteps,
      sources,
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
const accountName = data.accountName ?? 'Lead alpha';
const deliverableLabel = data.deliverableLabel ?? 'salida accionable';
const channel = data.channel ?? 'email';
const sanitizeLine = (value, fallback = '') => {
  const text = String(value ?? '').replace(/\\s+/g, ' ').trim();
  if (!text) return fallback;
  if (
    text.length > 260 ||
    /formato obligatorio|no repitas el prompt|no menciones a otros agentes|puedo ayudarte|pedido original|brief base/i.test(text)
  ) {
    return fallback;
  }
  return text;
};
const findings = (Array.isArray(data.findings) ? data.findings : [])
  .map((item) => sanitizeLine(item))
  .filter(Boolean)
  .slice(0, 4);
const risks = (Array.isArray(data.risks) ? data.risks : [])
  .map((item) => sanitizeLine(item))
  .filter(Boolean)
  .slice(0, 3);
const nextSteps = (Array.isArray(data.nextSteps) ? data.nextSteps : [])
  .map((item) => sanitizeLine(item))
  .filter(Boolean)
  .slice(0, 3);
const sources = Array.isArray(data.sources) ? data.sources : [];
const leadResults = Array.isArray(data.leadResults) ? data.leadResults : [];
const leadLabels = leadResults
  .map((result) => result.lead)
  .filter((lead, index, array) => typeof lead === 'string' && array.indexOf(lead) === index);
const highlights = findings.slice(0, 3);
const ariaSummary = [
  fronts <= 1
    ? 'ARIA consolido un frente principal para ' + accountName + '.'
    : 'ARIA consolido ' + fronts + ' frentes para ' + accountName + ' (' + leadLabels.join(', ') + ').',
  highlights.length ? 'Hallazgos clave: ' + highlights.join(' | ') + '.' : '',
  risks[0] ? 'Riesgo principal: ' + risks[0] + '.' : '',
].filter(Boolean).join(' ');
const firstAction =
  nextSteps[0] ??
  'Definir el trigger, el mapeo de datos y la primera prueba end-to-end con el cliente.';
const suggestedPilot =
  'Piloto sugerido: activar ' + deliverableLabel + ' por ' + channel + ' con seguimiento operativo durante 7 dias.';
return [
  {
    json: {
      requestId: data.requestId ?? 'manual',
      accountName,
      channel,
      deliverableLabel,
      source: data.source ?? 'manual',
      responseMode: data.responseMode ?? 'rapid',
      lane: data.lane ?? 'rapid',
      ariaSummary,
      decisionMode,
      tieBreakerUsed: Boolean(data.tieBreakerUsed),
      tieBreakerReason: data.tieBreakerReason ?? 'not-needed',
      decisionOrder: data.decisionOrder ?? [],
      steps: leadResults.map((result, index) => ({
        agentId: result.lead ?? 'SCOUT',
        lane: result.lane ?? 'rapid',
        statusDetail: result.leadSummary ?? ('Lead ' + (index + 1) + ' listo'),
      })),
      findings,
      risks,
      clientReadyOutput: {
        accountName,
        channel,
        deliverable: deliverableLabel,
        firstAction,
      },
      suggestedPilot,
      sources,
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
    'Consolida resultados reales de los leads y arma el cierre final de ARIA con hallazgos, riesgos y siguiente accion.'
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

for (const name of Object.keys(workflowDefinitions)) {
  workflowDefinitions[name].workflow.active = true;
}

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

function syncWebhookEntityRows(db, workflowId, workflow) {
  db.prepare('DELETE FROM webhook_entity WHERE workflowId = ?').run(workflowId);

  if (!workflow.active) {
    return;
  }

  const insertWebhookRow = db.prepare(`
    INSERT OR REPLACE INTO webhook_entity (
      workflowId,
      webhookPath,
      method,
      node,
      webhookId,
      pathLength
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const webhookNodes = Array.isArray(workflow.nodes)
    ? workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.webhook')
    : [];

  for (const node of webhookNodes) {
    const webhookPath = String(node?.parameters?.path ?? '').replace(/^\/+/, '');
    if (!webhookPath) continue;

    const method = String(node?.parameters?.httpMethod ?? 'POST').toUpperCase();
    insertWebhookRow.run(
      workflowId,
      webhookPath,
      method,
      String(node?.name ?? node?.id ?? 'Webhook'),
      null,
      webhookPath.length
    );
  }
}

function syncWorkflowHistoryRow(db, row, workflow, versionId, now) {
  db.prepare(`
    INSERT OR REPLACE INTO workflow_history (
      versionId,
      workflowId,
      authors,
      createdAt,
      updatedAt,
      nodes,
      connections,
      name,
      autosaved,
      description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    versionId,
    row.id,
    'import',
    now,
    now,
    JSON.stringify(workflow.nodes),
    JSON.stringify(workflow.connections),
    workflow.name ?? null,
    0,
    workflow.description ?? null
  );
}

function syncPublishedVersionRow(db, workflowId, versionId, isActive, now) {
  db.prepare('DELETE FROM workflow_published_version WHERE workflowId = ?').run(workflowId);

  if (!isActive) {
    return;
  }

  db.prepare(`
    INSERT OR REPLACE INTO workflow_published_version (
      workflowId,
      publishedVersionId,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?)
  `).run(workflowId, versionId, now, now);
}

function deactivateWorkflowRow(db, rowId, now) {
  db.prepare(`
    UPDATE workflow_entity
    SET
      activeVersionId = NULL,
      updatedAt = ?,
      active = 0
    WHERE id = ?
  `).run(now, rowId);

  syncPublishedVersionRow(db, rowId, null, false, now);
  syncWebhookEntityRows(db, rowId, { active: false, nodes: [] });
}

function syncDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return { dbPath, updated: 0, deactivated: 0, matchedNames: [] };
  }

  const db = new DatabaseSync(dbPath);
  const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
  let updated = 0;
  let deactivated = 0;
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
    const nextVersionId = crypto.randomUUID();

    syncWorkflowHistoryRow(db, row, workflow, nextVersionId, now);

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
        activeVersionId = ?,
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
      nextVersionId,
      workflow.active ? nextVersionId : null,
      Number(row.versionCounter ?? 1) + 1,
      workflow.description ?? null,
      now,
      workflow.active ? 1 : 0,
      row.id
    );

    syncPublishedVersionRow(db, row.id, nextVersionId, workflow.active, now);
    syncWebhookEntityRows(db, row.id, workflow);
  }

  function syncSingleActiveRow(name, workflow, rows) {
    if (rows.length === 0) {
      return null;
    }

    const primaryRow = rows[0];
    updateRow(primaryRow, workflow);
    updated += 1;

    for (const duplicateRow of rows.slice(1)) {
      deactivateWorkflowRow(db, duplicateRow.id, now);
      deactivated += 1;
    }

    matchedNames.push(`${name} x${rows.length} -> 1 activa`);
    return primaryRow;
  }

  const canonicalRowsByName = {};

  for (const [name, rows] of Object.entries(rowsByName)) {
    if (name === 'Office AI - Intake Router') {
      continue;
    }

    const workflow = materializeWorkflow(workflowDefinitions[name].workflow);
    canonicalRowsByName[name] = syncSingleActiveRow(name, workflow, rows);
  }

  const routerRows = rowsByName['Office AI - Intake Router'] ?? [];
  const replacements = {
    __LEAD_BRIEF_BUILDER_ID__: canonicalRowsByName['Office AI - Lead Brief Builder']?.id ?? '',
    __SPECIALIST_RUNNER_ID__: canonicalRowsByName['Office AI - Specialist Runner']?.id ?? '',
    __RESPONSE_ASSEMBLER_ID__: canonicalRowsByName['Office AI - Response Assembler']?.id ?? '',
  };

  if (routerRows.length > 0) {
    if (replacements.__LEAD_BRIEF_BUILDER_ID__ && replacements.__SPECIALIST_RUNNER_ID__ && replacements.__RESPONSE_ASSEMBLER_ID__) {
      const workflow = materializeWorkflow(workflowDefinitions['Office AI - Intake Router'].workflow, replacements);
      canonicalRowsByName['Office AI - Intake Router'] = syncSingleActiveRow(
        'Office AI - Intake Router',
        workflow,
        routerRows
      );
    } else {
      matchedNames.push(`Office AI - Intake Router x${routerRows.length} -> faltan dependencias`);
    }
  }

  return { dbPath, updated, deactivated, matchedNames };
}

writeWorkflowFiles();

const results = repoDbPaths.map(syncDatabase);

for (const result of results) {
  console.log(`DB: ${result.dbPath}`);
  console.log(`Updated rows: ${result.updated}`);
  console.log(`Deactivated duplicates: ${result.deactivated}`);
  console.log(`Matched: ${result.matchedNames.join(', ') || 'none'}`);
  console.log('');
}
