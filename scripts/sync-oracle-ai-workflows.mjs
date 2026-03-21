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

const oracleAgents = [
  {
    id: 'SCOUT',
    slug: 'scout',
    workflowName: 'Oracle AI - SCOUT',
    role: 'Inteligencia web y research',
    specialty: 'Detecta competidores, tendencias y validaciones publicas.',
    manualPrompt: 'Investiga el mercado y detecta oportunidades visibles para Oracle AI.',
  },
  {
    id: 'APEX',
    slug: 'apex',
    workflowName: 'Oracle AI - APEX',
    role: 'Diagnostico tecnico del repo',
    specialty: 'Evalua arquitectura, deuda tecnica y decisiones de implementacion.',
    manualPrompt: 'Revisa la arquitectura y marca riesgos tecnicos concretos.',
  },
  {
    id: 'VERA',
    slug: 'vera',
    workflowName: 'Oracle AI - VERA',
    role: 'Analisis y riesgo',
    specialty: 'Ordena hallazgos, riesgos y prioridades medibles.',
    manualPrompt: 'Analiza los riesgos y define metricas claras para la tarea.',
  },
  {
    id: 'ZION',
    slug: 'zion',
    workflowName: 'Oracle AI - ZION',
    role: 'Estrategia',
    specialty: 'Convierte informacion en direccion, foco y roadmap.',
    manualPrompt: 'Define una estrategia simple y priorizada para ejecutar la tarea.',
  },
  {
    id: 'FORGE',
    slug: 'forge',
    workflowName: 'Oracle AI - FORGE',
    role: 'Automatizacion y operaciones',
    specialty: 'Baja la idea a workflows, integraciones y pasos operativos.',
    manualPrompt: 'Transforma el pedido en un workflow operable, corto y gratis.',
  },
  {
    id: 'ECHO',
    slug: 'echo',
    workflowName: 'Oracle AI - ECHO',
    role: 'Comunicaciones',
    specialty: 'Da claridad narrativa, tono y estructura de salida.',
    manualPrompt: 'Convierte la respuesta en un mensaje claro para equipo o cliente.',
  },
  {
    id: 'VOX',
    slug: 'vox',
    workflowName: 'Oracle AI - VOX',
    role: 'Contenido',
    specialty: 'Adapta ideas a contenido publicable y formatos de difusion.',
    manualPrompt: 'Convierte la idea en contenido concreto para publicar.',
  },
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
      options: {},
    },
    id,
    name,
    webhookId: id,
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2.1,
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

