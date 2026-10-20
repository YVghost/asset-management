# Áreas y ubicaciones de cada empresa

Cada organización define sus propios nombres. No hay una lista obligatoria o compartida entre empresas. Un administrador de empresa (`ORG_ADMIN`) o gestor de activos (`ASSET_MANAGER`) puede gestionar estos registros; una cuenta `VIEWER` solo consulta. El maestro mantiene su acceso global.

## Uso

1. Selecciona la empresa en el menú lateral.
2. En **Áreas**, pulsa **Nueva área**: por ejemplo, TI, Operaciones o Bodega.
3. Usa **Editar** para cambiar Operaciones por Logística. Se conserva el identificador y los activos/empleados muestran el nombre actualizado.
4. Pulsa **Desactivar** para quitar un registro de las opciones de nuevas altas. Se pide confirmación y se muestran sus relaciones con activos y personas.
5. Filtra por **Inactivos** o **Todos** para encontrarlo y pulsa **Reactivar** si vuelve a utilizarse.
6. En **Ubicaciones**, el flujo es el mismo. Se puede registrar una dirección además del nombre.

Un área representa la organización interna (TI, Operaciones, Bodega); una ubicación puede representar un sitio físico (Oficina central, Bodega norte, Piso 2). La empresa elige sus nombres y puede usar ambos campos según sus necesidades.

## Conservación de datos

La acción de quitar es una desactivación lógica. No elimina activos, empleados ni movimientos. Los registros existentes mantienen su área/ubicación y pueden editarse conservando una referencia inactiva, identificada como `(inactivo)`. También pueden trasladarse a otro registro activo mediante la edición correspondiente. Las nuevas altas no admiten referencias inactivas.

Cada nombre es único dentro de su empresa y catálogo; empresas distintas pueden usar el mismo nombre. El backend comprueba la organización y los permisos en lectura y escritura. No es posible gestionar registros ajenos cambiando un identificador en la URL.

No se requieren nuevas migraciones: se utilizan los identificadores, relaciones y campos `active` existentes. Las consultas de catálogos admiten `state=ALL|ACTIVE|INACTIVE`, además de búsqueda y paginación.

## Validación

29 pruebas de backend y 17 de frontend aprobadas, compilación de producción correcta y recorrido Playwright aprobado con un administrador de organización. El recorrido verifica altas, renombrado, desactivación, reactivación, conservación de vínculos y rechazo del acceso a otra empresa. Imágenes Docker reconstruidas y los tres servicios saludables.
