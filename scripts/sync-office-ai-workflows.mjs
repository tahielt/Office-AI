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

function waitNode(id, position, name, amount = 1) {
  return {
    parameters: {
      resume: 'timeInterval',
      amount,
      unit: 'seconds',
    },
    id,
    name,
    type: 'n8n-nodes-base.wait',
    typeVersion: 1.1,
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
    codeNode(
      'normalize-intake',
      [520, 260],
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
const mentionedAgents = Object.entries(mentionMap)
  .filter(([token]) => requested.includes(token))
  .map(([, agent]) => agent);
const inferredAgents = [];
if (/investig|compet|mercado|tendencia|web/.test(requested)) inferredAgents.push('SCOUT');
if (/repo|backend|codigo|arquitect|bug|infra/.test(requested)) inferredAgents.push('APEX');
if (/estrateg|growth|negocio|roadmap|plan/.test(requested)) inferredAgents.push('ZION');
if (/workflow|automat|n8n|deploy|implement/.test(requested)) inferredAgents.push('FORGE');
const leadAgents = [...new Set([...mentionedAgents, ...inferredAgents])].slice(0, 3);
const complexityScore =
  prompt.length +
  leadAgents.length * 35 +
  (/profundo|deep|completo|detallado/.test(requested) ? 80 : 0);
const responseMode = complexityScore >= 160 ? 'deep' : 'rapid';
return [
  {
    json: {
      requestId: payload.requestId ?? 'req-' + Date.now(),
      task: prompt,
      leadAgents: leadAgents.length ? leadAgents : ['SCOUT'],
      source: payload.source ?? 'webhook',
      freeOnly: true,
      complexityScore,
      responseMode,
      maxLatencyMs: responseMode === 'rapid' ? 2500 : 4500,
    },
  },
];`
    ),
    switchNode(
      'switch-mode',
      [800, 260],
      'Route Mode',
      "={{$json.responseMode === 'deep' ? 1 : 0}}"
    ),
    setAssignments('rapid-lane', [1080, 180], 'Rapid Lane', [
      assignment('lane', 'rapid'),
      assignment('targetLatencyMs', 2500, 'number'),
      assignment('handoffPlan', 'brief-builder -> specialist-runner -> compact-assembler'),
    ]),
    setAssignments('deep-lane', [1080, 340], 'Deep Lane', [
      assignment('lane', 'deep'),
      assignment('targetLatencyMs', 4500, 'number'),
      assignment('handoffPlan', 'brief-builder -> specialist-runner -> full-assembler'),
    ]),
    codeNode(
      'finalize-route',
      [1350, 260],
      'Finalize Route',
      `const current = items[0]?.json ?? {};
const leadAgents = Array.isArray(current.leadAgents) ? current.leadAgents : [];
const leadCount = Math.min(leadAgents.length || 1, 3);
return [
  {
    json: {
      ...current,
      leadCount,
      summary: \`ARIA envio la tarea por la lane \${current.lane} con \${leadCount} lead(s)\`,
      stages: ['intake-router', 'lead-brief-builder', 'specialist-runner', 'response-assembler'],
    },
  },
];`
    ),
    respondToWebhook('respond-intake', [1600, 260]),
  ];

  const connections = {
    'Office Intake Webhook': {
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
      main: [[{ node: 'Finalize Route', type: 'main', index: 0 }]],
    },
    'Deep Lane': {
      main: [[{ node: 'Finalize Route', type: 'main', index: 0 }]],
    },
    'Finalize Route': {
      main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
    },
  };

  return workflowBase(
    'Office AI - Intake Router',
    nodes,
    connections,
    'Webhook gratuito que normaliza pedidos, estima complejidad y enruta la tarea por lane rapid o deep sin usar APIs pagas.'
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
    waitNode('lead-brief-pause', [1320, 300], 'Short Coordination Wait', 1),
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
      main: [[{ node: 'Short Coordination Wait', type: 'main', index: 0 }]],
    },
    'Short Coordination Wait': {
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
    waitNode('specialist-pause', [1040, 300], 'Parallel Window', 1),
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
      main: [[{ node: 'Parallel Window', type: 'main', index: 0 }]],
    },
    'Parallel Window': {
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
      `return items.map((item) => ({
  json: {
    requestId: item.json.requestId ?? 'manual',
    lead: item.json.lead ?? 'SCOUT',
    findings: Array.isArray(item.json.findings) ? item.json.findings : [],
    risks: Array.isArray(item.json.risks) ? item.json.risks : [],
    nextSteps: Array.isArray(item.json.nextSteps) ? item.json.nextSteps : [],
    latencyMs: Number(item.json.latencyMs ?? 0),
    freeOnly: true,
  },
}));`
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
      leadResults,
      findings,
      risks,
      nextSteps,
      latencyMs,
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
return [
  {
    json: {
      requestId: data.requestId ?? 'manual',
      ariaSummary: \`ARIA cerro \${fronts} frente(s) de trabajo con salida gratis y orquestada\`,
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

function syncDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return { dbPath, updated: 0, matchedNames: [] };
  }

  const db = new DatabaseSync(dbPath);
  const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
  let updated = 0;
  const matchedNames = [];

  for (const [name, { workflow }] of Object.entries(workflowDefinitions)) {
    const rows = db.prepare('SELECT id, versionCounter FROM workflow_entity WHERE name = ?').all(name);

    for (const row of rows) {
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
      updated += 1;
    }

    if (rows.length > 0) {
      matchedNames.push(`${name} x${rows.length}`);
    }
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
