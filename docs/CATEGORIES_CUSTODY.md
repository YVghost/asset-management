# Categorías y custodia de activos

Cada empresa recibe 20 categorías de hardware y 7 digitales. Incluyen laptops, computadoras de escritorio, monitores, periféricos, impresoras, servidores, redes, teléfonos, tablets, UPS; y licencias, SaaS, dominios, certificados, software y servicios cloud. Son registros propios de la empresa, administrables desde Categorías.

En el registro de un activo, selecciona **Otros / Crear categoría…**, escribe el nombre y pulsa **Añadir categoría**. Queda seleccionada y disponible para futuros registros de esa empresa y del mismo tipo de activo. La categoría se guarda al pulsar Añadir categoría aunque después se cancele el alta del activo.

La casilla **Este activo tiene un responsable específico** empieza desmarcada:

- Sin marcar: el activo queda en el inventario y bajo custodia de la organización, sin empleado responsable.
- Hardware: al marcarla, debes elegir un empleado. Guardar crea una entrega inicial con historial y deja el activo asignado. Las entregas posteriores se gestionan desde la ficha mediante Entregar, Transferir o Devolver.
- Digital: al marcarla, debes elegir un responsable administrativo. No se genera una entrega física ni se consumen puestos de licencia. La custodia puede cambiarse al editar; desmarcar elimina el responsable administrativo.

Para hardware puedes indicar ubicación física y un lugar concreto de almacenamiento (bodega, estante o puesto), independientemente de que tenga responsable. Para digitales se registra un portal o referencia de gestión; no deben introducirse contraseñas ni claves privadas.

Las migraciones V4/V5 añaden las categorías faltantes y sus nombres en español a las empresas existentes sin reactivar las desactivadas. Las empresas creadas desde administración y el aprovisionamiento inicial reciben el mismo catálogo. El lugar de almacenamiento usa las especificaciones del hardware; el portal digital tiene un campo propio. Se conservan las asignaciones anteriores.

Validado con 29 pruebas backend y 17 frontend, compilación de producción y dos recorridos de navegador: categorías/custodia y áreas/ubicaciones. Las empresas temporales de prueba se desactivaron al terminar. Imágenes Docker reconstruidas.
