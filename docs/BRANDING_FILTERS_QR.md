# Temas por empresa, filtros y etiquetas QR

Actualización del 20 de octubre de 2026.

## Identidad por organización

La carpeta raíz `edinum/` se reubicó en `frontend/src/branding/edinun/`. Contiene el logo oficial descargado, la configuración de colores y tipografía, y su procedencia en `README.md`. La marca oficial se escribe **Edinun**. Su web usa Arial; se utiliza la fuente del sistema, sin distribuir archivos de fuente propietarios. El paquete genérico está en `frontend/src/branding/generic/`.

El tema se guarda por UUID de organización en PostgreSQL, nunca mediante una comparación del nombre en el navegador. Una empresa nueva recibe `GENERIC`. El maestro puede ir a **Administración maestra → Organizaciones → Identidad visual** y elegir:

- **AMS · Genérico**: identidad neutra.
- **Edinun · Azul editorial**: logo y paleta propios de Edinun.
- **Personalizado**: colores de botones, menú y fondo, fuente del sistema/Arial/Georgia y logo propio PNG/JPEG.

El acceso general y la administración maestra son neutros. Al cambiar de organización se retira el tema anterior. El texto principal usa 16 px, tablas/formularios 14–15 px y metadatos 12–13 px. Los colores de estado mantienen significado independiente de la marca.

Los colores personalizados deben alcanzar contraste de al menos 4.5:1 entre texto blanco y botones/menú, y entre texto oscuro y fondo. Los logos se validan y recodifican como PNG, con límites de 1 MB de entrada y 2048×2048 píxeles. Se almacenan en PostgreSQL, protegidos por la autorización de la empresa y el volumen existente; no se pierden al reconstruir la imagen. `branding_version` permite actualizar un logo sin mantener la imagen antigua del navegador.

Los paquetes de marca iniciales se distribuyen con el frontend. Para una empresa nueva no hace falta crear otro frontend: se selecciona CUSTOM y se configura su identidad. Un paquete adicional con una identidad más elaborada puede añadirse como hermano de `edinun/` y registrarse en el catálogo de temas.

Se preparó una organización independiente **Edinun** con su tema. No se renombró la empresa demo ni se copiaron sus activos o empleados. Los usuarios normales necesitan una membresía para acceder a Edinun; el maestro puede seleccionarla directamente. Sus categorías y empleados se registran desde los módulos correspondientes.

## Filtros combinables

En Inventario, Hardware, Activos digitales, Asignaciones o Reportes, pulsa **Filtros**. La búsqueda principal incluye nombre/código del activo, serie, marca, modelo y producto digital. Los filtros específicos permiten combinar:

- Tipo, categoría, estado, empleado, área/departamento, ubicación y proveedor.
- Marca, modelo y persona por nombre, apellido o código.
- Con responsable / sin responsable.
- Vida útil vigente, próxima, superada o sin información.
- Garantías y licencias próximas a vencer.
- Fechas de compra, entrega, devolución, garantía o vencimiento digital, con límites inclusivos.

**Personas y movimientos** distingue:

- **Actualmente a cargo**: asignación vigente o responsable administrativo digital.
- **Tuvo asignado anteriormente**: entregas físicas ya cerradas.
- **Actual o anterior**: historial completo de entregas físicas.

Los responsables administrativos digitales actuales también pueden buscarse en el ámbito actual. El historial de entregas físicas no representa el consumo de puestos de una licencia.

Si buscas una persona anterior y filtras por fecha de entrega/devolución, ambas condiciones se comprueban sobre el mismo movimiento. Una entrega posterior a otra persona no produce una coincidencia falsa. Los rangos de timestamps usan días UTC; las fechas de compra/vencimiento se tratan como fechas de calendario.

Los filtros aparecen como etiquetas removibles y se guardan en la URL. Se conservan al recargar o compartir el enlace, siempre sujetos a los permisos del usuario. La exportación CSV aplica los mismos filtros a todos los resultados, no solo a la página visible. Los selectores de filtros incluyen registros inactivos para consultar el historial. Los formularios de nuevas altas y entregas continúan ofreciendo únicamente registros activos.

