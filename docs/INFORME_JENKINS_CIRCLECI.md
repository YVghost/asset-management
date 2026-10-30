# Informe comparativo: Jenkins y CircleCI

**Proyecto:** AMS — Sistema de gestión de activos empresariales  
**Autor:** Mateo Ortega  
**Fecha de revisión:** 29 de octubre de 2026  
**Estado:** migración implementada y pruebas locales aprobadas; ejecución alojada de CircleCI pendiente.

## 1. Objetivo y alcance

Migrar el pipeline de Jenkins de un proyecto funcional a CircleCI, distribuirlo en varios jobs y workflows, configurar avisos para éxito y fallo, y comparar caché, paralelismo, ejecución selectiva, modularidad y tiempos. AMS gestiona inventario de hardware y activos digitales, empleados, asignaciones, transferencias, devoluciones, auditoría, códigos QR y organizaciones independientes. Cumple el requisito de ser una aplicación funcional diferente de una calculadora.

Se revisaron la arquitectura del repositorio, dependencias, configuración de compilación, pruebas automatizadas, scripts CI, Jenkinsfile y evidencias históricas. La revisión se orienta a la migración y reproducibilidad; no constituye una auditoría exhaustiva de seguridad ni una certificación de cada función de negocio.

## 2. Código y pruebas revisadas

El backend usa Java 21, Spring Boot 4.1.1, Maven, Spring Security, JPA, JDBC, Flyway y PostgreSQL. Los módulos principales son asset, assignment, identity, organization, audit, dashboard y shared. El frontend usa React 19, TypeScript y Vite; su compilación verifica tipos antes de generar los archivos de distribución.

Las pruebas backend cubren vida útil, estabilidad de identificadores del seed, ocultación de contraseñas en representaciones de objetos y contraste de marca. Las 21 pruebas de integración comprueban persistencia, aislamiento entre organizaciones, roles, CSRF, asignaciones concurrentes, transferencias, catálogos, códigos QR y restricciones de base de datos. Las cinco suites frontend cubren navegación, formulario de acceso, validación de activos, origen de QR y marca.

Hallazgo relevante: InventoryIntegrationTest puede omitirse si no hay PostgreSQL configurado ni Docker. Para evitar falsos positivos, CircleCI establece explícitamente AMS_TEST_DATABASE_URL y comprueba que exista el reporte de integración, que haya casos ejecutados y que no existan fallos ni omisiones. Se reutilizan las reglas de ci/check_reports.py mediante ci/check_circle_reports.py.

Existen pruebas E2E de Playwright en el repositorio, pero el Jenkinsfile actual no las ejecuta. Esta migración conserva ese alcance: pruebas Maven y Vitest, compilación y artefactos. No se afirma haber ejecutado E2E ni alcanzado un porcentaje de cobertura.

## 3. Pipeline original de Jenkins

Jenkinsfile define tres etapas: checkout de la rama mateo_ortega, compilación y pruebas, y notificación Telegram. Usa credenciales de Jenkins y ci/build.sh. Backend y frontend se ejecutan secuencialmente; ambos se intentan aunque uno falle. Publica reportes JUnit, JAR, frontend/dist y logs. FORCE_FAILURE permite demostrar un fallo después de las pruebas reales.

La instalación anterior tiene Java 21, Maven 3.9.9, Node 22 y una base PostgreSQL exclusiva de CI. No se usa la base de negocio. Las evidencias históricas pertenecen al commit d1c37eb y al 23 de octubre de 2026. El repositorio fue registrado como público; el uso de una credencial no demuestra por sí mismo checkout privado.

## 4. Migración implementada en CircleCI

El archivo .circleci/config.yml usa versión 2.1. Los jobs backend, frontend y helpers pueden comenzar simultáneamente. notify-success depende de los resultados satisfactorios de las comprobaciones seleccionadas.

| Job | Entorno y responsabilidad | Salida |
| --- | --- | --- |
| backend | cimg/openjdk:21.0 y PostgreSQL 17.6; mvn clean verify y validación de JUnit | 29 pruebas previstas, reporte de integración y JAR |
| frontend | cimg/node:22.20; npm ci, Vitest, TypeScript y Vite | JUnit y frontend/dist |
| helpers | cimg/python:3.11; pruebas de reportes y Telegram con mocks | 10 comprobaciones auxiliares |
| notify-success | Python; requiere éxito de los jobs seleccionados | Mensaje SUCCESS en Telegram |

El workflow full-validation ejecuta todos los componentes. selective-validation usa scope=backend o scope=frontend para ejecutar únicamente ese componente y helpers. Los commits normales usan scope=full. No hay detección automática de cambios por rutas. La selección parcial no reemplaza la validación completa previa a integrar código.

