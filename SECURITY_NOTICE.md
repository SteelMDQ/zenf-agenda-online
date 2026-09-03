# Seguridad de la integración Dentalink

El frontend de ZENF no debe contener credenciales de Dentalink ni otros secretos.

Toda comunicación autenticada con Dentalink debe realizarse exclusivamente desde el backend desplegado en Railway. El navegador solo puede consumir los endpoints públicos y limitados de agenda publicados por dicho backend.

Si una credencial aparece alguna vez en un archivo público o en el historial Git, debe considerarse comprometida y rotarse en Dentalink; eliminarla del archivo actual no invalida copias históricas.
