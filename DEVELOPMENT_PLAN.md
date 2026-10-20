# Estado de desarrollo de AMS

Edinun dispone de datos ficticios identificados con `[DEMO]`/`EDN-DEMO-`: 12 activos hardware, 4 digitales, 5 empleados, 4 áreas, 3 ubicaciones y 2 proveedores. Incluyen responsables opcionales, almacenamiento, transferencia histórica, mantenimiento y vencimientos. Carga explícita mediante API con `scripts/seed-edinun-demo.mjs`; ver `docs/EDINUN_DEMO.md`. Se verificó pertenencia y QR de los 16 activos, sin cambiar las cantidades de inventario de otras organizaciones.

Categorías y custodia: catálogo inicial de 20 categorías hardware y 7 digitales por empresa, creación de categorías desde el formulario mediante Otros, casilla de responsable específico, entrega inicial de hardware o responsable administrativo digital, lugar de almacenamiento y portal de gestión. Sin responsable, la custodia corresponde a la organización. Migraciones V4/V5 conservan inventarios existentes; nuevas empresas reciben el catálogo automáticamente. Ver `docs/CATEGORIES_CUSTODY.md`.

Gestión autónoma de áreas y ubicaciones: acciones explícitas de crear/editar/desactivar/reactivar, filtro activo/inactivo y conteo de activos/personas relacionados. Administradores y gestores de cada empresa pueden gestionarlas sin intervención del maestro; las cuentas de consulta no pueden modificarlas. Los activos y empleados existentes conservan las referencias inactivas al editar; las nuevas altas solo permiten referencias activas. Nombres y datos aislados por organización. Se reutilizó el esquema existente, sin migraciones nuevas. Documentación en `docs/AREAS_LOCATIONS.md`.

Actualización del 20 de octubre de 2026: identidad por UUID de organización (GENERIC, EDINUN o CUSTOM), logo propio persistente y colores/fuentes validados por contraste; carpeta de marca movida a `frontend/src/branding/edinun/`; organización Edinun independiente configurada sin copiar inventario demo; interfaz con fuentes mayores y contraste reforzado; filtros combinables de activo, responsables actuales/anteriores, áreas, proveedor, estado y rangos de fecha; UUID QR permanente por activo, etiquetas individuales/por selección, PNG e impresión A4 con resolución autorizada a la ficha actual. Se corrigieron las rutas SPA de Nginx que coincidían con `/assets`. Se agregaron migraciones V2 y V3 sin modificar V1. Ver `docs/BRANDING_FILTERS_QR.md`.

Validación de esta actualización: 27 pruebas backend (19 de integración con PostgreSQL 17.6 de Testcontainers y 8 unitarias), 17 frontend y recorrido Chrome aprobado. El navegador comprobó tema Edinun/genérico/personalizado con logo subido, aislamiento entre empresas, filtros históricos y CSV, PNG decodificado por un lector QR independiente, ficha tras transferencia, lote de etiquetas y PDF A4; se revisaron capturas desktop/móvil. Las empresas QA se desactivan al terminar. Docker se reconstruyó y se comprobó persistencia de inventario, identificadores QR, marcas y logos mediante down/up sin eliminar volúmenes. HTTPS y alcance desde teléfonos requieren configurar la dirección/red del servidor.

Entrega local: 16 de octubre de 2026. Se conservó el backend Maven existente en la raíz y se añadió `frontend/`. No existían funcionalidades de negocio, migraciones o datos que preservar.

Actualización de administración maestra: cuenta global independiente aprovisionada desde variables `MASTER_*`, panel `/system`, CRUD administrativo de empresas y cuentas, suspensión/reactivación, cambios de contraseña y asignación/revocación de membresías. Las 21 pruebas backend se ejecutaron contra PostgreSQL 17.6 en Testcontainers y pasaron sin omisiones. Las 12 pruebas frontend y la compilación pasaron. El recorrido Chrome del panel maestro verificó creación de empresa y usuario, asignación de acceso y rechazo 403 del panel global para una cuenta normal, que solo ve su empresa. Las imágenes se reconstruyeron y los tres servicios Docker quedaron saludables. Los registros creados por la prueba de administración se desactivaron al finalizar. No hubo cambios de esquema ni eliminación de inventarios.

## Implementado

- Monolito Spring Boot 4.1.1/Java 21 y frontend React/TypeScript integrados mediante API versionada.
- Migración Flyway V1 con 14 tablas, UUID, claves foráneas por organización, controles de fechas/importes, códigos únicos por empresa, índices y restricción de asignación vigente.
- Organizaciones y membresías, sesiones reales, cookies HttpOnly/SameSite, CSRF, BCrypt, logout, roles y autorización por organización en el servidor.
- Aprovisionamiento inicial de administrador/empresa para una base vacía, separado del seed.
- CRUD de empleados y catálogos con desactivación lógica, ubicaciones, departamentos, proveedores y categorías administrables.
- Creación/edición/consulta de hardware y activos digitales con detalles separados, especificaciones JSONB, garantías y vencimientos.
- Vida útil con meses de calendario, porcentaje limitado, datos faltantes, alertas configurables y fecha estimada independiente de la baja.
- Asignaciones, devoluciones y transferencias transaccionales, bloqueo pesimista e índice parcial para concurrencia; historial y ficha del empleado.
- Relaciones padre/hijo mediante API con prevención de ciclos; responsable administrativo y número de puestos para activos digitales.
- Auditoría de creación/edición, estado y entregas con responsable y timestamps; conservación histórica al dar de baja.
- Dashboard con consultas PostgreSQL, distribución por categoría/departamento y alertas.
- Interfaz responsive en español: login, inventario, formularios, edición, detalle, acciones, empleados, catálogos, reportes y configuración de acceso.
- Validación de formularios con React Hook Form/Zod, errores de API, carga/vacíos, confirmaciones y etiquetas accesibles.
- Búsqueda, filtros, paginación, ordenamiento de inventario y CSV UTF-8 para Excel con resultados filtrados y protección contra fórmulas.
- Dockerfiles multi-stage, Nginx, Compose con healthchecks, volumen persistente y superposición de producción.
- Seed exclusivo de `dev`: empresa ficticia, 6 empleados, 27 categorías, 19 activos y ejemplos de alertas/mantenimiento/asignaciones. No se duplica al reiniciar.
- README con arquitectura, ER Mermaid, API, variables, operación, producción y respaldo/restauración; recorrido manual en `docs/MANUAL_TESTS.md`.

