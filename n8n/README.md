# n8n local del repo

Este repo guarda su instancia local de `n8n` en:

- `n8n/.n8n/.n8n/database.sqlite` para la base que hoy usa `npm run n8n`
- `n8n/workflows` para los workflows versionados
- `n8n/blueprints` para diseño y contratos

Comandos:

- `npm run n8n:import` importa los workflows versionados a la instancia local del repo
- `npm run n8n` levanta `n8n` usando la misma instancia local
- `npm run n8n:where` te muestra rápido dónde están los JSON y cuál es la base local

Si corrés `npx n8n` a secas, `n8n` usará su carpeta por defecto del usuario y puede que no veas estos workflows.
