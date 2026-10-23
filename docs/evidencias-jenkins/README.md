# Evidencias reales de Jenkins

Capturadas el 23 de octubre de 2026 sobre los builds **#1 SUCCESS** y **#2 FAILURE controlado**, ambos probando el commit **d1c37eb** de `mateo_ortega`.

| Archivo | Contenido |
|---|---|
| `01-pipeline-etapas.png` | Stage View con las tres etapas y ambas ejecuciones |
| `02-build-exitoso.png` | Página del build #1 exitoso |
| `03-resultados-pruebas.png` | 46 pruebas JUnit aprobadas, sin omisiones |
| `04-artefactos.png` | JAR, frontend y logs archivados en Jenkins |
| `05-fallo-controlado.png` | Página del build #2, fallo solicitado por parámetro |
| `06-consola-fallo-telegram.png` | Confirmación Telegram y conservación del resultado FAILURE |
| `build-1-console.txt` / `build-2-console.txt` | Consolas descargadas de Jenkins |
| `resultados.json` | Resultados, estados de las etapas, conteos y artefactos desde la API Jenkins |
| `metadata.json` | Repositorio, visibilidad observada, rama, fecha y commit probado |

Los mensajes de Telegram fueron confirmados por la API real. Las fotos de la aplicación Telegram las agregará el usuario al informe Word. No se incluyen tokens ni contraseñas.
