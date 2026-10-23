# Deber Jenkins: guía de instalación y demostración

Esta configuración trabaja en **asset-management**, rama **mateo_ortega**. No reemplaza el Compose de la aplicación. Usa siempre `-f docker-compose.jenkins.yml` para operar Jenkins. No necesitas modificar `main`, borrar archivos ni compartir secretos.

## 1. Qué se encontró en el proyecto

| Componente | Configuración verificada | Comando CI |
|---|---|---|
| Backend en la raíz | Spring Boot 4.1.1, Java 21, `pom.xml` | `mvn -B -ntp clean verify` |
| Maven de Jenkins | 3.9.9, como el Dockerfile del backend | Instalado en la imagen |
| Wrapper local | Configura Maven 3.10.0 | No se cambia; CI usa Maven 3.9.9 explícitamente |
| Frontend `frontend/` | React 19, TypeScript 5.9, Vite 7, lockfile npm | `npm ci --no-audit --no-fund` |
| Node en Jenkins | 22.20.0, como el Dockerfile del frontend | Instalado en la imagen |
| Tests frontend | Script `test`: `vitest run` | `npm test -- --reporter=default --reporter=junit --outputFile=reports/vitest.xml` |
| Build frontend | Script `build`: `tsc -b && vite build` | `npm run build` |
| Integración backend | PostgreSQL 17.6 y variables `AMS_TEST_DATABASE_*` | Base CI aislada, sin puerto público |

No se inventaron scripts de la aplicación ni se modificó su lógica. Se conservó `Jenkinsfile.txt` como referencia. El pipeline usa el archivo **Jenkinsfile**, sin extensión.

Las pruebas backend pueden saltarse la integración si Docker/base no están disponibles. Por eso CI configura `AMS_TEST_DATABASE_URL`, `AMS_TEST_DATABASE_USER` y `AMS_TEST_DATABASE_PASSWORD`, y `ci/check_reports.py` exige reportes reales de integración y rechaza cualquier omisión. No se conecta a la base de desarrollo. Las pruebas E2E Playwright ya existentes necesitan la aplicación preparada y credenciales; esta entrega ejecuta la suite frontend de Vitest y las pruebas backend, sin incluir esos E2E.

## 2. Instalar Docker en Windows, solo si falta

En este equipo Docker Desktop ya está instalado. Para otro Windows:

