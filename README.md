# Office AI
# Que contiene este repositorio

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

 Arquitectura

1. El usuario habla con `ARIA` desde la UI.
2. `ARIA` clasifica la intencion y delega al especialista.
3. Cada especialista trabaja con su propio squad interno.
4. `SCOUT` hace investiga web, `APEX` usa contexto del repo, `FORGE` prepara la automatizacion.
5. La respuesta vuelve a la terminal con pasos por agente y trazabilidad.

 Stack local

- Next.js 
- React 
- TypeScript
- AI SDK 6
- Ollama para modelos locales

 Arranque local

1. Instalar dependencias:
2. Levantar Ollama
3. Iniciar desarrollo
4. Abrir:

 Comandos utiles en la app

- `hola`
- `/team_mode`
- `@aria decile a @scout que investigue ...`
- `@aria pedile a @apex que revise ...`
- `/summon_all`
- `/dismiss`


