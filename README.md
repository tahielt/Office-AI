# Office AI: Oficina Virtual de Agentes Autónomos

Este proyecto es una interfaz visual diseñada para monitorear y gestionar cuatro agentes de inteligencia artificial en tiempo real. La estética está inspirada en los RPG clásicos (JRPG) de 16-bits, combinando un tablero visual con una terminal de comandos técnica.

## Lo que hace el proyecto

- **Tablero JRPG Interactivo**: Un mapa visual donde puedes ver a los agentes (Lyra, Apex, Vera y Zion) en sus estaciones de trabajo. Tienen animaciones de "vida" (respiración y parpadeo) y burbujas de diálogo que aparecen cuando están procesando tareas.
- **Terminal de Comandos**: Un centro de control en la parte inferior donde puedes interactuar directamente con los agentes. Los logs están diferenciados por colores: sistema (verde), pensamientos internos (gris e itálica) y comunicación directa (según el color del agente).
- **Panel de Estado Lateral**: Una barra lateral que muestra el progreso de las tareas, el uptime y el rol específico de cada agente sin necesidad de abrir menús adicionales.
- **Simulación en Vivo**: Los agentes generan tareas y logs de forma autónoma para simular un entorno de trabajo real.

## Cómo empezar

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura de archivos principal

- `src/app/page.tsx`: Layout principal que organiza el tablero, la terminal y el panel lateral.
- `src/components/ui/JRPGBoard.tsx`: El mapa visual con los agentes y sus animaciones CSS.
- `src/components/ui/Terminal.tsx`: El sistema de logs e input de comandos.
- `src/components/ui/AgentSidebar.tsx`: El panel derecho con los indicadores de progreso.
- `src/hooks/useAgents.ts`: El "cerebro" que maneja el estado de los agentes y la lógica de las respuestas.
- `src/lib/agents.ts`: Configuración inicial de los agentes y sus perfiles.

## Comandos del chat

Puedes interactuar con los agentes usando menciones o comandos globales:
- `@NombreAgente [mensaje]`: Para enviar una instrucción a un agente específico (ej: `@Apex revisa el servidor`).
- `/summon_all`: Envía una señal a todos los agentes simultáneamente.
- `/report_status`: Genera una actualización del estado actual del sistema.

## Tecnologías utilizadas

- Next.js 15
- React
- Tailwind CSS (para el diseño y animaciones pixel-art)
- Lucide Icons
- Framer Motion
- TypeScript