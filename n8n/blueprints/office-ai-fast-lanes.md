# Office AI Fast Lanes

Arquitectura propuesta para bajar latencia en `n8n` separando el flujo en piezas cortas y reusables.

## 1. intake-router

- Trigger: webhook o request interno desde ARIA.
- Trabajo: normaliza prompt, genera `requestId`, detecta hasta 2 team leads y decide si la respuesta va por modo `rapid` o `deep`.
- Salida: payload chico con `requestId`, `task`, `teamMode`, `leadAgents[]`, `responseMode`.

## 2. lead-brief-builder

- Trigger: `Execute Workflow` desde `intake-router`.
- Trabajo: arma un brief mínimo por lead con contexto útil y timeout corto.
- Regla: nunca adjuntar repo completo ni contexto web completo; solo extractos o links.
- Salida: un item por lead.

## 3. specialist-runner

- Trigger: un workflow por cada lead.
- Trabajo: dispara el squad interno del lead en paralelo.
- Regla: cada subagente responde en formato corto para que el consolidado no espere textos largos.
- Salida: resumen del lead, hallazgos, riesgos, próximos pasos.

## 4. response-assembler

- Trigger: espera resultados de ambos leads.
- Trabajo: deduplica, ordena por prioridad y genera un cierre compacto para ARIA.
- Regla: si solo respondió un lead, no bloquear el cierre completo.
- Salida: `ariaSummary`, `steps[]`, `latencyMs`, `sources[]`.

## 5. execution-logger

- Trigger: fire-and-forget desde cada etapa.
- Trabajo: guarda tiempos, fallos, handoffs y retries.
- Regla: no participar en la ruta crítica de respuesta.

## Contratos

Ver [n8n/blueprints/office-ai-workflow-contracts.json](/C:/Users/mocha/Documents/VDM%202026/Office-AI/n8n/blueprints/office-ai-workflow-contracts.json).
