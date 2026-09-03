# ZENF Agenda Online

Frontend estático para el agendamiento odontológico de ZENF.

## Arquitectura

- **Frontend:** archivos estáticos en `public/`.
- **Backend:** una única instancia Railway (`dentalink-mcp`) que conserva MCP en modo de solo lectura y expone `/api/agenda/*`.
- **Dentalink:** el token existe únicamente como variable de entorno en Railway.

## Reglas de seguridad

1. Nunca guardar tokens, API keys ni credenciales de Dentalink en este repositorio.
2. El navegador nunca llama directamente a `api.dentalink.healthatom.com`.
3. No crear proxies genéricos hacia Dentalink.
4. La única escritura permitida es la reserva controlada de citas a través de `POST /api/agenda/reservar`.
5. La escritura puede deshabilitarse en Railway con `AGENDA_WRITE_ENABLED=false`.
6. Antes de reservar, el backend vuelve a consultar disponibilidad y busca al paciente por RUT.

## Archivos

- `public/index.html`: interfaz.
- `public/styles.css`: estilos.
- `public/app.js`: cliente de la API de agenda.
- `public/_headers`: cabeceras de seguridad para hosts compatibles.

No se requieren dependencias ni secretos para construir el frontend.
