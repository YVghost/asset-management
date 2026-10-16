# Recorrido manual de aceptación

Ejecutar después de `docker compose up --build -d`, con datos de desarrollo habilitados y las credenciales propias de `.env`.

## A. Hardware y vida útil

1. Abrir http://localhost:3000 e iniciar sesión.
2. Inventario → Registrar activo → Hardware.
3. Registrar código nuevo, nombre Laptop de prueba, categoría Laptops, marca/modelo/serie.
4. Compra `2025-01-01`, servicio `2025-01-02`, vida útil `48`, costo `1200.50`, moneda `USD`.
5. Guardar. Comprobar ficha, fecha estimada `2029-01-02`, vida restante calculada y registro de creación.
6. Volver a inventario y buscar el código. Confirmar que persiste tras recargar.
7. Editar el activo. Verificar que las fechas conservan su valor. Cambiar vida útil a 60 meses; comprobar nuevo cálculo e historial anterior/nuevo.
8. Repetir código en la misma empresa: debe devolver conflicto sin crear otra fila.
9. Registrar un teclado sin CPU, RAM ni SO; debe permitirlo. Registrar sin fecha de servicio: debe indicar información insuficiente.

## B. Entrega, transferencia y ficha del empleado

1. Abrir la laptop disponible → Asignar a empleado.
2. Buscar Ana por nombre o código, seleccionar departamento y fecha actual de entrega.
3. Confirmar; comprobar estado Asignado y nombre completo.
4. Abrir ficha del empleado; debe mostrar la laptop.
5. Regresar a la laptop → Transferir → seleccionar Carlos → confirmar.
6. Debe quedar asignada a Carlos. El historial debe conservar la entrega a Ana con fecha de devolución y una nueva entrega a Carlos.
7. Abrir dos pestañas con un activo disponible e intentar asignarlo en ambas; solo una entrega debe aceptarse.

## C. Devolución y baja

1. En un activo asignado, registrar devolución con fecha posterior a su entrega.
2. Comprobar estado Disponible, Sin asignar y movimiento previo conservado.
3. Una devolución anterior a la entrega debe rechazarse sin alterar la asignación.
4. Enviar a mantenimiento; comprobar que no puede asignarse. Finalizar mantenimiento para dejarlo disponible.
5. Dar de baja y confirmar. El registro debe seguir en inventario y reportes históricos y sin botón de asignación.
6. Superar la vida útil por fechas antiguas no debe producir una baja automática.

## D. Activo digital y reportes

1. Registrar licencia con categoría Licencias de software, producto, proveedor, referencia no secreta, puestos y vencimiento dentro de 10 días.
2. Verificar que aparece en Activos digitales y en la alerta de licencias del dashboard.
3. Filtrar reportes por empleado, ubicación, departamento, disponibles y dados de baja.
4. Exportar CSV; abrir en Excel y comprobar acentos, columnas y que contiene todos los resultados filtrados.
5. Crear o editar empleado, ubicación, departamento, proveedor y categoría. Recargar para comprobar persistencia. Desactivar un empleado sin entregas; no debe aparecer entre los receptores posibles.

## E. Persistencia de contenedores

1. Registrar un activo con código que puedas identificar.
2. Ejecutar `docker compose down` sin `-v`.
3. Ejecutar `docker compose up -d`; esperar estado saludable.
4. Iniciar sesión y buscar el activo. Debe conservar campos, asignaciones y auditoría.
5. Reiniciar otra vez; los datos demo no deben duplicarse.

## F. Seguridad

1. En Configuración como ORG_ADMIN, autorizar un usuario nuevo con rol VIEWER y contraseña propia de al menos 12 caracteres.
2. Iniciar sesión con esa cuenta en una ventana privada. Debe poder consultar pero no registrar, editar ni asignar.
3. Con la cuenta de desarrollo administradora del sistema, crear otra organización por `POST /api/v1/organizations`, conservando cookie y CSRF (procedimiento descrito en README). El creador queda como ORG_ADMIN de esa empresa.
4. Autorizar un usuario nuevo solo para la segunda empresa por `POST /api/v1/organizations/{id}/users`.
5. Con ese usuario, llamar `GET /api/v1/organizations/{idEmpresaOriginal}/assets`: debe responder 403.
6. Usar una ubicación o empleado de otra empresa al crear/asignar: debe rechazarse. Cambiar un UUID de activo en URL no debe revelar información de otra empresa.
7. Hacer POST sin CSRF: 403. Consultar sin sesión: 401. Cerrar sesión y repetir una consulta: 401.

## Prueba de navegador automatizada

Con backend y Vite activos, una empresa demo y Chrome instalado:

```powershell
cd frontend
$env:AMS_E2E_EMAIL='<correo demo>'
$env:AMS_E2E_PASSWORD='<contraseña demo>'
npx playwright test
```

`AMS_E2E_URL` permite usar http://localhost:3000 en lugar de Vite. `AMS_E2E_CHANNEL=msedge` permite usar Edge. La prueba crea registros propios identificados con `E2E-`, verifica alta, edición, entrega, ficha del empleado, devolución, recarga y vencimiento digital. Genera capturas desktop/móvil en `frontend/test-results/`, que no se versionan. Utilizar exclusivamente datos de desarrollo o una base de pruebas.
