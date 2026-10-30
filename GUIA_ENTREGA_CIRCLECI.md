# Entrega: migración de Jenkins a CircleCI

## Archivos entregables

- `.circleci/config.yml`: cuatro jobs, dos workflows, cachés, pruebas, artefactos y Telegram.
- `docs/INFORME_JENKINS_CIRCLECI_MATEO_ORTEGA.docx`: informe editable.
- `docs/INFORME_JENKINS_CIRCLECI.md`: fuente del informe.
- `ci/check_circle_reports.py`: validación modular sin pruebas omitidas.

## Activar en CircleCI

1. Publicar estos cambios en la rama que se evaluará. En CircleCI, conectar GitHub con acceso al repositorio `YVghost/asset-management` y crear el proyecto usando su configuración existente `.circleci/config.yml`.
2. En Project Settings → Environment Variables, registrar `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`. Usar los mismos valores que Jenkins; no copiarlos a YAML, commits ni capturas. El destinatario debe haber iniciado el bot o autorizado su acceso al grupo.
3. Ejecutar un pipeline sobre esa rama con `scope=full` y `force-failure=false`. En la interfaz que permita parámetros, agregar esos valores; si la integración no muestra el formulario, usar la API de disparo correspondiente al tipo de conexión GitHub del proyecto. Los commits normales usan esos valores por defecto.
4. Verificar backend, frontend y helpers en paralelo; después debe ejecutarse `notify-success`. Abrir Tests y Artifacts de los jobs. Guardar la notificación de éxito de Telegram.
5. Repetir el mismo commit con `force-failure=true`: backend y frontend deben fallar después de las pruebas, enviar avisos FAILURE y bloquear `notify-success`. Las pruebas reales deben seguir pasando. Puede haber dos avisos porque el fallo se informa por job.
6. Repetir con `scope=backend` y luego `scope=frontend`, siempre con `force-failure=false`. `helpers` se ejecuta en ambos casos; la dependencia filtrada se ignora y la notificación SUCCESS corresponde al alcance seleccionado, no a toda la aplicación.
7. Ejecutar nuevamente `scope=full`, `force-failure=false` para dejar el último resultado exitoso.

No se necesita un token de API de CircleCI dentro del pipeline ni acceso a la base de producción. PostgreSQL usa credenciales públicas exclusivas de un contenedor efímero de pruebas. La selección es por parámetro, no detecta rutas modificadas automáticamente.

## Evidencias necesarias para cerrar la comparación de ejecución

Guardar en `docs/evidencias-circleci/` capturas reales del grafo de ambos workflows, Tests, Artifacts, restore/save cache, avisos Telegram y fallo controlado. Registrar URL, commit, rama, ejecutor, estado, fecha, tiempo de cola y duración de cada job.

Hacer al menos tres ejecuciones completas con caché fría y tres con caché caliente sobre el mismo commit; invalidar caché cambiando el prefijo `v1` de ambas claves para cada ensayo frío y repetir sin cambiarlo para el caliente. Registrar y explicar ese cambio de configuración. Comparar medianas con ejecuciones nuevas de Jenkins sobre el mismo código. Los builds históricos #1 y #2 no bastan para medir el efecto de la caché o una mejora actual.

La configuración pasó el parser YAML y la validación oficial con CircleCI CLI 1.12.0; también se compilaron los tres valores de scope. La ejecución alojada sigue pendiente. Para repetir la validación, usar `circleci config validate .circleci/config.yml` en un entorno con CLI y acceso a CircleCI antes de entregar evidencia definitiva.

## Notificaciones: alcance y límites

`FAILURE` se envía desde cada job que falla; `SUCCESS` desde el job final dependiente de los jobs seleccionados. El mensaje incluye job, rama, build y enlace. Un error de Telegram hace fallar su paso y no convierte una falla anterior en éxito. No se garantizan avisos si falla el checkout (el script está en el repositorio), se cancela manualmente el workflow o el ejecutor no inicia. Para esos casos usar notificaciones de la plataforma o un webhook externo independiente.

## Validación local

Desde la raíz: `python -m unittest discover -s ci/tests -v`.
Frontend: `cd frontend`, `npm ci`, `npm test -- --reporter=default --reporter=junit --outputFile=reports/vitest.xml`, `npm run build`.
Backend: Java 21, Maven y PostgreSQL de pruebas; exportar `AMS_TEST_DATABASE_URL`, `AMS_TEST_DATABASE_USER` y `AMS_TEST_DATABASE_PASSWORD`; ejecutar `mvn -B -ntp clean verify` y `python ci/check_circle_reports.py backend`.
No usar una base existente de negocio: las pruebas crean y modifican datos.

## Regenerar el informe Word

Instalar `python-docx` en un entorno de herramientas y ejecutar `python ci/generate_circleci_report.py` desde la raíz. El texto fuente es `docs/INFORME_JENKINS_CIRCLECI.md`; el generador inserta las tablas y tres capturas históricas existentes de Jenkins.
