# Office AI Alpha Lead Pilot

Caso de uso demo para vender el alpha sin sobreprometer.

## Problema

Entra un lead y el equipo tarda en:

- entender contexto
- decidir si hay oportunidad
- definir siguiente paso
- redactar un primer mensaje

## Promesa de la demo

Office AI toma un lead entrante, coordina discovery, estrategia y operacion, y devuelve:

- una lectura rapida de oportunidad
- riesgos visibles
- siguiente paso claro
- primer mensaje comercial

## Flujo

1. `Office AI - Intake Router`
2. `Office AI - Lead Brief Builder`
3. `Office AI - Specialist Runner`
4. `Office AI - Response Assembler`

## Comandos

1. `npm run n8n:sync:office`
2. `npm run n8n`
3. `npm run n8n:demo`

## Payload de ejemplo

```json
{
  "requestId": "alpha-demo-estudio-delta",
  "companyName": "Estudio Delta",
  "website": "https://estudiodelta.example",
  "painPoint": "responden leads a mano y pierden seguimiento durante la primera hora",
  "goal": "salir con un primer mensaje comercial y un piloto alpha apoyado en n8n",
  "channel": "linkedin",
  "requestedDeliverable": "first-message",
  "prompt": "Entro un lead de Estudio Delta. Investiga el contexto, defini la oportunidad y deja listo un primer mensaje comercial junto con el siguiente paso del piloto."
}
```

## Como venderlo

No digas "resuelve ventas solo". Deci:

"Te deja una primera respuesta coordinada, con criterio y con un piloto operativo listo para bajar a n8n."

## Que mostrar en la demo

- que ARIA recibe un input real
- que el router decide frentes
- que los workflows se encadenan sin APIs pagas
- que la salida ya parece trabajo entregable
