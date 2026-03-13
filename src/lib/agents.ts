import { Agent, Task, SystemMetrics, AgentStatus } from "@/types/agent";

export const INITIAL_AGENTS: Agent[] = [
  {
    id: "scout", name: "SCOUT", role: "Agente de Inteligencia", color: "#00f5ff",
    status: "researching", currentTask: "Analizando competencia en turismo Patagonia Q1",
    tasksCompleted: 142, tokensUsed: 2400000, uptime: "14d 6h", avatar: "SC",
    animation: "idle", isSummoned: false, position: { x: 1, y: 1 },
    log: [
      { id: "s1", type: "system",        text: "Conectando a fuentes de datos de mercado...", timestamp: new Date() },
      { id: "s2", type: "thought",       text: "12 competidores nuevos en Bariloche. Filtrando por relevancia...", timestamp: new Date() },
      { id: "s3", type: "communication", text: "@ZION 3 competidores bajaron precios esta semana.", timestamp: new Date() },
    ],
  },
  {
    id: "apex", name: "APEX", role: "Agente de Ingeniería", color: "#00ff88",
    status: "coding", currentTask: "Refactorizando módulo de autenticación — JWT → OAuth2",
    tasksCompleted: 89, tokensUsed: 1800000, uptime: "7d 2h", avatar: "AX",
    animation: "idle", isSummoned: false, position: { x: 2, y: 1 },
    log: [
      { id: "a1", type: "system",        text: "Leyendo auth/middleware.ts (412 líneas)...", timestamp: new Date() },
      { id: "a2", type: "thought",       text: "3 referencias JWT. Creando adaptador OAuth2.", timestamp: new Date() },
      { id: "a3", type: "communication", text: "@VERA ¿Ajusto el payload de analytics para el nuevo flujo?", timestamp: new Date() },
    ],
  },
  {
    id: "vera", name: "VERA", role: "Agente de Análisis", color: "#ffaa00",
    status: "analyzing", currentTask: "Construyendo modelo de forecast de ingresos Q3",
    tasksCompleted: 213, tokensUsed: 3100000, uptime: "21d 4h", avatar: "VR",
    animation: "idle", isSummoned: false, position: { x: 1, y: 2 },
    log: [
      { id: "v1", type: "system",        text: "Cargando dataset (84.231 filas)...", timestamp: new Date() },
      { id: "v2", type: "thought",       text: "Varianza alta en Q2. Ajustando pesos de regresión.", timestamp: new Date() },
      { id: "v3", type: "communication", text: "@ZION Forecast listo para revisión.", timestamp: new Date() },
    ],
  },
  {
    id: "zion", name: "ZION", role: "Agente de Estrategia", color: "#ff4466",
    status: "thinking", currentTask: "Evaluando expansión de mercado — LATAM vs APAC",
    tasksCompleted: 67, tokensUsed: 920000, uptime: "3d 11h", avatar: "ZN",
    animation: "idle", isSummoned: false, position: { x: 2, y: 2 },
    log: [
      { id: "z1", type: "system",        text: "Comparando estimaciones de TAM...", timestamp: new Date() },
      { id: "z2", type: "thought",       text: "Regulaciones LATAM muestran cuellos de botella.", timestamp: new Date() },
      { id: "z3", type: "communication", text: "@SCOUT ¿Podés hacer deep dive en regulaciones fintech de Brasil?", timestamp: new Date() },
    ],
  },
  {
    id: "forge", name: "FORGE", role: "Agente de Automatización", color: "#f97316",
    status: "running", currentTask: "Conectando API de MercadoPago con sistema de reservas",
    tasksCompleted: 54, tokensUsed: 980000, uptime: "5d 3h", avatar: "FG",
    animation: "idle", isSummoned: false, position: { x: 3, y: 1 },
    log: [
      { id: "f1", type: "system",        text: "Inicializando conector MercadoPago v3...", timestamp: new Date() },
      { id: "f2", type: "thought",       text: "Race condition en webhook. Necesito mutex.", timestamp: new Date() },
      { id: "f3", type: "communication", text: "@APEX Endpoint listo para revisión de seguridad.", timestamp: new Date() },
    ],
  },
  {
    id: "echo", name: "ECHO", role: "Agente de Comunicaciones", color: "#22d3ee",
    status: "idle", currentTask: "Redactando seguimiento de propuestas enviadas esta semana",
    tasksCompleted: 38, tokensUsed: 560000, uptime: "2d 8h", avatar: "EC",
    animation: "idle", isSummoned: false, position: { x: 2, y: 3 },
    log: [
      { id: "e1", type: "system",        text: "Cargando plantillas de email...", timestamp: new Date() },
      { id: "e2", type: "thought",       text: "3 propuestas sin respuesta +5 días. Redactando follow-ups.", timestamp: new Date() },
      { id: "e3", type: "communication", text: "@ZION Enviados 3 follow-ups. Tasa de apertura: 68%.", timestamp: new Date() },
    ],
  },
  {
    id: "vox", name: "VOX", role: "Agente de Contenido", color: "#a855f7",
    status: "idle", currentTask: "Generando Reels para campaña de temporada alta",
    tasksCompleted: 77, tokensUsed: 1240000, uptime: "6d 2h", avatar: "VX",
    animation: "idle", isSummoned: false, position: { x: 3, y: 2 },
    log: [
      { id: "vx1", type: "system",        text: "Cargando briefing de campaña de invierno...", timestamp: new Date() },
      { id: "vx2", type: "thought",       text: "3 formatos: Reel 30s, carrusel LinkedIn, story IG. Adaptando copy.", timestamp: new Date() },
      { id: "vx3", type: "communication", text: "@ECHO Copy del Reel listo. ¿Revisás antes de publicar?", timestamp: new Date() },
    ],
  },
  {
    id: "aria", name: "ARIA", role: "Recepcionista IA", color: "#e2e8f0",
    status: "idle", currentTask: "Monitoreando canal de entrada...",
    tasksCompleted: 0, tokensUsed: 0, uptime: "∞", avatar: "AR",
    animation: "idle", isSummoned: false, position: { x: 0, y: 0 },
    log: [],
  },
];

