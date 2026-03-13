# Office AI

Frontend y backend de la oficina de agentes. Este repositorio queda listo para subir a GitHub y desplegar la app sin exponer la infraestructura privada de `n8n`.

## Que contiene este repo

- UI Next.js con tablero, sidebar y terminal.
- Orquestador local en `src/app/api/orchestrator/route.ts`.
- Modo `Agents Team`: ARIA funciona como secretaria y cerebro principal.
- Agentes especialistas con squads internos:
  - `SCOUT`: research web.
  - `APEX`: ingenieria y repo.
  - `VERA`: analitica.
  - `ZION`: estrategia.
  - `FORGE`: automatizacion.
  - `ECHO`: comunicaciones.
  - `VOX`: contenido.

## Arquitectura

1. El usuario habla con `ARIA` desde la UI.
2. `ARIA` clasifica la intencion y delega al especialista.
3. Cada especialista trabaja con su propio squad interno.
4. `SCOUT` hace investiga web, `APEX` usa contexto del repo, `FORGE` prepara la automatizacion.
5. La respuesta vuelve a la terminal con pasos por agente y trazabilidad.

## Stack local

- Next.js 16
- React 19
- TypeScript
- AI SDK 6
- Ollama para modelos locales

## Arranque local

1. Instalar dependencias:

```bash
npm install
```

2. Levantar Ollama y asegurarte de tener el modelo:

```bash
ollama pull qwen2.5:7b
```

3. Iniciar desarrollo:

```bash
npm run dev
```

4. Abrir:

```text
http://127.0.0.1:3000
```

## Comandos utiles en la app

- `hola`
- `/team_mode`
- `@aria decile a @scout que investigue ...`
- `@aria pedile a @apex que revise ...`
- `/summon_all`
- `/dismiss`


