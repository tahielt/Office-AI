# Office AI

Office AI es una app Next.js para una oficina multiagente liderada por ARIA. La interfaz permite hablarle a ARIA como punto único de entrada; ella decide si responde directo o si deriva el pedido a especialistas y subagentes.

## Features

- Orquestación jerárquica con ARIA como coordinadora principal.
- Especialistas por dominio para research, ingeniería, estrategia, automatización, análisis, comunicación y contenido.
- Cola persistente con workers para desacoplar la ejecución del request HTTP.
- Handoff limpio hacia `n8n` como capa de ejecución externa.
- UI en tiempo real con trazas de agentes, handoffs y subagentes.

## Stack

- Next.js
- React
- TypeScript
- AI SDK

## Desarrollo

```bash
npm install
npm run dev
```

Para ejecutar la cola persistente en segundo plano:

```bash
npm run worker
```

## Scripts

```bash
npm run lint
npm run typecheck
```
