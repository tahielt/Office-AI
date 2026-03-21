import { promises as fs } from "node:fs";
import path from "node:path";

import { sanitizeTextInput, sanitizeWebhookUrl } from "@/lib/inputSanitizers";
import { N8nWorkflowCatalogItem, N8nWorkflowWebhook } from "@/types/n8nStudio";

const WORKFLOWS_DIR = path.join(process.cwd(), "n8n", "workflows");
const DEFAULT_WEBHOOK_URL = "http://127.0.0.1:5678/webhook/office-ai/intake";

const WORKFLOW_SUMMARIES: Record<string, string> = {
  "chatwoot-crm-whatsapp-telegram-bridge":
    "Bridge CRM real para enrutar eventos entre Chatwoot, WhatsApp Cloud API y Telegram Bot API con validacion de credenciales.",
  "office-ai-intake-router":
    "Entrada principal de Office AI: recibe pedidos reales, detecta el lane correcto y dispara el resto del pipeline.",
  "office-ai-lead-brief-builder":
    "Arma el brief corto por lead para que el resto del equipo trabaje con contexto util y sin cargar ruido.",
  "office-ai-response-assembler":
    "Consolida hallazgos, riesgos y proximos pasos en una salida compacta lista para ARIA o para cliente.",
  "office-ai-specialist-runner":
    "Ejecuta squads internos por lead y devuelve un consolidado con findings accionables por especialista.",
  "oracle-ai-aria-router":
    "Router de ARIA para los workflows de Oracle AI, pensado para coordinar pedidos y decidir el mejor frente.",
  "oracle-ai-apex": "Flujo enfocado en build, implementacion y ejecucion tecnica dentro del ecosistema Oracle AI.",
  "oracle-ai-echo": "Flujo centrado en salida comercial y comunicacional para responder con claridad y conversion.",
  "oracle-ai-forge": "Flujo operativo para automatizacion, integraciones y bajada de procesos repetibles.",
  "oracle-ai-scout": "Flujo de research para discovery, mercado y validacion de contexto antes de ejecutar.",
  "oracle-ai-vera": "Flujo analitico para riesgos, metricas y chequeos operativos antes de cerrar una respuesta.",
  "oracle-ai-vox": "Flujo orientado a contenido y formato de salida para piezas publicables o presentables.",
  "oracle-ai-zion": "Flujo de estrategia, priorizacion y framing de oportunidad para convertir pedidos en plan.",
};

type WorkflowNode = {
  type?: unknown;
  parameters?: unknown;
};

type WorkflowJson = {
  name?: unknown;
  description?: unknown;
  active?: unknown;
  nodes?: unknown;
};

function inferGroup(filename: string) {
  if (filename.startsWith("office-ai-")) {
    return "Office AI";
  }

  if (filename.startsWith("chatwoot-")) {
    return "CRM";
  }

  return "Oracle AI";
}

function inferDescription(filename: string, workflow: WorkflowJson) {
  const configuredDescription = sanitizeTextInput(workflow.description, { maxLength: 220, preserveNewlines: false });
  if (configuredDescription) {
    return configuredDescription;
  }

  return WORKFLOW_SUMMARIES[filename] ?? "Workflow listo para ejecutar un tramo real de automatizacion y devolver salida accionable.";
}

function inferTriggerKinds(nodes: WorkflowNode[]) {
  const kinds = new Set<string>();

  for (const node of nodes) {
    const type = typeof node.type === "string" ? node.type : "";

    if (type.includes("webhook")) {
      kinds.add("webhook");
      continue;
    }

    if (type.includes("manualTrigger")) {
      kinds.add("manual");
      continue;
    }

    if (type.includes("executeWorkflowTrigger")) {
      kinds.add("workflow");
      continue;
    }

    if (type.includes("cron") || type.includes("schedule")) {
      kinds.add("schedule");
      continue;
    }
  }

  return kinds.size > 0 ? [...kinds] : ["internal"];
}

function buildWebhookUrl(pathname: string) {
  const cleanPath = pathname.replace(/^\/+/, "");
  return `http://127.0.0.1:5678/webhook/${cleanPath}`;
}

function inferWebhooks(nodes: WorkflowNode[]) {
  const webhooks: N8nWorkflowWebhook[] = [];

  for (const node of nodes) {
    const type = typeof node.type === "string" ? node.type : "";
    if (!type.includes("webhook")) continue;

    const parameters =
      typeof node.parameters === "object" && node.parameters !== null ? (node.parameters as Record<string, unknown>) : {};
    const method = sanitizeTextInput(parameters.httpMethod, { maxLength: 12 }).toUpperCase() || "POST";
    const webhookPath = sanitizeTextInput(parameters.path, { maxLength: 160 }).replace(/^\/+/, "");
    if (!webhookPath) continue;

    webhooks.push({
      method,
      path: webhookPath,
      url: buildWebhookUrl(webhookPath),
    });
  }

  return webhooks;
}

function compareWorkflows(left: N8nWorkflowCatalogItem, right: N8nWorkflowCatalogItem) {
  if (left.group !== right.group) {
    return left.group.localeCompare(right.group);
  }

  return left.name.localeCompare(right.name);
}

export function getOfficeWebhookUrl() {
  return sanitizeWebhookUrl(process.env.N8N_OFFICE_WEBHOOK_URL) || DEFAULT_WEBHOOK_URL;
}

export async function getN8nWorkflowCatalog() {
  const entries = await fs.readdir(WORKFLOWS_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"));

  const workflows = await Promise.all(
    files.map(async (entry) => {
      const filePath = path.join(WORKFLOWS_DIR, entry.name);
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as WorkflowJson;
      const slug = entry.name.replace(/\.json$/i, "");
      const nodes = Array.isArray(parsed.nodes) ? (parsed.nodes as WorkflowNode[]) : [];

      return {
        id: slug,
        slug,
        filename: entry.name,
        group: inferGroup(slug),
        name: sanitizeTextInput(parsed.name, { maxLength: 120 }) || slug,
        description: inferDescription(slug, parsed),
        active: Boolean(parsed.active),
        nodeCount: nodes.length,
        triggerKinds: inferTriggerKinds(nodes),
        webhooks: inferWebhooks(nodes),
      } satisfies N8nWorkflowCatalogItem;
    })
  );

  return workflows.sort(compareWorkflows);
}
