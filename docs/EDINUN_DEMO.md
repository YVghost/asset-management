# Datos de demostración de Edinun

Se cargaron expresamente en la organización existente Edinun, mediante la API y con auditoría. Los nombres llevan `[DEMO]` y los códigos `EDN-DEMO-`; los empleados, direcciones, proveedores, series, facturas y contratos son ficticios. No se crearon cuentas de acceso ni contraseñas de demostración.

- 12 activos hardware: laptops, computadora de diseño, monitor, impresoras, servidor, router, switch, UPS y tablet.
- 4 activos digitales: suite editorial, colaboración, dominio de prueba y respaldo cloud.
- 5 empleados ficticios, 4 áreas (TI, Editorial, Operaciones, Bodega), 3 ubicaciones y 2 proveedores.
- Ejemplos con responsable y custodia de organización, almacenamiento en estantes/rack/puestos, transferencia con historial, mantenimiento, vida útil vencida y licencia próxima a vencer.
- Cada activo tiene su identificador QR propio generado por el sistema.

Selecciona **Edinun** en Organización activa. Busca `EDN-DEMO` en Inventario para revisar los activos; usa los filtros de responsables, áreas y ubicaciones para explorar los ejemplos.

El script `scripts/seed-edinun-demo.mjs` exige `AMS_SEED_EMAIL` y `AMS_SEED_PASSWORD`, utiliza `AMS_SEED_URL` (por defecto `http://localhost:3000`) y requiere las dependencias instaladas en `frontend/node_modules`. Se ejecuta con `node scripts/seed-edinun-demo.mjs`. Está limitado a una única organización activa llamada Edinun, omite activos existentes con los mismos códigos y no modifica sus datos al repetirse. No se ejecuta automáticamente al iniciar Docker. Si encuentra un registro de demostración desactivado que necesita reutilizar, se detiene para no reactivarlo.

La carga verificó los 16 activos, su pertenencia a Edinun y sus identificadores QR, y comparó las cantidades de activos de las demás organizaciones antes y después.