La migración usa checkout del commit disparado por CircleCI, en lugar de forzar siempre la rama fija de Jenkins. Las dos configuraciones permanecen disponibles para permitir la comparación. No se agregó despliegue porque el pipeline original no lo realiza.

## 5. Notificaciones y estados

Se reutiliza ci/notify_telegram.py sin incluir secretos en el código. TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID se registran como variables del proyecto CircleCI. El mensaje incluye job, build, rama, resultado y enlace. Los tests del emisor usan respuestas simuladas; no envían mensajes.

| Situación | Comportamiento configurado |
| --- | --- |
| Todos los jobs seleccionados terminan bien | notify-success envía SUCCESS |
| Un job de validación falla | Su paso on_fail envía FAILURE; el aviso de éxito queda bloqueado |
| force-failure=true | Backend y/o frontend fallan después de las pruebas y notifican FAILURE |
| Telegram rechaza el envío | El paso devuelve error y el job falla |
| Cancelación, fallo de checkout o ejecutor sin iniciar | No se garantiza aviso mediante el script; requiere mecanismo externo |

Los avisos FAILURE son por job; dos jobs fallidos pueden producir dos mensajes. El éxito de una ejecución selectiva se refiere al alcance seleccionado. El fallo de Telegram no elimina un error de compilación anterior. Las notificaciones CircleCI todavía deben verificarse con un envío real al activar el proyecto.

## 6. Comparación técnica

| Criterio | Jenkins actual | CircleCI propuesto | Interpretación |
| --- | --- | --- | --- |
| Caché | Maven y npm pueden reutilizar directorios del agente persistente; npm ci reinstala node_modules | restore_cache/save_cache explícitos: repositorio Maven por checksum de pom.xml y caché npm por package-lock.json | Invalida por manifiesto; el primer acceso será frío. No se cachea node_modules ni se habilita Docker layer caching |
| Paralelismo | Backend y frontend secuenciales en ci/build.sh; builds concurrentes deshabilitados | Backend, frontend y helpers independientes, sujetos a la concurrencia disponible en la cuenta | Puede reducir la ruta crítica; arranque y restauración también consumen tiempo |
| Ejecución selectiva | FORCE_FAILURE es demostración de error; no selecciona componentes | scope=full/backend/frontend y dos workflows mutuamente excluyentes | Reduce trabajo a petición, sin inferir cambios de archivos |
| Modularidad | Un job declarativo de tres etapas y un script común | Cuatro jobs; comandos notify y failure-demo reutilizables; comprobación modular de reportes | Separa entornos, responsabilidades y diagnósticos |
| Base de datos | Contenedor CI compartido entre builds serializados | Servicio PostgreSQL efímero para cada job backend | Aísla datos entre ejecuciones |
| Artefactos y reportes | JUnit y archiveArtifacts centralizados; también conserva logs | store_test_results y store_artifacts por componente; logs en la interfaz | Conserva JAR, dist y reportes; retención depende del proyecto/plataforma |
| Operación | Administrar servidor, plugins, imagen y volumen Jenkins | Ejecutores administrados por CircleCI | Reduce administración local; requiere cuenta, conectividad y recursos disponibles |

Estas diferencias describen las configuraciones entregadas, no límites de las plataformas: Jenkins también permite etapas paralelas, selección de componentes y caché explícita si se implementan.

## 7. Resultados y tiempos observados

| Ejecución | Resultado | Pruebas de aplicación | Tiempo | Evidencia |
| --- | --- | --- | --- | --- |
| Jenkins #1, 23/10/2026 | SUCCESS | 29 backend + 17 frontend, cero omitidas | 32,549 s totales | docs/evidencias-jenkins/resultados.json |
| Jenkins #2, 23/10/2026 | FAILURE controlado | Las mismas 46 aprobadas | 28,307 s totales | Mismo JSON y consola del build #2 |
| Backend local, revisión actual | BUILD SUCCESS | 29 aprobadas, incluidas 21 de integración | 20,170 s informados por Maven | Log y resumen en docs/evidencias-circleci/ |
| Frontend local, revisión actual | Pruebas y build correctos | 17 aprobadas en cinco archivos | Vitest: 15,59 s; Vite: 19,48 s | Reporte JUnit guardado como evidencia local |
| Auxiliares CI, revisión actual | SUCCESS local | 10 aprobadas con mocks de Telegram | No comparable con un workflow | Resumen de validación local |
| Backend Docker con imagen CircleCI | BUILD SUCCESS | 29 aprobadas, incluidas 21 de integración | Maven: 1 min 48 s | docker/backend-resumen.txt y JUnit |
| Frontend Docker con imagen CircleCI | Pruebas y build correctos | 17 aprobadas, sin omisiones | Vitest: 1,02 s; Vite: 2,41 s | docker/frontend-resumen.txt y JUnit |
| CircleCI alojado | Pendiente | No medido | No medido | Requiere conectar cuenta y ejecutar |

