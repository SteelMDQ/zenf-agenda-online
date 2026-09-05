# ZENF Agenda Online — Arquitectura de privacidad

Fecha base: 2026-09-05

## Objetivo

Mantener una separación estricta entre la reserva clínica y el marketing, aplicando minimización de datos desde el diseño.

## Reglas invariables

- Nunca enviar a plataformas publicitarias RUT, nombre, apellidos, teléfono, correo, diagnóstico, tratamiento, profesional elegido ni contenido de ficha clínica.
- No transportar datos clínicos o identificadores personales en parámetros de URL.
- `utm_term` no se conserva en la agenda.
- La agenda usa `referrer=no-referrer` para evitar fuga de parámetros al navegar fuera de la página.
- La atribución de campaña se guarda solo en `sessionStorage` y se elimina después de una reserva confirmada.
- Los eventos de conversión son locales de primera parte; `tracking.js` no realiza solicitudes de red a Meta, Google u otros terceros.
- La confirmación `zenf_booking_complete` solo se genera cuando la UI recibió éxito real de la reserva.

## Eventos locales permitidos

- `zenf_agenda_open`
- `zenf_booking_start`
- `zenf_slot_selected`
- `zenf_booking_complete`

Ningún evento incorpora información del paciente, profesional, especialidad, sucursal, fecha, hora, diagnóstico o tratamiento.

## Atribución permitida

Solo se aceptan estos parámetros técnicos de campaña:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`

Convención recomendada: usar códigos neutrales, por ejemplo `utm_campaign=zenf_acq_01`, evitando nombres que describan condiciones de salud o tratamientos.

## Parámetros eliminados de la URL

`tracking.js` elimina, antes de que `app.js` procese la página, parámetros como:

- `motivo`
- `rut`
- `nombre`
- `apellidos`
- `email` / `correo`
- `telefono` / `phone`
- `diagnostico`
- `tratamiento`
- `procedimiento`
- `paciente`
- `utm_term`

## Integraciones futuras

Cualquier integración futura de analítica o publicidad debe pasar revisión de privacidad antes de activarse. En particular, no se debe agregar un píxel o gestor de etiquetas a la agenda clínica sin validar previamente qué identificadores, cookies y datos transmite.

## Marco normativo

La implementación se diseña para cumplir la normativa chilena vigente y anticipar el régimen reforzado que entra en vigencia el 1 de diciembre de 2026. La política pública debe revisarse nuevamente ante cambios de procesos, proveedores o normativa.
