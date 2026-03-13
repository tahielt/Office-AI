import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const workflowDir = path.join(repoRoot, 'n8n', 'workflows');
const oracleDbPath = path.join(process.env.USERPROFILE, '.n8n', '.n8n', 'database.sqlite');

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

function executeWorkflowNode(id, position, name, workflowIdExpression) {
  return {
    parameters: {
      source: 'database',
      workflowId: workflowIdExpression,
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
return [
  {
    json: {
      requestId: payload.requestId ?? 'req-' + Date.now(),
      workflow: '${agent.workflowName}',
      agentId: '${agent.id}',
      role: '${agent.role}',
      specialty: '${agent.specialty}',
      prompt,
      requestedBy: String(payload.requestedBy ?? 'ARIA'),
      source: payload.source ?? ($json.body ? 'webhook' : 'workflow'),
      freeOnly: true,
    },
  },
];`
    ),
    codeNode(
      `${agent.slug}-build-output`,
      [820, 340],
      'Build Specialist Output',
      `const prompt = $json.prompt ?? '';
const compactTask = prompt.length > 140 ? prompt.slice(0, 137) + '...' : prompt;
return {
  json: {
    ...$json,
    task: compactTask,
    thought: '${agent.id} reviso el pedido y produjo una salida corta y accionable.',
    message: '${agent.id} recomienda ejecutar un frente puntual alineado con su especialidad.',
    findings: [
      '${agent.id} detecto una oportunidad clara vinculada al pedido',
      '${agent.id} sugiere mantener foco en una sola decision por iteracion',
    ],
    risks: [
      '${agent.id} marco una dependencia o supuesto a validar',
    ],
    nextSteps: [
      '${agent.id} propone un siguiente paso corto y medible',
      'Cerrar con sintesis desde ARIA',
    ],
    latencyMs: 900,
  },
};`,
      'runOnceForEachItem'
    ),
    switchNode(
      `${agent.slug}-return-mode`,
      [1100, 340],
      'Return Mode',
      "={{$json.source === 'webhook' ? 1 : 0}}"
    ),
    setAssignments(`${agent.slug}-preview`, [1360, 240], 'Preview Result', [
      assignment('resultMode', 'manual-preview'),
      assignment('summarySource', `${agent.id.toLowerCase()}-preview`),
    ]),
    respondToWebhook(`${agent.slug}-respond`, [1360, 440], 'Respond to Webhook'),
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
      main: [[{ node: 'Build Specialist Output', type: 'main', index: 0 }]],
    },
    'Build Specialist Output': {
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
const selectedAgents = [];
if (/(investig|mercado|compet|web|tendencia|noticia)/.test(lower)) selectedAgents.push('SCOUT');
if (/(repo|backend|frontend|codigo|arquitect|error|bug|next|react)/.test(lower)) selectedAgents.push('APEX');
if (/(riesgo|metrica|analisis|dato|forecast|dashboard)/.test(lower)) selectedAgents.push('VERA');
if (/(estrateg|roadmap|prioridad|negocio|growth)/.test(lower)) selectedAgents.push('ZION');
if (/(workflow|n8n|automat|integracion|deploy|operaci)/.test(lower)) selectedAgents.push('FORGE');
if (/(mensaje|mail|cliente|copy|respuesta)/.test(lower)) selectedAgents.push('ECHO');
if (/(post|reel|contenido|instagram|linkedin|youtube|tiktok)/.test(lower)) selectedAgents.push('VOX');
const targetAgents = [...new Set(selectedAgents)].slice(0, 3);
return [
  {
    json: {
      requestId: payload.requestId ?? 'req-' + Date.now(),
      prompt,
      source: payload.source ?? ($json.body ? 'webhook' : 'manual'),
      requestedBy: String(payload.requestedBy ?? 'USER'),
      targetAgents: targetAgents.length ? targetAgents : ['SCOUT'],
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
      'aria-assemble-response',
      [1390, 260],
      'Assemble Oracle Response',
      `const results = items.map((item) => item.json);
const agents = results.map((result) => result.agentId);
return [
  {
    json: {
      requestId: results[0]?.requestId ?? 'manual',
      source: results[0]?.source ?? 'manual',
      requestedBy: results[0]?.requestedBy ?? 'USER',
      selectedAgents: agents,
      delegated: agents.length > 0,
      ariaSummary: 'ARIA coordino ' + agents.length + ' agente(s) en Oracle AI.',
      results,
      freeOnly: true,
    },
  },
];`
    ),
    switchNode(
      'aria-return-mode',
      [1660, 260],
      'Return Mode',
      "={{$json.source === 'webhook' ? 1 : 0}}"
    ),
    setAssignments('aria-preview-result', [1920, 180], 'Preview Result', [
      assignment('resultMode', 'manual-preview'),
      assignment('summarySource', 'oracle-aria-preview'),
    ]),
    respondToWebhook('aria-respond', [1920, 360], 'Respond to Webhook'),
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
    'ARIA coordina hasta 3 agentes Oracle AI dentro de n8n usando Execute Workflow y solo nodos gratis.',
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

function syncDatabase(definitions) {
  if (!fs.existsSync(oracleDbPath)) {
    return { dbPath: oracleDbPath, updated: 0, matchedNames: [] };
  }

  const db = new DatabaseSync(oracleDbPath);
  const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
  let updated = 0;
  const matchedNames = [];

  const rowsByName = {};
  for (const name of Object.keys(definitions)) {
    rowsByName[name] = db
      .prepare('SELECT id, versionCounter, active FROM workflow_entity WHERE name = ? ORDER BY id')
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
      row.active ? 1 : 0,
      row.id
    );
  }

  for (const [name, rows] of Object.entries(rowsByName)) {
    const workflow = definitions[name].workflow;
    for (const row of rows) {
      updateRow(row, workflow);
      updated += 1;
    }
    if (rows.length > 0) {
      matchedNames.push(`${name} x${rows.length}`);
    }
  }

  return { dbPath: oracleDbPath, updated, matchedNames };
}

const placeholderMap = Object.fromEntries(
  oracleAgents.map((agent) => [agent.id, `__${agent.id}_WORKFLOW_ID__`])
);

const db = fs.existsSync(oracleDbPath) ? new DatabaseSync(oracleDbPath) : null;
const actualMap = {};
if (db) {
  for (const agent of oracleAgents) {
    const row = db
      .prepare('SELECT id FROM workflow_entity WHERE name = ? ORDER BY id LIMIT 1')
      .get(agent.workflowName);
    actualMap[agent.id] = row?.id ?? placeholderMap[agent.id];
  }
}

const fileDefinitions = oracleWorkflowDefinitions(placeholderMap);
writeWorkflowFiles(fileDefinitions);

const runtimeDefinitions = oracleWorkflowDefinitions(actualMap);
const result = syncDatabase(runtimeDefinitions);

console.log(`DB: ${result.dbPath}`);
console.log(`Updated rows: ${result.updated}`);
console.log(`Matched: ${result.matchedNames.join(', ') || 'none'}`);
