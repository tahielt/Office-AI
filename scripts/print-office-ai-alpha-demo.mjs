import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const workflowFiles = [
  "office-ai-intake-router.json",
  "office-ai-lead-brief-builder.json",
  "office-ai-specialist-runner.json",
  "office-ai-response-assembler.json",
];

const payload = {
  requestId: "alpha-demo-estudio-delta",
  companyName: "Estudio Delta",
  website: "https://estudiodelta.example",
  painPoint: "responden leads a mano y pierden seguimiento durante la primera hora",
  goal: "salir con un primer mensaje comercial y un piloto alpha apoyado en n8n",
  channel: "linkedin",
  requestedDeliverable: "first-message",
  prompt:
    "Entro un lead de Estudio Delta. Investiga el contexto, defini la oportunidad y deja listo un primer mensaje comercial junto con el siguiente paso del piloto.",
};

const payloadString = JSON.stringify(payload);
const prettyPayload = JSON.stringify(payload, null, 2);
const workflowDir = path.join(repoRoot, "n8n", "workflows");
const foundWorkflows = workflowFiles.filter((fileName) => fs.existsSync(path.join(workflowDir, fileName)));

const steps = [
  "1. npm run n8n:sync:office",
  "2. npm run n8n",
  "3. Ejecutar el webhook con el payload de abajo",
  "4. Mostrar la salida como demo de lead intake -> coordinacion -> primer mensaje",
];

const powershellCommand = [
  "Invoke-RestMethod",
  "-Method Post",
  "-Uri http://127.0.0.1:5678/webhook/office-ai/intake",
  "-ContentType 'application/json'",
  `-Body '${payloadString.replace(/'/g, "''")}'`,
].join(" ");

console.log("Office AI Alpha Demo");
console.log("====================");
console.log("");
console.log(`Workflows listos en repo: ${foundWorkflows.length}/${workflowFiles.length}`);
workflowFiles.forEach((fileName) => {
  const status = foundWorkflows.includes(fileName) ? "OK" : "MISSING";
  console.log(`- ${status} ${fileName}`);
});
console.log("");
steps.forEach((step) => console.log(step));
console.log("");
console.log("PowerShell:");
console.log(powershellCommand);
console.log("");
console.log("Payload:");
console.log(prettyPayload);
