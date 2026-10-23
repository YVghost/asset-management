# Validación de Jenkins: ejecución real

Fecha: **23 de octubre de 2026**. Repositorio `asset-management`, rama **mateo_ortega**.

## Implementación y publicación

- Commit de código CI probado: **d1c37eb**, publicado en `origin/mateo_ortega` con autorización del usuario.
- Jenkins 2.580.1 ejecutándose en **http://localhost:8080**; job `asset-management-ci`.
- Jenkinsfile validado por el parser declarativo real, con exactamente tres etapas y checkout implícito deshabilitado.
- Java 21.0.12.1, Maven 3.9.9, Node 22.20.0 y npm 10.9.3 en la imagen Jenkins.
- PostgreSQL 17.6 aislado para CI; no se utilizó la base real de la aplicación.
- Imágenes base fijadas por digest y 71 plugins con sus dependencias fijados por versión.
- Credenciales `github-private`, `telegram-bot-token` y `telegram-chat-id` guardadas en Jenkins, no en el repositorio.

## Resultados de los builds reales

| Comprobación | Build #1 | Build #2 |
|---|---|---|
| Parámetro FORCE_FAILURE | false | true |
| Etapa 1: checkout con github-private | SUCCESS | SUCCESS |
| Etapa 2: compilación y pruebas | SUCCESS | FAILED intencionalmente después de las pruebas |
| Backend | 29 aprobadas, incluidas 21 de integración PostgreSQL | 29 aprobadas, incluidas 21 de integración PostgreSQL |
| Frontend | 17 aprobadas | 17 aprobadas |
| Total JUnit en Jenkins | 46 aprobadas, 0 omitidas | 46 aprobadas, 0 omitidas |
| Etapa 3: Telegram | SUCCESS; API confirmó envío | SUCCESS; API confirmó envío |
| Resultado final | **SUCCESS** | **FAILURE** |
| Duración total | 32,549 segundos | 28,307 segundos |

Enlaces locales:

- http://localhost:8080/job/asset-management-ci/1/
- http://localhost:8080/job/asset-management-ci/2/

El fallo de #2 proviene exclusivamente del parámetro de demostración. Las 46 pruebas pasaron; no se introdujeron errores en la aplicación. La consola confirma que el envío correcto de Telegram conserva el FAILURE anterior. Para una nueva ejecución exitosa, desmarcar FORCE_FAILURE.

Además se ejecutaron y aprobaron las 7 pruebas de los scripts auxiliares de reportes y Telegram. Las compilaciones Maven y TypeScript/Vite generaron el JAR ejecutable y los archivos dist. Jenkins archivó ambos, junto con los logs. Vite emitió una advertencia informativa por tamaño del bundle; no impidió compilar.

## Evidencias e informe

- Informe editable: [INFORME_JENKINS_MATEO_ORTEGA.docx](../docs/INFORME_JENKINS_MATEO_ORTEGA.docx), cuatro páginas comprobadas con Word.
- [Carpeta de evidencias](../docs/evidencias-jenkins/): seis capturas reales del navegador, consolas de ambos builds, resultados y metadatos JSON.
- El Word contiene cuatro capturas incrustadas y dos espacios para que el usuario agregue las fotos de las notificaciones de Telegram.
- Las capturas fueron tomadas en Chrome contra el Jenkins local autenticado. No son maquetas.
- El DOCX se verificó como paquete válido; las capturas principales se inspeccionaron visualmente.

## Alcance y pendiente

GitHub confirmó que el repositorio seguía **público** al recoger estas evidencias. Se usó la credencial de Jenkins y el checkout funcionó, pero no se afirma haber probado el clon de un repositorio privado. La guía explica cómo cambiar su visibilidad y repetir el build después.

Las notificaciones SUCCESS y FAILURE fueron confirmadas por la API real de Telegram durante los builds #1 y #2. El usuario agregará las fotografías de su aplicación Telegram al Word.

## Repetir las pruebas

Desde Jenkins: `asset-management-ci` → Build with Parameters → FORCE_FAILURE=false para éxito o true para fallo controlado.

Para comprobar solo la copia local, desde PowerShell:

```powershell
$taskSource = (Get-Location).Path + ':/source:ro'
docker compose -f docker-compose.jenkins.yml run --rm --no-deps --volume $taskSource --entrypoint bash jenkins /source/ci/verify-worktree.sh
```

No ejecutar esa comprobación simultáneamente con otro build que esté usando la base CI. Para iniciar Jenkins: `docker compose -f docker-compose.jenkins.yml up -d`. No usar `down -v` si se desea conservar cuentas, credenciales, jobs e historial.
