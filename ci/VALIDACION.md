# Validación local de Jenkins

Fecha: **23 de octubre de 2026**. Repositorio `asset-management`, rama `mateo_ortega`.

## Ejecutado y confirmado

| Comprobación | Resultado real |
|---|---|
| Docker Desktop / motor Linux | Iniciado y disponible |
| Compose independiente | `docker compose -f docker-compose.jenkins.yml config --quiet` válido |
| Imagen Jenkins | Construida, Jenkins 2.580.1, usuario final `jenkins` |
| Versiones de herramientas en la imagen | Java 21.0.12.1, Maven 3.9.9, Node 22.20.0, npm 10.9.3 |
| Plugins | 71 incluidos con dependencias, versiones exactas en plugins.txt |
| Imágenes base Jenkins/Maven/Node | Fijadas por digest SHA-256 |
| Jenkins local | Contenedor iniciado en 127.0.0.1:8080 |
| PostgreSQL CI | 17.6-alpine, aislado, sin puerto público ni volumen de producción |
| Jenkinsfile | Validado por `/pipeline-model-converter/validate`: `Jenkinsfile successfully validated.` |
| Etapas declaradas | Exactamente 3, con checkout automático deshabilitado |
| Job | `asset-management-ci` creado con sandbox y parámetro FORCE_FAILURE; sin ejecuciones |
| Scripts auxiliares | 7 pruebas unitarias aprobadas |
| Backend real | `mvn -B -ntp clean verify` aprobado; 29 pruebas, 0 fallos, 0 omitidas |
| Integración real PostgreSQL | 21 pruebas incluidas en las 29 del backend, 0 omitidas |
| Frontend real | `npm ci`, 17 pruebas Vitest aprobadas con JUnit y `npm run build` aprobado |
| Comprobador de reportes | Backend, integración y frontend aceptados; omisiones/fallos/reportes ausentes rechazados en sus pruebas |
| Higiene Git | Cambios en mateo_ortega; sin commits, push ni modificaciones de main |

La compilación y pruebas se ejecutaron dentro de la imagen Jenkins, con las mismas herramientas, variables y PostgreSQL de CI, usando una copia temporal del repositorio montado en solo lectura. Esto **no equivale a una ejecución completa del job** ni a probar credenciales privadas de GitHub. No se modificaron archivos de negocio ni inventarios existentes.

El frontend produjo una advertencia informativa de bundle superior a 500 kB. La compilación terminó correctamente; no se cambió la aplicación para ocultarla.

## Pendiente de configuración del usuario

- Completar el asistente inicial y elegir administrador de Jenkins.
- Completado posteriormente: credencial Username with password **github-private** registrada mediante la API autenticada de Jenkins; GitHub confirmó acceso a la rama mateo_ortega. El acceso con el repositorio privado sigue pendiente de cambiar su visibilidad.
- Completado posteriormente: bot verificado y credenciales Secret text **telegram-bot-token** y **telegram-chat-id** registradas en Jenkins. Telegram confirmó un mensaje real de prueba enviado desde Jenkins.
- Revisar, crear tú el commit y publicar los nuevos archivos en **mateo_ortega**. No se publicó código automáticamente.
- Cambiar el repositorio a privado cuando corresponda y comprobar un checkout autenticado desde Jenkins.
- Ejecutar el job con FORCE_FAILURE=false y luego con FORCE_FAILURE=true.
- Confirmar los dos mensajes **reales** en Telegram y guardar las evidencias indicadas en GUIA_ENTREGA_JENKINS.md.

Actualización: se confirmó la entrega de un mensaje real de configuración desde Jenkins al chat privado del usuario. Ese mensaje no representa un build. Continúan pendientes las ejecuciones completas SUCCESS/FAILURE del job y sus respectivos mensajes. Las pruebas del helper verifican ambos textos de resultado con respuestas simuladas. El acceso con el repositorio privado requiere cambiar su visibilidad y ejecutar el checkout autenticado.

## Repetir la comprobación aislada de la copia local

En PowerShell, desde la raíz del proyecto, con Docker y Jenkins iniciados:

```powershell
$taskSource = (Get-Location).Path + ':/source:ro'
docker compose -f docker-compose.jenkins.yml run --rm --no-deps --volume $taskSource --entrypoint bash jenkins /source/ci/verify-worktree.sh
```

El script copia únicamente el código necesario a `/tmp`, excluye `.git`, `.env`, cachés y resultados previos, y prueba contra la base **CI**. No elimina ni sobrescribe código local. No ejecutes esta comprobación simultáneamente con un build Jenkins que esté usando la base CI.