function executeWorkflowNode(id, position, name, workflowIdExpression) {
  return {
    parameters: {
      source: 'database',
      workflowId: {
        value: workflowIdExpression,
      },
      mode: 'each',
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

function workflowBase(name, nodes, connections, description, active = false) {
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
      freeOnly: true,
      oracleAiWorkflow: true,
    },
    active,
    description,
  };
}

function buildOracleAgentWorkflow(agent) {
  const nodes = [
    executeWorkflowTrigger(`${agent.slug}-trigger`, [240, 180], 'Execute Workflow Trigger'),
    webhook(`${agent.slug}-webhook`, [240, 340], 'Incoming Request', `oracle-ai/${agent.slug}`),
    manualTrigger(`${agent.slug}-manual`, [240, 500], 'Manual Trigger'),
    codeNode(
      `${agent.slug}-sample-request`,
      [520, 500],
      'Sample Request',
      `return [
  {
    json: {
      requestId: 'manual-${agent.slug}-' + Date.now(),
      prompt: '${agent.manualPrompt}',
      requestedBy: 'ARIA',
      source: 'manual',
      freeOnly: true,
    },
  },
];`
    ),
    codeNode(
      `${agent.slug}-normalize`,
      [520, 340],
      'Normalize Input',
      `const payload = $json.body && typeof $json.body === 'object' ? $json.body : $json;
const rawPrompt = String(payload.prompt ?? payload.message ?? payload.task ?? '').trim();
const prompt = rawPrompt || '${agent.manualPrompt}';
const requestedSource = String(payload.source ?? '').trim().toLowerCase();
const executionSource = $json.body
  ? 'webhook'
  : requestedSource === 'manual'
    ? 'manual'
    : 'workflow';
return [
  {
    json: {
      requestId: payload.requestId ?? 'req-' + Date.now(),
      workflow: '${agent.workflowName}',
      agentId: '${agent.id}',
      role: '${agent.role}',
      specialty: '${agent.specialty}',
      prompt,
      task: prompt.replace(/\\s+/g, ' ').trim().slice(0, 420),
      requestedBy: String(payload.requestedBy ?? 'ARIA'),
      source: requestedSource || executionSource,
      executionSource,
      cutoffReason: payload.cutoffReason ?? 'not-needed',
      executionOrder: Array.isArray(payload.executionOrder) ? payload.executionOrder : [],
      tieBreakerContext: payload.tieBreakerContext ?? null,
      appBaseUrl: String(payload.appBaseUrl ?? 'http://127.0.0.1:3000').trim() || 'http://127.0.0.1:3000',
      freeOnly: true,
    },
  },
];`
    ),
    codeNode(
      `${agent.slug}-build-prompt`,
      [820, 340],
      'Build Specialist Prompt',
      `const promptLines = [
  '@${agent.id} resolve esta tarea para Oracle AI con una salida final utilizable.',
  'Rol: ${agent.role}.',
  'Especialidad: ${agent.specialty}.',
  'Pedido original: ' + ($json.prompt ?? 'Resolver la tarea actual'),
  $json.tieBreakerContext?.tieBreakerReason
    ? 'Contexto de desempate: ' + $json.tieBreakerContext.tieBreakerReason
    : '',
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
    specialistPrompt: promptLines.join('\\n'),
  },
};`,
      'runOnceForEachItem'
    ),
    codeNode(
      `${agent.slug}-run-real`,
      [1100, 340],
      'Run Real Specialist',
      `const baseUrl = String($json.appBaseUrl ?? 'http://127.0.0.1:3000').replace(/\\/+$/, '');
const lowerPrompt = String($json.prompt ?? '').toLowerCase();
const timeoutMs = /profundo|deep|completo|detallado/.test(lowerPrompt) ? 240000 : 180000;
try {
  const parsed = await this.helpers.httpRequest({
    method: 'POST',
    url: baseUrl + '/api/orchestrator',
    body: {
      prompt: $json.specialistPrompt,
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
      specialistRun: parsed,
    },
  };
} catch (error) {
  return {
    json: {
      ...$json,
      appBaseUrl: baseUrl,
      specialistRun: null,
      specialistError: error instanceof Error ? error.message : String(error),
      specialistErrorCode:
        error && typeof error === 'object' && 'code' in error ? String(error.code) : 'ORCHESTRATOR_ERROR',
      specialistErrorResponse:
        error && typeof error === 'object' && 'response' in error && error.response?.body
          ? error.response.body
          : null,
    },
  };
}`,
      'runOnceForEachItem'
    ),
    codeNode(
      `${agent.slug}-finalize`,
      [1380, 340],
      'Finalize Specialist Output',
      `const run = $json.specialistRun ?? {};
const steps = Array.isArray(run.steps) ? run.steps : [];
const targetAgent = $json.agentId ?? '${agent.id}';
const specialistStep =
  steps.find((step) => step.agentId === targetAgent) ??
  steps.find((step) => typeof step?.agentId === 'string' && step.agentId !== 'ARIA') ??
  null;
const ariaStep = [...steps].reverse().find((step) => step.agentId === 'ARIA') ?? null;
const output = specialistStep?.output && typeof specialistStep.output === 'object' ? specialistStep.output : {};
const evidence = Array.isArray(output.evidence) ? output.evidence : [];
const findings = evidence
  .map((item) => {
    const claim = typeof item?.claim === 'string' ? item.claim.trim() : '';
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    return claim || title;
  })
  .filter(Boolean);
if (findings.length === 0 && typeof output.summary === 'string' && output.summary.trim()) {
  findings.push(output.summary.trim());
}
const sources = evidence
  .map((item) => ({
    title: typeof item?.title === 'string' ? item.title : 'Fuente',
    url: typeof item?.url === 'string' ? item.url : '',
  }))
  .filter((item) => item.url);
const provider = String(specialistStep?.provider ?? 'stub');
const blocked = !specialistStep || provider === 'stub';
const blockedReason = blocked
  ? $json.specialistError ||
    (Array.isArray(run?.trace?.errors) && run.trace.errors.length ? run.trace.errors.join(' | ') : '') ||
    'El orquestador no devolvio una salida real para ' + targetAgent + '.'
  : '';
const summary =
  typeof output.summary === 'string' && output.summary.trim()
    ? output.summary.trim()
    : specialistStep?.message ?? '';
const risks = Array.isArray(output.risks) ? output.risks : [];
const nextSteps = Array.isArray(output.nextSteps) ? output.nextSteps : [];
return {
  json: {
    requestId: $json.requestId ?? 'manual',
    workflow: $json.workflow ?? '${agent.workflowName}',
    agentId: targetAgent,
    role: $json.role ?? '${agent.role}',
    specialty: $json.specialty ?? '${agent.specialty}',
    task: $json.task ?? String($json.prompt ?? '').slice(0, 420),
    prompt: $json.prompt ?? '',
    source: $json.source ?? 'manual',
    executionSource: $json.executionSource ?? 'workflow',
    requestedBy: $json.requestedBy ?? 'ARIA',
    cutoffReason: $json.cutoffReason ?? 'not-needed',
    executionOrder: $json.executionOrder ?? [],
    tieBreakerContext: $json.tieBreakerContext ?? null,
    blocked,
    blockedReason,
    provider,
    findings,
    risks: blocked && risks.length === 0 ? [blockedReason] : risks,
    nextSteps:
      blocked && nextSteps.length === 0
        ? ['Revisar el proveedor activo, el endpoint ' + ($json.appBaseUrl ?? 'http://127.0.0.1:3000') + ' y relanzar ' + targetAgent + '.']
        : nextSteps,
    sources,
    summary: blocked ? blockedReason : summary,
    message: specialistStep?.message ?? blockedReason,
    customerFacingOutput: ariaStep?.message ?? specialistStep?.message ?? blockedReason,
    thought: specialistStep?.thought ?? '',
    latencyMs: Number(run?.trace?.totalDurationMs ?? specialistStep?.trace?.durationMs ?? 0),
    freeOnly: true,
  },
};`,
      'runOnceForEachItem'
    ),
    switchNode(
      `${agent.slug}-return-mode`,
      [1660, 340],
      'Return Mode',
      "={{$json.executionSource === 'webhook' ? 1 : 0}}"
    ),
    setAssignments(`${agent.slug}-preview`, [1920, 240], 'Preview Result', [
      assignment('resultMode', 'manual-preview'),
      assignment('summarySource', `${agent.id.toLowerCase()}-preview`),
    ]),
    respondToWebhook(`${agent.slug}-respond`, [1920, 440], 'Respond to Webhook'),
  ];

  const connections = {
    'Execute Workflow Trigger': {
      main: [[{ node: 'Normalize Input', type: 'main', index: 0 }]],
    },
    'Incoming Request': {
      main: [[{ node: 'Normalize Input', type: 'main', index: 0 }]],
    },
    'Manual Trigger': {
      main: [[{ node: 'Sample Request', type: 'main', index: 0 }]],
    },
    'Sample Request': {
      main: [[{ node: 'Normalize Input', type: 'main', index: 0 }]],
    },
    'Normalize Input': {
      main: [[{ node: 'Build Specialist Prompt', type: 'main', index: 0 }]],
    },
    'Build Specialist Prompt': {
      main: [[{ node: 'Run Real Specialist', type: 'main', index: 0 }]],
    },
    'Run Real Specialist': {
      main: [[{ node: 'Finalize Specialist Output', type: 'main', index: 0 }]],
    },
    'Finalize Specialist Output': {
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
    agent.workflowName,
    nodes,
    connections,
    `${agent.id} trabaja como subworkflow gratis de Oracle AI con webhook, execute trigger y camino manual.`,
    true
  );
}

function buildOracleAriaRouter(agentIdMap) {
  const workflowMapLiteral = JSON.stringify(agentIdMap, null, 2);
  const nodes = [
    webhook('aria-webhook', [240, 260], 'Incoming Request', 'oracle-ai/aria'),
    manualTrigger('aria-manual', [240, 440], 'Manual Trigger'),
    codeNode(
      'aria-sample-request',
      [520, 440],
      'Sample Request',
      `return [
  {
    json: {
      requestId: 'manual-aria-' + Date.now(),
      prompt: 'Investiga mercado, revisa el sistema y baja un workflow gratis para Oracle AI',
      source: 'manual',
      requestedBy: 'USER',
      freeOnly: true,
    },
  },
];`
    ),
    codeNode(
      'aria-normalize',
      [520, 260],
      'Normalize Request',
      `const payload = $json.body && typeof $json.body === 'object' ? $json.body : $json;
const prompt = String(payload.prompt ?? payload.message ?? payload.task ?? '').trim() || 'Resolver un pedido general para Oracle AI';
const lower = prompt.toLowerCase();
const scoreMap = new Map([
  ['SCOUT', 0],
  ['APEX', 0],
  ['VERA', 0],
  ['ZION', 0],
  ['FORGE', 0],
  ['ECHO', 0],
  ['VOX', 0],
]);
const explicitMentions = [];
for (const agentId of scoreMap.keys()) {
  if (lower.includes(agentId.toLowerCase())) {
    explicitMentions.push(agentId);
    scoreMap.set(agentId, (scoreMap.get(agentId) ?? 0) + 120);
  }
}
const weightedSignals = [
  ['SCOUT', /(investig|mercado|compet|web|tendencia|noticia|research)/, 90],
  ['APEX', /(repo|backend|frontend|codigo|arquitect|error|bug|next|react)/, 85],
  ['VERA', /(riesgo|metrica|analisis|dato|forecast|dashboard)/, 78],
  ['ZION', /(estrateg|roadmap|prioridad|negocio|growth)/, 80],
  ['FORGE', /(workflow|n8n|automat|integracion|deploy|operaci)/, 82],
  ['ECHO', /(mensaje|mail|cliente|copy|respuesta|comunic)/, 68],
  ['VOX', /(post|reel|contenido|instagram|linkedin|youtube|tiktok)/, 68],
];
for (const [agentId, pattern, weight] of weightedSignals) {
  if (pattern.test(lower)) {
    scoreMap.set(agentId, (scoreMap.get(agentId) ?? 0) + weight);
  }
}
const rankedAgents = [...scoreMap.entries()]
  .filter(([, score]) => score > 0)
  .sort((left, right) => right[1] - left[1])
  .map(([agentId]) => agentId);
const complexityScore =
  prompt.length +
  rankedAgents.length * 28 +
  (/profundo|deep|completo|detallado/.test(lower) ? 70 : 0);
const topScore = scoreMap.get(rankedAgents[0] ?? 'SCOUT') ?? 0;
const secondScore = scoreMap.get(rankedAgents[1] ?? '') ?? 0;
const maxAgents = explicitMentions.length === 1
  ? 1
  : topScore >= 110 && secondScore < 55
    ? 1
    : complexityScore < 170
      ? 2
      : 3;
const targetAgents = (rankedAgents.length ? rankedAgents : ['SCOUT']).slice(0, maxAgents);
const cutoffReason = maxAgents === 1
  ? (explicitMentions.length === 1 ? 'explicit-single-agent' : 'single-high-confidence-agent')
  : maxAgents === 2
    ? 'balanced-duo-cap'
    : 'three-agent-expansion';
return [
  {
    json: {
      requestId: payload.requestId ?? 'req-' + Date.now(),
      prompt,
      source: payload.source ?? ($json.body ? 'webhook' : 'manual'),
      requestedBy: String(payload.requestedBy ?? 'USER'),
      targetAgents: targetAgents.length ? targetAgents : ['SCOUT'],
      executionOrder: targetAgents.map((agentId, index) => ({
        agentId,
        order: index + 1,
        score: scoreMap.get(agentId) ?? 0,
      })),
      reserveAgents: rankedAgents.slice(maxAgents, 3),
      maxAgents,
      cutoffReason,
      earlyStopEligible: maxAgents === 1,
      complexityScore,
      freeOnly: true,
    },
  },
];`
    ),
    codeNode(
      'aria-expand-agents',
      [820, 260],
      'Expand Agent Targets',
      `const workflowMap = ${workflowMapLiteral};
const source = items[0]?.json ?? {};
const targetAgents = Array.isArray(source.targetAgents) && source.targetAgents.length ? source.targetAgents : ['SCOUT'];
return targetAgents.map((agentId, index) => ({
  json: {
    requestId: source.requestId,
    prompt: source.prompt,
    source: source.source,
    requestedBy: 'ARIA',
    targetAgent: agentId,
    workflowId: workflowMap[agentId],
    agentIndex: index + 1,
    executionOrder: source.executionOrder ?? [],
    reserveAgents: source.reserveAgents ?? [],
    maxAgents: source.maxAgents ?? targetAgents.length,
    cutoffReason: source.cutoffReason ?? 'fallback',
    earlyStopEligible: source.earlyStopEligible ?? false,
    complexityScore: source.complexityScore ?? 0,
    freeOnly: true,
  },
})).filter((item) => Boolean(item.json.workflowId));`
    ),
    executeWorkflowNode(
      'aria-run-agent-workflow',
      [1110, 260],
      'Run Agent Workflow',
      '={{$json.workflowId}}'
    ),
    codeNode(
      'aria-detect-tie-break',
      [1390, 260],
      'Detect Oracle Tie Break',
      `const results = items.map((item) => item.json);
const reserveAgents = Array.isArray(results[0]?.reserveAgents) ? results[0].reserveAgents : [];
const lowerPrompt = String(results[0]?.prompt ?? '').toLowerCase();
const familyMap = {
  SCOUT: 'discovery',
  VERA: 'discovery',
  APEX: 'build',
  FORGE: 'build',
  ZION: 'strategy',
  ECHO: 'message',
  VOX: 'message',
};
const families = [...new Set(results.map((result) => familyMap[result.agentId] ?? 'general'))];
const conflictSignals = /(versus| vs |compar|elegir|tradeoff|conflict|contradic|priorizar|balance|decision|primero)/.test(lowerPrompt);
const tieBreakerAgent = reserveAgents[0] ?? null;
const tieBreakerRequired = Boolean(tieBreakerAgent) && results.length === 2 && (conflictSignals || families.length > 1);
return [
  {
    json: {
      ...results[0],
      originalResults: results,
      tieBreakerRequired,
      tieBreakerAgent,
      tieBreakerReason: tieBreakerRequired
        ? (conflictSignals ? 'prompt-signals-conflict' : 'cross-discipline-conflict')
        : 'not-needed',
    },
  },
];`
    ),
    switchNode(
      'aria-tie-break-gate',
      [1670, 260],
      'Oracle Tie Break Gate',
      "={{$json.tieBreakerRequired ? 1 : 0}}"
    ),
    codeNode(
      'aria-prepare-tie-break',
      [1950, 440],
      'Prepare Oracle Tie Break',
      `const workflowMap = ${workflowMapLiteral};
const executionOrder = Array.isArray($json.executionOrder) ? $json.executionOrder : [];
return [
  {
    json: {
      requestId: $json.requestId ?? 'manual',
      prompt: $json.prompt ?? 'Resolver la tarea actual',
      source: $json.source ?? 'workflow',
      requestedBy: 'ARIA',
      targetAgent: $json.tieBreakerAgent,
      workflowId: workflowMap[$json.tieBreakerAgent],
      executionOrder: [
        ...executionOrder,
        {
          agentId: $json.tieBreakerAgent,
          order: executionOrder.length + 1,
          score: 0,
        },
      ],
      cutoffReason: $json.tieBreakerReason ?? 'tie-breaker',
      originalResults: Array.isArray($json.originalResults) ? $json.originalResults : [],
      tieBreakerContext: {
        tieBreakerAgent: $json.tieBreakerAgent,
        tieBreakerReason: $json.tieBreakerReason ?? 'tie-breaker',
      },
      freeOnly: true,
    },
  },
];`
    ),
    executeWorkflowNode(
      'aria-run-tie-break-agent',
      [2230, 440],
      'Run Tie Break Agent',
      '={{$json.workflowId}}'
    ),
    mergeNode(
      'aria-merge-tie-break',
      [2510, 360],
      'Merge Oracle Tie Break'
    ),
    codeNode(
      'aria-combine-tie-break',
      [2790, 360],
      'Combine Oracle Tie Break',
      `const wrapper = items.find((item) => Array.isArray(item.json.originalResults))?.json ?? {};
const tieBreakerResults = items
  .filter((item) => !Array.isArray(item.json.originalResults))
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
    codeNode(
      'aria-assemble-response',
      [3070, 260],
      'Assemble Oracle Response',
      `const expanded = items.flatMap((item) => {
const payload = item.json ?? {};
if (Array.isArray(payload.originalResults)) {
  const tieBreakerResults = Array.isArray(payload.tieBreakerResults) ? payload.tieBreakerResults : [];
  return [...payload.originalResults, ...tieBreakerResults].map((result) => ({
    ...result,
    tieBreakerUsed: tieBreakerResults.length > 0,
    tieBreakerReason: payload.tieBreakerReason ?? payload.cutoffReason ?? 'not-needed',
  }));
}
return [payload];
});
const results = expanded;
const agents = results.map((result) => result.agentId);
const decisionMode = agents.length <= 1 ? 'single-agent' : 'multi-agent';
return [
  {
    json: {
      requestId: results[0]?.requestId ?? 'manual',
      source: results[0]?.source ?? 'manual',
      requestedBy: results[0]?.requestedBy ?? 'USER',
      selectedAgents: agents,
      executionOrder: results.map((result, index) => ({
        agentId: result.agentId,
        order: index + 1,
      })),
      delegated: agents.length > 0,
      ariaSummary: agents.length <= 1
        ? 'ARIA aplico corte temprano y resolvio el pedido con un solo agente en Oracle AI.'
        : 'ARIA coordino ' + agents.length + ' agente(s) en Oracle AI.',
      decisionMode,
      cutoffReason: results[0]?.cutoffReason ?? 'fallback',
      tieBreakerUsed: results.some((result) => Boolean(result.tieBreakerUsed)),
      results,
      freeOnly: true,
    },
  },
];`
    ),
    switchNode(
      'aria-return-mode',
      [3350, 260],
      'Return Mode',
      "={{$json.source === 'webhook' ? 1 : 0}}"
    ),
    setAssignments('aria-preview-result', [3630, 180], 'Preview Result', [
      assignment('resultMode', 'manual-preview'),
      assignment('summarySource', 'oracle-aria-preview'),
    ]),
    respondToWebhook('aria-respond', [3630, 360], 'Respond to Webhook'),
  ];

  const connections = {
    'Incoming Request': {
      main: [[{ node: 'Normalize Request', type: 'main', index: 0 }]],
    },
    'Manual Trigger': {
      main: [[{ node: 'Sample Request', type: 'main', index: 0 }]],
    },
    'Sample Request': {
      main: [[{ node: 'Normalize Request', type: 'main', index: 0 }]],
    },
    'Normalize Request': {
      main: [[{ node: 'Expand Agent Targets', type: 'main', index: 0 }]],
    },
    'Expand Agent Targets': {
      main: [[{ node: 'Run Agent Workflow', type: 'main', index: 0 }]],
    },
    'Run Agent Workflow': {
      main: [[{ node: 'Detect Oracle Tie Break', type: 'main', index: 0 }]],
    },
    'Detect Oracle Tie Break': {
      main: [[{ node: 'Oracle Tie Break Gate', type: 'main', index: 0 }]],
    },
    'Oracle Tie Break Gate': {
      main: [
        [{ node: 'Assemble Oracle Response', type: 'main', index: 0 }],
        [{ node: 'Prepare Oracle Tie Break', type: 'main', index: 0 }],
      ],
    },
    'Prepare Oracle Tie Break': {
      main: [
        [{ node: 'Run Tie Break Agent', type: 'main', index: 0 }],
        [{ node: 'Merge Oracle Tie Break', type: 'main', index: 0 }],
      ],
    },
    'Run Tie Break Agent': {
      main: [[{ node: 'Merge Oracle Tie Break', type: 'main', index: 1 }]],
    },
    'Merge Oracle Tie Break': {
      main: [[{ node: 'Combine Oracle Tie Break', type: 'main', index: 0 }]],
    },
    'Combine Oracle Tie Break': {
      main: [[{ node: 'Assemble Oracle Response', type: 'main', index: 0 }]],
    },
    'Assemble Oracle Response': {
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
    'Oracle AI - ARIA Router',
    nodes,
    connections,
    'ARIA coordina hasta 3 agentes Oracle AI dentro de n8n, decide orden, aplica corte temprano, fuerza desempate cuando hace falta y usa solo nodos gratis.',
    true
  );
}

function oracleWorkflowDefinitions(agentIdMap) {
  const definitions = {
    'Oracle AI - ARIA Router': {
      fileName: 'oracle-ai-aria-router.json',
      workflow: buildOracleAriaRouter(agentIdMap),
    },
  };

  for (const agent of oracleAgents) {
    definitions[agent.workflowName] = {
      fileName: `oracle-ai-${agent.slug}.json`,
      workflow: buildOracleAgentWorkflow(agent),
    };
  }

  return definitions;
}

function writeWorkflowFiles(definitions) {
  fs.mkdirSync(workflowDir, { recursive: true });
  for (const { fileName, workflow } of Object.values(definitions)) {
    const targetPath = path.join(workflowDir, fileName);
    fs.writeFileSync(targetPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
  }
}

function replaceIds(value, replacements) {
  if (Array.isArray(value)) {
    return value.map((item) => replaceIds(item, replacements));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, replaceIds(nestedValue, replacements)])
    );
  }

  if (typeof value === 'string') {
    let replaced = value;
    for (const [placeholder, actualValue] of Object.entries(replacements)) {
      if (!placeholder || !actualValue) continue;
      replaced = replaced.split(placeholder).join(actualValue);
    }
    return replaced;
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
      String(node?.webhookId ?? node?.id ?? ''),
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

function syncDatabase(dbPath, definitions) {
  if (!fs.existsSync(dbPath)) {
    return { dbPath, updated: 0, deactivated: 0, matchedNames: [] };
  }

  const db = new DatabaseSync(dbPath);
  const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
  let updated = 0;
  let deactivated = 0;
  const matchedNames = [];

  const rowsByName = {};
  for (const name of Object.keys(definitions)) {
    rowsByName[name] = db
      .prepare('SELECT id, versionCounter FROM workflow_entity WHERE name = ? ORDER BY createdAt DESC, id DESC')
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
      matchedNames.push(`${name} -> missing in DB`);
      return null;
    }

    const primaryRow = rows[0];
    updateRow(primaryRow, workflow);
    updated += 1;

    for (const duplicateRow of rows.slice(1)) {
      deactivateWorkflowRow(db, duplicateRow.id, now);
      deactivated += 1;
    }

    matchedNames.push(`${name} x${rows.length} -> 1 active`);
    return primaryRow;
  }

  const canonicalRowsByName = {};

  for (const agent of oracleAgents) {
    const name = agent.workflowName;
    const rows = rowsByName[name] ?? [];
    const workflow = materializeWorkflow(definitions[name].workflow);
    canonicalRowsByName[name] = syncSingleActiveRow(name, workflow, rows);
  }

  const routerRows = rowsByName['Oracle AI - ARIA Router'] ?? [];
  const replacements = Object.fromEntries(
    oracleAgents.map((agent) => [placeholderMap[agent.id], canonicalRowsByName[agent.workflowName]?.id ?? ''])
  );

  if (routerRows.length > 0 && Object.values(replacements).every(Boolean)) {
    const workflow = materializeWorkflow(definitions['Oracle AI - ARIA Router'].workflow, replacements);
    syncSingleActiveRow('Oracle AI - ARIA Router', workflow, routerRows);
  } else if (routerRows.length > 0) {
    matchedNames.push('Oracle AI - ARIA Router -> missing dependent workflow IDs');
  } else {
    matchedNames.push('Oracle AI - ARIA Router -> missing in DB');
  }

  return { dbPath, updated, deactivated, matchedNames };
}

const placeholderMap = Object.fromEntries(
  oracleAgents.map((agent) => [agent.id, `__${agent.id}_WORKFLOW_ID__`])
);

const workflowDefinitions = oracleWorkflowDefinitions(placeholderMap);
writeWorkflowFiles(workflowDefinitions);

const results = repoDbPaths.map((dbPath) => syncDatabase(dbPath, workflowDefinitions));

for (const result of results) {
  console.log(`DB: ${result.dbPath}`);
  console.log(`Updated rows: ${result.updated}`);
  console.log(`Deactivated duplicates: ${result.deactivated}`);
  console.log(`Matched: ${result.matchedNames.join(', ') || 'none'}`);
  console.log('');
}