1. En PowerShell como administrador ejecuta `wsl --install`. Reinicia si Windows lo pide.
2. Ejecuta `wsl --update` y `wsl --version`.
3. Descarga Docker Desktop para Windows desde la [página oficial](https://docs.docker.com/desktop/setup/install/windows-install/). Instálalo con el backend WSL 2.
4. Abre Docker Desktop y espera a que el motor esté iniciado. Usa contenedores Linux.
5. En una terminal nueva ejecuta `docker version` y `docker compose version`. Debe aparecer tanto Client como Server.

No hace falta instalar Java, Maven o Node en Windows para ejecutar el pipeline: están dentro de Jenkins.

## 3. Levantar Jenkins

Abre una terminal en la raíz de asset-management:

```powershell
git branch --show-current
docker compose -f docker-compose.jenkins.yml up -d --build
docker compose -f docker-compose.jenkins.yml ps
```

La rama debe ser `mateo_ortega`. El primer build descarga Jenkins, herramientas y plugins; puede tardar varios minutos. Para revisar progreso:

```powershell
docker compose -f docker-compose.jenkins.yml logs --tail 80 jenkins
```

Abre **http://localhost:8080**. Para obtener la clave inicial, ejecuta localmente:

```powershell
docker compose -f docker-compose.jenkins.yml exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Esa salida es un secreto: no la envíes al chat, no la publiques ni la incluyas en capturas. Pégala únicamente en Unlock Jenkins. Completa el asistente y crea tu propio administrador. Los plugins de esta entrega ya vienen instalados; si el asistente ofrece selección, evita reinstalar todos los sugeridos innecesariamente. Configura la URL de Jenkins como `http://localhost:8080/` en Manage Jenkins → System → Jenkins Location.

El volumen `ams-jenkins_jenkins_home` conserva cuentas, credenciales, jobs e historial entre reinicios. Para detener y volver a iniciar:

```powershell
docker compose -f docker-compose.jenkins.yml stop
docker compose -f docker-compose.jenkins.yml start
```

No ejecutes `down -v`: borraría el volumen. La base de pruebas es temporal y se vacía al recrear/detener su contenedor; no contiene inventario real. La configuración mantiene el asistente y la autenticación de Jenkins, sin usuario root, socket Docker ni modo privilegiado. Consulta la [instalación oficial de Jenkins con Docker](https://www.jenkins.io/doc/book/installing/docker/).

Si el backend de la aplicación ocupa 8080, ambos no pueden usarlo a la vez. Detén únicamente ese servicio durante la demostración con `docker compose stop backend` y después recupéralo con `docker compose start backend`. No elimines contenedores ni volúmenes de la aplicación.

## 4. Plugins

Las imágenes base están fijadas por digest SHA-256 y plugins.txt conserva las versiones exactas resueltas. La imagen instala Pipeline (`workflow-aggregator`), Declarative Pipeline (`pipeline-model-definition`), Git, Credentials Binding, JUnit, Pipeline Stage View y Timestamper, con sus dependencias. Compruébalos en Manage Jenkins → Plugins → Installed plugins. No se requiere plugin Telegram ni Docker Pipeline: Telegram usa HTTPS y los tests tienen su propia base accesible por red interna.

## 5. Preparar GitHub privado y registrar github-private

1. En GitHub abre tu perfil → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. Asigna nombre, por ejemplo `jenkins-asset-management`, y una fecha de expiración.
3. En Resource owner selecciona el propietario correcto (`YVghost` si es tu usuario). En Repository access elige Only select repositories y selecciona únicamente `asset-management`.
4. En Repository permissions concede **Contents: Read-only**. Metadata de lectura es implícito. No necesitas permisos de escritura, administración ni webhooks. Si una organización exige aprobación, espera a que el propietario apruebe el token.
5. Genera y guarda el token en un gestor de contraseñas; GitHub lo muestra una sola vez. El usuario dueño del token debe tener acceso al repositorio. Consulta los [tokens de acceso de GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
6. En Jenkins abre Manage Jenkins → Credentials → System → Global credentials (unrestricted) → Add Credentials.
7. Kind: **Username with password**. Username: tu usuario GitHub con acceso. Password: el token. ID: **github-private**. Description: `Lectura asset-management`.
8. En GitHub abre el repositorio → Settings → General → Danger Zone → Change repository visibility → Make private. Confirma el nombre que GitHub solicite. Haz este cambio tú cuando estés listo; esta implementación no cambia la visibilidad.
9. La URL sigue siendo `https://github.com/YVghost/asset-management.git`. El Jenkinsfile fija `mateo_ortega` y `credentialsId: 'github-private'` para el checkout HTTPS.

No coloques el PAT en una URL, un archivo `.env` versionado o un Jenkinsfile. Si expira, actualiza la credencial manteniendo su ID. No cambies el token por tu contraseña normal de GitHub.

## 6. Crear el bot y registrar Telegram

Bot de este proyecto: [@asstet_management_bot](https://t.me/asstet_management_bot). El token se almacena únicamente como credencial secreta de Jenkins, nunca en esta guía.


1. En Telegram busca la cuenta oficial **@BotFather**.
2. Envíale `/newbot`, elige un nombre visible y un username único que termine en `bot`.
3. BotFather entrega el token. Guárdalo en privado. Si se filtra, revócalo con BotFather y actualiza Jenkins.
4. Abre el enlace de tu bot, pulsa **Start** y envíale `hola`. El bot no puede iniciar un chat contigo si no lo has abierto.
5. Desde PowerShell ejecuta el helper local:

```powershell
.\ci\Get-TelegramChatId.ps1
```

Introduce el token en la entrada oculta. El script consulta `getUpdates` y muestra el ChatId de los mensajes pendientes. Elige tu chat privado. Si no aparece, envía otro mensaje y repite. Si configuraste un webhook con ese bot, utiliza un bot nuevo para esta tarea; no borres un webhook de otro sistema. Para grupos, añade el bot y envía un mensaje dirigido a él; el ID suele ser negativo y debe conservar su signo.

6. En Jenkins, vuelve a Credentials → System → Global credentials → Add Credentials. Kind **Secret text**, Secret: el token, ID: **telegram-bot-token**.
7. Crea otra **Secret text**, Secret: el chat ID, ID: **telegram-chat-id**.
8. No uses los IDs antiguos `telegram-token`, `repo-privado` o el nombre de tu bot como credencial: deben coincidir exactamente con los IDs anteriores.

La etapa 3 llama a `sendMessage`, exige la respuesta `ok: true` y evita imprimir tokens/URLs privadas. Referencia: [Telegram Bot API](https://core.telegram.org/bots/api#sendmessage). No uses capturas de BotFather que muestren el token como evidencia.

## 7. Llevar los archivos a la rama y crear el job

**Importante:** Jenkins clona GitHub, no los archivos sin publicar de tu VS Code. Esta implementación no crea commits ni hace push. Antes del primer build, revisa los cambios, crea tú un commit en `mateo_ortega` y súbelos a esa misma rama. Incluye `Jenkinsfile`, `ci/`, `docker-compose.jenkins.yml` y esta guía. No añadas `.env`, tokens, contraseñas ni `ci-output/`. No cambies ni mezcles `main`.

En este equipo ya se dejó creado asset-management-ci, sin ejecutarlo y sin credenciales. Después de completar el asistente, abre ese job. Los pasos siguientes sirven para revisar su configuración o recrearlo en una instalación nueva. Para garantizar que también se notifique un error del checkout, configura el job así:

1. Jenkins → New Item → nombre `asset-management-ci` → **Pipeline** → OK.
2. En Pipeline → Definition elige **Pipeline script**.
3. Copia el contenido completo de `Jenkinsfile` en el editor. Mantén marcada **Use Groovy Sandbox**. Save.
4. No configures Git adicional ni un checkout automático: la etapa 1 ya lo hace con credenciales.

El primer **Build Now** registra el parámetro `FORCE_FAILURE`; después aparecerá **Build with Parameters**. Puedes usar **Build Now** con sus valores por defecto. Con **Pipeline script from SCM** también es posible cargar el Jenkinsfile desde GitHub (URL anterior, credencial github-private, rama `*/mateo_ortega`, Script Path `Jenkinsfile`), pero un error al descargar el propio Jenkinsfile ocurre ANTES de las etapas y no puede ser notificado por la etapa 3. Por eso se recomienda Pipeline script para el deber.

## 8. Verificar las tres etapas

El pipeline contiene exactamente tres `stage(...)`, sin etapas paralelas ni checkout implícito:

1. **Integracion al repositorio privado**: checkout con github-private y rama fija; muestra el hash del commit.
2. **Compilacion y pruebas automatizadas**: Maven + Vitest + build frontend; registra JUnit y artefactos. Ejecuta ambos proyectos aunque uno falle. Rechaza pruebas omitidas y reportes ausentes.
3. **Notificacion por Telegram**: informa proyecto, job, build, rama, SUCCESS/FAILURE y enlace. Está en la imagen de Jenkins, por lo que funciona aunque falle el checkout. Un envío correcto no cambia un FAILURE anterior a SUCCESS.

Los bloques `post` publican resultados dentro de la segunda etapa; no agregan una cuarta etapa. `catchError` permite continuar hasta la notificación después de un fallo normal o timeout de las etapas anteriores. Un apagado de Jenkins, pérdida del agente o cancelación forzada del proceso puede impedir cualquier notificación. Referencias: [sintaxis declarativa](https://www.jenkins.io/doc/book/pipeline/syntax/) y [catchError](https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/).

## 9. Demostrar éxito y fallo, sin tocar código de negocio

**Éxito:** ejecuta con `FORCE_FAILURE=false`. Abre el número de build → Console Output. Deben compilar ambos proyectos, aparecer pruebas ejecutadas sin omisiones y terminar `Finished: SUCCESS`. Abre Test Result y los artefactos (JAR backend y dist frontend). En Stage View deben aparecer las tres etapas. En Telegram verifica el mismo número y resultado SUCCESS.

**Fallo controlado:** ejecuta Build with Parameters → marca `FORCE_FAILURE=true` → Build. Las pruebas reales se ejecutan, pero al terminar la etapa 2 se genera un error explícito de demostración. Debe verse etapa 2 roja, etapa 3 ejecutada y `Finished: FAILURE`. Telegram debe indicar FAILURE y el mismo número de build. No se modifican archivos ni inventarios. Desmarca el parámetro para recuperar el siguiente build exitoso.

**Fallo de checkout opcional:** edita temporalmente SOLO la copia del script del job y cambia `github-private` por un ID inexistente. Ejecuta y comprueba etapa 1 fallida, etapa 2 omitida y etapa 3 notificando FAILURE. Restaura inmediatamente `github-private`. No hagas ese cambio en el repositorio.

Si Telegram falla, Jenkins marca FAILURE y lo registra sin imprimir secretos. Si ya falló compilación/pruebas, ese FAILURE se conserva. Una notificación SUCCESS significa que checkout/compilación/pruebas terminaron bien; si el propio envío falla, no hay confirmación de entrega y no debe presentarse como éxito integral.

## 10. Evidencias para el profesor

- Job y Stage View con las tres etapas de un build exitoso.
- Console Output con versiones y resultados de Maven/Vitest, sin secretos.
- Test Result de Jenkins con pruebas backend y frontend, sin skips.
- Artefactos generados, incluyendo JAR y frontend dist.
- Mensaje Telegram SUCCESS con número, rama y enlace coincidentes.
- Build con FORCE_FAILURE, segunda etapa fallida y tercera ejecutada.
- Mensaje Telegram FAILURE con número coincidente y consola terminando FAILURE.
- GitHub mostrando el candado **Private**, nombre y rama. En una ventana sin autenticar, la URL privada no debe mostrar el código.
- Primera etapa del checkout privado exitosa y página de Jenkins mostrando el ID github-private, con campos secretos ocultos.
- `docker compose -f docker-compose.jenkins.yml ps` y Jenkins en localhost:8080.

El enlace `localhost` de Telegram abre Jenkins únicamente en esta computadora. Para abrirlo desde un teléfono necesitarías una URL de red configurada con autenticación y alcance adecuados; no es requisito para enviar el mensaje.

## 11. Comprobaciones técnicas locales

```powershell
docker compose -f docker-compose.jenkins.yml config --quiet
python -m unittest discover -s ci/tests -v
python ci/validate_jenkins.py
```

El último comando usa el validador declarativo REAL del Jenkins local. Antes de terminar el asistente intenta usar admin y la contraseña inicial, sin mostrarla. Después de configurar tu administrador requiere `JENKINS_USERNAME` y `JENKINS_API_TOKEN` locales (token de tu perfil Jenkins, no el PAT GitHub); no los publiques. Ver [validador oficial](https://www.jenkins.io/doc/book/pipeline/development/#linter).

Para probar los comandos del build en la imagen local sin publicar cambios (solo pruebas, no valida el checkout privado ni envía Telegram), copia el proyecto de trabajo a un contenedor temporal o ejecuta el job después de subir los archivos. No montes la base real de la aplicación en CI.

El estado de verificaciones reales y pendientes se registra en `ci/VALIDACION.md`. Crear credenciales, cambiar visibilidad, publicar la rama y enviar notificaciones reales requieren tu configuración manual; no se declaran completados por disponer de los scripts.
