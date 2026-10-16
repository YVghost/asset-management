# Administrador maestro del sistema

Una cuenta con `system_admin=true` tiene acceso global. Puede crear y editar organizaciones, activar/desactivar empresas, consultar todas las cuentas, crear usuarios normales o maestros, cambiar su nombre, restablecer contraseñas, activar/desactivar cuentas y conceder/revocar roles por empresa.

El menú **Administración maestra** está disponible en `/system`, solo para cuentas maestras. El servidor vuelve a comprobar el permiso en cada operación. No depende de un rol recibido desde el navegador.

## Cuenta independiente

En `.env`:

```dotenv
MASTER_ENABLED=true
MASTER_EMAIL=master@ams.local
MASTER_PASSWORD=
```

Completa una contraseña propia de al menos 12 caracteres y máximo 72 bytes UTF-8. Ejecuta `docker compose up --build -d`. Este aprovisionamiento también funciona en una base existente sin tocar inventarios. Si el correo ya pertenece a una cuenta normal, se rechaza el arranque en lugar de promoverla silenciosamente. Una vez creada la cuenta, los reinicios no cambian su contraseña ni reactivan una cuenta deshabilitada. Puedes desactivar `MASTER_ENABLED` y retirar la contraseña de aprovisionamiento tras el primer inicio.

La cuenta maestra no necesita membresías. Puede iniciar sesión incluso cuando todavía no hay organizaciones, crear la primera empresa y empezar a administrarla. Para una instalación nueva, puede sustituir el mecanismo `BOOTSTRAP_ENABLED`; no es necesario activar ambos.

Las cuentas que ya eran administradoras del sistema, incluida la cuenta demo original, conservan su permiso y usan el mismo panel. El usuario maestro independiente no elimina ni reemplaza esas cuentas. Desde el panel se puede retirar el permiso maestro a otra cuenta, siempre que quede al menos un maestro activo. No se permite desactivar ni degradar la propia cuenta.

## Administración de empresas y usuarios

1. Inicia sesión con `MASTER_EMAIL` y `MASTER_PASSWORD`.
2. Abre **Administración maestra → Organizaciones → Nueva organización**.
3. En **Usuarios del sistema**, crea una cuenta dejando desmarcada la casilla de administrador maestro si pertenece a una empresa cliente.
4. Pulsa **Empresas y permisos** sobre ese usuario, selecciona su empresa y el rol correspondiente.
5. La cuenta normal solo verá las empresas autorizadas. No podrá entrar en `/system` ni usar la API global. El maestro puede cambiar de empresa con el selector lateral.
6. Para cambiar un rol, guarda nuevamente el acceso a esa empresa. Para quitarlo, pulsa **Revocar**.

Desactivar una organización bloquea las operaciones sobre su inventario y la retira del selector; conserva sus datos. Desactivar una cuenta bloquea sus siguientes solicitudes, aunque conserve una cookie de sesión. El correo de una cuenta existente es inmutable para mantener la identidad de las sesiones. El cambio de contraseña modifica el acceso futuro; la revocación de sesiones ya abiertas tras un cambio de contraseña queda pendiente.

## API global

Todos los endpoints requieren sesión maestra y CSRF en operaciones de escritura:

| Método | Ruta |
| --- | --- |
| GET, POST | `/api/v1/system/organizations` |
| PUT | `/api/v1/system/organizations/{id}` |
| GET, POST | `/api/v1/system/users` |
| PUT | `/api/v1/system/users/{id}` |
| GET, POST | `/api/v1/system/users/{id}/memberships` |
| DELETE | `/api/v1/system/users/{id}/memberships/{organizationId}` |

Los listados aceptan `search`, `page` y `size` (máximo 100). No se devuelven hashes ni contraseñas.

No se modificó el esquema: se reutiliza `app_users.system_admin` y las membresías existentes. El panel global no aplica bajas físicas de empresas o usuarios.