## Validación realizada

| Comprobación | Resultado |
| --- | --- |
| Compilación y empaquetado Maven | Correctos; JAR ejecutable generado |
| Pruebas backend | 27 aprobadas: 8 unitarias y 19 de integración, sin omisiones |
| Migración V1 | Ejecutada correctamente sobre PostgreSQL temporal |
| Hibernate `ddl-auto=validate` | Correcto contra esquema migrado |
| PostgreSQL real | Pruebas de claves, códigos, persistencia, costos y operaciones transaccionales |
| Dos asignaciones concurrentes | Solo una aceptada; índice de base de datos también comprobado por separado |
| Seguridad HTTP | Login/logout, cookie, CSRF, 401/403, permisos, aislamiento y validación comprobados |
| API de inventario | Alta HTTP, fechas de calendario, entrega, consulta, dashboard y CSV comprobados |
| Swagger/OpenAPI | `/v3/api-docs` devuelve 200 |
| Seed | Datos e idempotencia comprobados |
| Frontend unitario/componentes | 17 pruebas aprobadas |
| TypeScript y build Vite | Correctos |
| Navegador Chrome real | 1 recorrido integral aprobado: login, alta y edición de laptop, vida útil, entrega, ficha del empleado, devolución, recarga y alta/alerta digital |
| Revisión responsive | Capturas desktop y móvil generadas e inspeccionadas |
| Compose desarrollo/producción | Ambos validados mediante `docker compose ... config --quiet` |

El entorno tenía JDK 26 y JDK 17, sin JDK 21. Maven compiló con `--release 21` usando JDK 26; las imágenes especifican Java 21. Las pruebas reales utilizaron PostgreSQL 18.4 temporal descargado en `.cache`, aislado en `127.0.0.1:55432`, porque el daemon Docker no estaba activo. El target de Compose/Testcontainers es PostgreSQL 17.6. Las herramientas y datos temporales están ignorados y no forman parte de las imágenes ni de la configuración entregada.

## Verificación pendiente por el entorno

- Construir y arrancar las tres imágenes con Docker Desktop activo.
- Comprobar healthchecks, proxy Nginx y persistencia del volumen después de `docker compose down` / `up` (escenario E). La recarga y persistencia de operaciones sí se comprobaron con PostgreSQL real.
- Ejecutar la suite con JDK 21 y el contenedor PostgreSQL 17.6 para verificar las versiones exactas de despliegue.
- Verificar HTTPS/cookie Secure detrás del reverse proxy elegido para producción.

No se realizó despliegue externo ni se ejecutaron migraciones contra una base de datos existente del usuario.

## Alcance de la primera versión y mejoras futuras

- Mantenimiento: se gestiona el estado del activo; la tabla de órdenes existe, pero no hay todavía UI/API de órdenes, costos o planificación avanzada.
- Licencias: responsable administrativo y puestos contratados; falta la asignación/consumo individual de puestos y sus reglas de concurrencia.
- Vida útil: `residual_value` preparado; sin política de depreciación contable. QR y etiquetas A4 implementados. No hay importación CSV, PDFs complejos de reportes, códigos de barras, compras ni adjuntos.
- Padre/hijo: disponible por API; falta selector y visualización de árbol en la interfaz.
- Especificaciones: el modelo JSONB admite campos adicionales por API; la interfaz presenta los campos técnicos iniciales. No hay todavía diseñador de campos dinámicos por categoría.
- Administración global implementada: cuenta maestra independiente, panel de organizaciones y usuarios, activación/suspensión, restablecimiento de contraseñas y membresías por empresa. Las cuentas maestras tienen acceso a todas las organizaciones activas; las normales mantienen el aislamiento. Faltan recuperación/autocambio de contraseña, MFA y revocación masiva de sesiones. Ver `docs/MASTER_ADMIN.md`.
- Catálogos y empleados: paginación y búsqueda con orden alfabético fijo; la selección de orden está disponible en el inventario.
- Auditoría: conserva cambios relevantes de activos y movimientos; ampliar a todos los campos especializados y catálogos para políticas de auditoría más exigentes.
- Reportes: vistas filtradas y CSV; la exportación completa se prepara en memoria y conviene migrarla a streaming para inventarios grandes.
- Dashboard: gráficos sencillos y datos reales; no suma costos de distintas monedas. La etiqueta de alerta de vida útil usa el horizonte inicial de seis meses aunque el backend permite configurarlo.
- Sesiones de servidor en memoria: requieren volver a iniciar sesión tras reiniciar el backend. Añadir Spring Session para varios nodos o sesiones persistentes.
- Operación: incorporar CI, límites de intentos de acceso, observabilidad, política de copias/restauración verificada y actualización periódica de dependencias/imágenes antes de la puesta en producción.

## Próximo paso recomendado

Completar el escenario Docker de [docs/MANUAL_TESTS.md](docs/MANUAL_TESTS.md) con el motor activo y ejecutar un inventario piloto de una empresa. Priorizar las mejoras que ese piloto confirme necesarias antes de ampliar módulos.