Los tiempos locales no equivalen a un pipeline: Maven excluye frontend y orquestación; Vite excluye TypeScript y Vitest. El backend local usó JDK 25 con objetivo de compilación Java 21, mientras el job entregado usa Java 21. Además se repitieron las pruebas en Docker con las imágenes exactas declaradas: Java 21.0.13 y Maven 3.10.0 en backend; Node 22.20.0 y npm 10.9.3 en frontend. El frontend instaló dependencias con npm ci en una copia limpia; Maven reutilizó el repositorio local existente. Las bases de pruebas local y Docker se crearon aparte y se detuvieron al finalizar. Por tanto no es válido calcular aceleración de CircleCI con estas cifras.

Jenkins #2 es más corto pese al fallo porque el error se inyectó después de las pruebas. Esto no demuestra una mejora por caché: no existe una medición controlada frío/caliente de esos builds. Las confirmaciones de Telegram en Jenkins son históricas; las actuales fueron simuladas en tests.

El límite esperado de la ruta crítica de CircleCI es aproximadamente max(T_backend, T_frontend, T_helpers) + T_aviso, incluyendo en cada componente checkout, arranque y caché. Es una hipótesis de diseño, no una duración medida. La suma de tiempo de cómputo puede aumentar por ejecutar varios contenedores.

## 8. Método para completar la comparación de ejecución

Conectar el repositorio en CircleCI y configurar las dos variables Telegram siguiendo GUIA_ENTREGA_CIRCLECI.md. Ejecutar éxito completo, fallo controlado y ambos alcances selectivos. Conservar URL del workflow y los jobs, SHA, rama, ejecutor, tiempos de cola, resultados, artefactos y capturas de Telegram. La CLI oficial 1.12.0 validó el esquema mediante la API de CircleCI y compiló correctamente las variantes scope=full, backend y frontend; las salidas se guardaron en docs/evidencias-circleci/. Esto verifica configuración y selección del workflow, pero no acredita ejecución alojada.

Para medir rendimiento, usar el mismo commit, herramientas equivalentes y base aislada. Hacer al menos tres ensayos completos fríos y tres calientes en cada plataforma; controlar o documentar invalidación de caché. Comparar medianas de tiempo total sin cola, tiempo de cola y tiempo por componente. Calcular reducción (%) = (mediana_Jenkins - mediana_CircleCI) / mediana_Jenkins × 100. Evaluar también consumo de recursos. No comparar una ejecución selectiva con una completa para afirmar aceleración general.

## 9. Conclusiones y pendientes

Se entregan la configuración modular de CircleCI, dos workflows, cachés por manifiesto, ejecución selectiva, publicación de resultados y artefactos, y avisos SUCCESS/FAILURE. La aplicación conserva su comportamiento; las 46 pruebas de aplicación y las 10 auxiliares pasaron localmente. TypeScript/Vite y Maven produjeron sus artefactos. Vite avisó de un bundle de más de 500 kB y anotaciones de dependencias; no impidieron compilar.

Falta activar el proyecto CircleCI en una cuenta con acceso al repositorio, ejecutar los escenarios en esa plataforma y recoger tiempos y avisos reales. Hasta entonces, la comparación de ejecución de CircleCI permanece abierta y no se afirma que sea más rápido que Jenkins.

## 10. Fuentes y anexos

- Jenkinsfile, ci/build.sh, ci/check_reports.py, pom.xml y frontend/package.json: configuración del proyecto.
- ci/VALIDACION.md y docs/evidencias-jenkins/: resultados y capturas históricas de Jenkins.
- .circleci/config.yml y GUIA_ENTREGA_CIRCLECI.md: migración y procedimiento de activación.
- CircleCI, referencia oficial de configuración: https://circleci.com/docs/reference/configuration-reference/
- CircleCI, caché de dependencias: https://circleci.com/docs/guides/optimize/caching/
- CircleCI, workflows: https://circleci.com/docs/guides/orchestrate/workflows/

Las fuentes oficiales se consultaron el 29/10/2026 para verificar sintaxis de workflows, filtros por expresión, dependencias filtradas y claves de caché. Las capturas siguientes pertenecen a Jenkins, no a CircleCI. La revisión adicional Docker está registrada en docs/evidencias-circleci/docker/ y no debe presentarse como una ejecución en CircleCI.