export const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; pulse: boolean }> = {
  idle:        { label: "INACTIVO",     color: "#888",    pulse: false },
  coding:      { label: "PROGRAMANDO",  color: "#00ff88", pulse: true  },
  researching: { label: "INVESTIGANDO", color: "#00f5ff", pulse: true  },
  analyzing:   { label: "ANALIZANDO",   color: "#ffaa00", pulse: true  },
  walking:     { label: "MOVIÉNDOSE",   color: "#a78bfa", pulse: false },
  meeting:     { label: "EN REUNIÓN",   color: "#f472b6", pulse: false },
  break:       { label: "PAUSA",        color: "#888",    pulse: false },
  thinking:    { label: "PENSANDO",     color: "#ff4466", pulse: true  },
  running:     { label: "EJECUTANDO",   color: "#f97316", pulse: true  },
  done:        { label: "COMPLETADO",   color: "#00ff88", pulse: false },
};

const TASK_TEMPLATES = [
  { desc: "Resumiendo informe de mercado: {topic}",          agent: "scout" },
  { desc: "Scraping de precios de competidores en {topic}",  agent: "scout" },
  { desc: "Escribiendo tests para módulo {module}",          agent: "apex"  },
  { desc: "Corrigiendo bug en módulo {module}",              agent: "apex"  },
  { desc: "Proyectando tasa de churn Q4",                    agent: "vera"  },
  { desc: "Analizando sentimiento de feedback de clientes",  agent: "vera"  },
  { desc: "Evaluando expansión a nuevo segmento de {topic}", agent: "zion"  },
  { desc: "Conectando API de {module} con sistema interno",  agent: "forge" },
  { desc: "Automatizando workflow de onboarding",            agent: "forge" },
  { desc: "Redactando follow-up para propuesta enviada",     agent: "echo"  },
  { desc: "Respondiendo consultas de WhatsApp Business",     agent: "echo"  },
  { desc: "Generando script de Reel para {topic}",          agent: "vox"   },
  { desc: "Adaptando contenido a LinkedIn e Instagram",      agent: "vox"   },
  { desc: "Creando carrusel de posts para campaña {topic}", agent: "vox"   },
];

const TOPICS  = ["turismo aventura", "hotelería Patagonia", "experiencias premium", "temporada de esquí", "trekking", "rafting"];
const MODULES = ["pagos", "reservas", "autenticación", "dashboard", "notificaciones", "CRM"];

export function generateMockTask(): Task {
  const template = TASK_TEMPLATES[Math.floor(Math.random() * TASK_TEMPLATES.length)];
  const agent = INITIAL_AGENTS.find((a) => a.id === template.agent)!;
  const desc = template.desc
    .replace("{topic}",  TOPICS[Math.floor(Math.random()  * TOPICS.length)])
    .replace("{module}", MODULES[Math.floor(Math.random() * MODULES.length)]);
  return { id: crypto.randomUUID(), agentId: agent.id, agentName: agent.name, description: desc, status: "running", startedAt: new Date(), color: agent.color };
}

export function getInitialMetrics(): SystemMetrics {
  return { totalTasks: 694, activeTasks: 7, tokensTotal: 10860000, requestsPerMin: 31, uptime: "45d 3h 12m", status: "nominal" };
}