## QR y etiquetas

Cada activo existente y nuevo tiene un `tracking_id` UUID único y estable. No cambia al editar, transferir, devolver o dar de baja el activo.

1. En la ficha, pulsa **Etiqueta QR** para ver una etiqueta individual.
2. En el inventario, marca uno o varios activos (hasta 100 por lote, entre páginas) y pulsa **Generar etiquetas QR**.
3. Descarga cada QR como PNG de 1024 px o imprime el lote desde el navegador. La hoja A4 usa tres columnas.
4. Escanea el código para abrir `/a/{tracking_id}`. Inicia sesión si corresponde. El sistema comprueba tu acceso, cambia a la empresa correcta y abre la ficha actualizada.

La ficha muestra responsable actual, fecha de entrega, área, ubicación, datos técnicos, estado, garantía, vida útil e historial según los permisos. El QR contiene solo la dirección; no incluye datos personales ni concede acceso por sí mismo. Un usuario de otra empresa no puede resolverlo. Las etiquetas impresas muestran la identificación y los datos disponibles al imprimir; la información actual siempre se consulta mediante el enlace.

## Escaneo desde otro dispositivo

`localhost` identifica el dispositivo que abre el enlace, no el servidor. Para que un teléfono pueda usar los códigos, configura una dirección estable y accesible **antes de imprimir**.

Ejemplo de red local en `.env` (sustituir la IP por la del servidor):

```dotenv
PUBLIC_APP_URL=http://192.168.1.20:3000
FRONTEND_BIND_ADDRESS=0.0.0.0
```

Después, ejecuta `docker compose up -d` y permite el puerto 3000 en el firewall de la red autorizada. El teléfono debe poder alcanzar ese servidor. La base de datos y el backend mantienen sus puertos ligados a la interfaz local.

Para un servidor con dominio, utiliza `PUBLIC_APP_URL=https://activos.empresa.com` y configura HTTPS mediante el reverse proxy. La superposición de producción mantiene el frontend ligado a 127.0.0.1:3000 incluso si el entorno de desarrollo habilitó acceso de red. No se publicaron puertos adicionales ni se cambió la configuración de red local automáticamente.

La pantalla de etiquetas permite comprobar o ajustar el origen del enlace. Se rechazan rutas, credenciales, consultas, fragmentos y protocolos distintos de HTTP/HTTPS. Si se cambia el dominio después de imprimir, hay que conservar una redirección desde el dominio anterior o regenerar las etiquetas.

## Migraciones y API

- `V2__organization_branding_and_tracking.sql`: tema/configuración/logo por empresa, UUID de seguimiento por activo e índices para historial.
- `V3__branding_resource_version.sql`: versión de recursos de marca. Ninguna migración aplicada fue modificada.

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/organizations/{org}/branding` | Miembro autorizado o maestro |
| GET | `/api/v1/organizations/{org}/branding/logo` | Miembro autorizado o maestro |
| GET, PUT | `/api/v1/system/organizations/{org}/branding` | Maestro |
| POST, DELETE | `/api/v1/system/organizations/{org}/branding/logo` | Maestro, CSRF |
| GET | `/api/v1/tracking/{tracking_id}` | Sesión y autorización sobre la empresa del activo |
| GET | `/api/v1/tracking-settings` | Sesión |

Parámetros adicionales del inventario/exportación: `brand`, `model`, `person`, `personScope=CURRENT|HISTORY|ANY`, `assignmentState=ASSIGNED|UNASSIGNED`, `supplierId`, `dateField=ACQUISITION|ASSIGNED|RETURNED|WARRANTY|EXPIRATION`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD`. Se mantienen los parámetros existentes. Para licencias próximas, `expiry=DIGITAL`; para garantías, `expiry=WARRANTY`.

La comprobación de navegador utiliza una empresa QA separada y la desactiva al terminar. Genera capturas desktop/móvil, descarga y decodifica el PNG con un lector QR independiente, comprueba la ficha después de transferir y produce un PDF de etiquetas como evidencia. Los archivos de prueba se guardan en `frontend/test-results/`, fuera de Git.
