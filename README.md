# Office AI

**Una oficina virtual donde un equipo de agentes de IA recibe pedidos en lenguaje natural, decide quién los resuelve y trabaja en paralelo** — con streaming en vivo, memoria de conversación y modelos locales o cloud.

Office AI es un orquestador de agentes de IA con una interfaz estilo JRPG. En vez de un único chatbot, hay un equipo: **ARIA**, la secretaria y cerebro central, recibe cada pedido, lo clasifica y decide si lo responde ella misma o lo deriva a uno o varios especialistas. Cada agente ejecuta su parte, ARIA consolida el resultado, y todo queda registrado.

Es un proyecto personal construido para explorar a fondo cómo se diseña un sistema multi-agente real: routing, streaming, persistencia y observabilidad.

## Por qué es interesante

No es un wrapper de ChatGPT. Las piezas que lo hacen distinto:

- **Streaming token a token (SSE).** La respuesta de cada agente cae en vivo en la terminal, con el conteo de tokens en tiempo real. La orquestación es un generador async de eventos, así que el endpoint puede servirla como stream o como JSON con la misma lógica.
- **Multi-proveedor con local primero.** Corre con modelos locales vía Ollama y cae automáticamente a OpenAI, Groq o Gemini si hay API key. Un badge por agente muestra qué motor respondió (`OLLAMA` / `OPENAI` / `STUB`), así nunca confundís una respuesta real con un fallback.
- **Routing con salida estructurada garantizada.** ARIA no "pide JSON por favor": usa JSON Schema aplicado de forma nativa (el `format` de Ollama y `generateObject` del AI SDK), lo que hace que hasta un modelo de 3B decida el routing de forma confiable.
- **Memoria de conversación.** Cada turno se persiste en SQLite (`node:sqlite`) por sesión y se reinyecta el contexto reciente, así ARIA recuerda de qué venían hablando.
- **Investigación web real.** El agente de research no se queda con el snippet del buscador: abre las páginas top y lee el contenido para sintetizar sobre material real.
- **Observabilidad.** Cada ejecución ("run") se guarda en disco con su traza completa: qué agentes participaron, qué proveedor usó cada uno, cuánto tardaron.

## El equipo

| Agente | Rol |
|---|---|
| **ARIA** | Secretaria y router central — clasifica, delega y consolida |
| **SCOUT** | Investigación web |
| **APEX** | Ingeniería y análisis del repo |
| **VERA** | Análisis y métricas |
| **ZION** | Estrategia |
| **FORGE** | Automatización (n8n, webhooks, Docker) |
| **ECHO** | Comunicaciones |
| **VOX** | Contenido |

Cuando el modo **Agents Team** está activo, cada agente principal trabaja además con un squad interno de subroles para descomponer la tarea.

## Cómo funciona

```
Usuario ─▶ ARIA (planner)
              │  decide: responder directo o delegar (máx. 3)
              ▼
        ┌─────┴─────┬───────────┐
      SCOUT       APEX        ZION      ← corren en paralelo, streameando
        └─────┬─────┴───────────┘
              ▼
            ARIA (consolida y cierra)  ← devuelve un resultado trazable
```

El endpoint `POST /api/orchestrator` es un coordinador delgado. Toda la lógica vive en módulos bajo `src/lib/orchestrator/`:

| Módulo | Responsabilidad |
|---|---|
| `runner.ts` | Orquestación como generador de eventos (fuente única para SSE y JSON) |
| `planner.ts` | Decisión de routing de ARIA con salida estructurada |
| `providers.ts` | Generación multi-proveedor: Ollama nativo + AI SDK, con streaming y usage |
| `agents.ts` | Motor de ejecución: leads, subagentes, research, ingeniería |
| `search.ts` | Investigación web con lectura de páginas |
| `memory.ts` | Memoria de sesión en SQLite |
| `persistence.ts` | Registro y observabilidad de cada run |
| `structured-output.ts` | Construcción de la salida estructurada de cada agente |
| `routing.ts` · `config.ts` · `text.ts` · `types.ts` | Reglas, configuración por entorno, utilidades y tipos |

## Stack

Next.js 16 · React 19 · TypeScript · AI SDK · Ollama · `node:sqlite` · Three.js / React Three Fiber · Framer Motion

## Arranque local

Requiere **Node 22.5+** (para `node:sqlite`) y [Ollama](https://ollama.com) instalado.

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local

# 3. Modelos locales (Ollama)
ollama serve
ollama pull qwen2.5:7b      # especialistas
ollama pull llama3.2:3b     # router / ARIA

# 4. Desarrollo
npm run dev
```

Abrir <http://localhost:3000>.

Sin `.env.local`, el sistema arranca en modo `auto`: intenta Ollama y, si no encuentra modelos ni API keys, responde con respuestas de muestra (stub) para que la interfaz funcione igual. Para usar proveedores cloud en lugar de Ollama, agregá tu `OPENAI_API_KEY`, `GROQ_API_KEY` o `GEMINI_API_KEY` en `.env.local`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run dev:sqlite` | Desarrollo con `--experimental-sqlite` (Node < 22.5) |
| `npm run check` | Typecheck + lint |
| `npm run build` | Build de producción |

## Comandos en la app

| Comando | Acción |
|---|---|
| `hola` | ARIA responde directo |
| Un pedido en lenguaje natural | ARIA clasifica y deriva sola |
| `@aria decile a @scout que investigue <tema>` | Delegación explícita |
| `@aria pedile a @apex que revise <archivo>` | Diagnóstico del repo |
| `/team_mode` | Activa/desactiva los squads internos |
| `/summon_all` · `/dismiss` | Convoca / libera a todos los agentes |

## Configuración

Todo se ajusta por variables de entorno (ver `.env.example`): proveedor de IA, modelos por agente, timeouts y límites de tokens (con defaults pensados para correr local en CPU), cantidad de turnos de memoria, modo de síntesis del research y profundidad de lectura web.

## Estado del proyecto

Proyecto personal y en evolución. El núcleo —orquestación, streaming, memoria y multi-proveedor— está completo y el build pasa typecheck y lint. Ideas que quedan en el horizonte: memoria semántica con embeddings, tool calling para que los agentes ejecuten acciones (no solo respondan), y un buscador local en vez de scraping.

---

Hecho por [Tahiel Tironi van den Muysenberg](https://github.com/tahielt).
