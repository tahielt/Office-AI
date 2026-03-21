# n8n local del repo

Este repo guarda su instancia local de `n8n` en:

- `n8n/.n8n/database.sqlite` para la base activa que hoy usa `npm run n8n`
- `n8n/.n8n/.n8n/database.sqlite` como copia legacy que seguimos sincronizando por compatibilidad
- `n8n/workflows` para los workflows versionados
- `n8n/blueprints` para diseño y contratos

Comandos:

- `npm run n8n:import` importa los workflows versionados a la instancia local del repo como copias nuevas
- `npm run n8n` levanta `n8n` usando la misma instancia local
- `npm run n8n:where` te muestra rápido dónde están los JSON y cuál es la base local
- `npm run n8n:sync:office` regenera, reinyecta y deja una sola copia activa por cada uno de los 4 workflows de Office AI
- `npm run n8n:sync:oracle` regenera y reactiva los 8 workflows de Oracle AI contra la base local del repo
- `npm run n8n:sync:crm` regenera y reactiva el bridge real de Chatwoot + WhatsApp + Telegram
- `npm run n8n:demo` imprime el payload y el comando para correr la demo alpha de lead intake

Tip:

- Si corriste `npm run n8n:import` varias veces y te quedaron duplicados activos, `npm run n8n:sync:office` los desactiva y deja una sola copia viva por workflow.
- Office AI y Oracle AI hoy dependen del orquestador vivo de la app en `http://127.0.0.1:3000` y de un proveedor real de IA disponible.
- El bridge CRM ya no devuelve mocks: si faltan `CHATWOOT_*`, `WHATSAPP_*` o `TELEGRAM_*`, responde un error de configuración explícito.
- `npm run n8n` ahora habilita acceso a variables de entorno dentro de nodos para que los workflows reales puedan leer esas credenciales.

Si corrés `npx n8n` a secas, `n8n` usará su carpeta por defecto del usuario y puede que no veas estos workflows.
