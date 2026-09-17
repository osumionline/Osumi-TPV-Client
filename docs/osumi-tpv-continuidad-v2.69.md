# Osumi TPV Client — Documento de continuidad
**Versión 2.69 — 17 de septiembre de 2026**

## 1. Forma de trabajo

- Repositorio principal: `osumionline/Osumi-TPV-Client`, rama `main`.
- El usuario desarrolla localmente, prueba los cambios y realiza commit/push.
- Trabajar en bloques medianos y autocontenidos.
- No abrir ni diseñar un apartado funcional nuevo hasta que el usuario explique primero qué comportamiento necesita, especialmente cuando exista equivalencia en el TPV antiguo.
- Antes de proponer cambios que dependan del estado actual, revisar `main` mediante GitHub.
- No saltar varios bloques seguidos: proponer, el usuario aplica/prueba, y después continuar.
- Todo método público nuevo debe llevar JSDoc, incluidos métodos de interfaces. Si se toca una clase/interfaz y hay otros métodos públicos sin JSDoc, completarlos también.
- Angular moderno: standalone, zoneless, signals, `input()/output()`, `inject()`, `computed()`, `@if/@for`, Signal Forms. Evitar APIs legacy.
- Servicios Angular propios con `@Service()`.
- Tests Electron con Vitest imports; frontend permite globals.
- Batería completa habitual:
  ```bash
  npm test
  npm run build
  npm run test:electron
  npm run build:electron
  npm run lint
  ```
- No crear migraciones antes de la primera versión estable salvo necesidad expresa; `DATABASE_SCHEMA_VERSION = 1`.

---

## 2. Entorno y estructura

### Repositorios relacionados
- Nuevo cliente: `https://github.com/osumionline/Osumi-TPV-Client`
- TPV antiguo UI: `https://github.com/osumionline/Osumi-TPV`
- TPV API antigua: `https://github.com/osumionline/TPV-API`
- SDK TicketBAI: `https://github.com/osumionline/ticketbaiws`

### Angular / Electron
- Angular 22.1.x en el cliente actual.
- Electron + TypeScript.
- SQLite/TypeORM para la base local.
- Secrets operacionales almacenados con Electron `safeStorage`.

### Aliases renderer
- `@app/*`
- `@constants/*`
- `@guards/*`
- `@interfaces/*`
- `@model/*`
- `@modules/*`
- `@pipes/*`
- `@services/*`
- `@utils/*`
- `@desktop-contracts/*`

### Aliases Electron
- `@backend/*`
- `@desktop-contracts/*`
- `@infrastructure/*`
- `@ipc/*`

### Redistribución reciente
Se reorganizaron las carpetas `electron/contracts` y `electron/ipc` por dominios.

Ejemplos:
- Empleados: `electron/contracts/configuration/empleados/*`
- Printing: `electron/contracts/configuration/printing/*`
- IPC de configuración/empleados/printing bajo `electron/ipc/configuration/*`
- Otros contratos agrupados por `articulos`, `compras`, `clientes`, `ventas`, etc.

No asumir rutas antiguas: revisar `main`.

---

## 3. Estado general de hitos

- 16 Compras ✅
- 17 Gestión:
  - 17.1 Shell + navegación + rutas ✅
  - 17.2 autenticación backend de empleados ✅
  - 17.3 portada + sesión temporal + permisos ✅
    - 17.3.1 sesión / semántica admin ✅
    - 17.3.2 selector + modal contraseña + login/logout ✅
    - 17.3.3 permisos UI + guards ✅
    - 17.3.4 permiso 25 de backups + compatibilidad legacy ✅
  - 17.4 Ajustes ✅
    - 17.4.1 actualización segura de AppData ✅
    - 17.4.2 UI de ajustes generales ✅
    - 17.4.3 integraciones / secretos / logo / impresora ✅
  - 17.5 Empleados — EN CURSO
    - 17.5.1a backend CRUD base ✅ implementado, tests verdes, push hecho
    - comportamiento funcional de la pantalla ya definido
    - siguiente bloque: adaptar política definitiva de contraseña + bridge CRUD
  - 17.6 Tipos de pago — pendiente
  - 17.7 Copias de seguridad / TPV Backup — pendiente
  - 17.8 regresión — pendiente
- 18 Caja — pendiente
- 19 enforcement global de roles/permisos — pendiente
- TicketBAI 12C.9 pausado hasta respuesta/actualización de Berein.

---

# 4. Gestión — sesión y permisos

## Sesión temporal
`GestionSessionService` mantiene exclusivamente:
- `empleadoId`
- `authenticatedAt`
- `expiresAt`

Duración fija: 10 minutos desde login.
- No se renueva por actividad.
- No hay timer que expulse mientras la página está abierta.
- Se valida al entrar/reentrar en páginas protegidas.
- “Cambiar empleado” limpia la sesión inmediatamente.

El empleado efectivo se resuelve desde `EmpleadosService` por su id; la sesión no guarda una copia completa del empleado.

## Guard
`gestionPermissionGuard`:
1. exige sesión activa;
2. obtiene `empleadoId`;
3. resuelve el empleado desde `EmpleadosService`;
4. si el empleado ya no existe, hace logout;
5. comprueba los permisos requeridos;
6. si no tiene acceso, redirige a `/gestion`.

Esto es importante para Empleados: al guardar cambios sobre el propio empleado basta actualizar la lista en memoria y comprobar si conserva algún permiso 20–24. Si los pierde, se navega a `/gestion`.

## Permisos de Gestión actuales
- 18 Ajustes
- 19 Tipos de pago
- 20 Crear empleados
- 21 Modificar empleados
- 22 Borrar empleados
- 23 Modificar permisos de empleados
- 24 Consultar estadísticas de empleados
- 25 Copias de seguridad

`GESTION_EMPLOYEES_PERMISSIONS = [20, 21, 22, 23, 24]`.

Admin tiene bypass de permisos mediante `hasPerm/hasAnyPerm`.

---

# 5. Ajustes — estado definitivo

## 17.4.1 actualización segura
`ConfigurationService.update()` permite actualizar datos públicos sin mezclar secretos en `AppData`.

Se preservan correctamente:
- `schemaVersion`
- `installedAt`
- metadatos que no pertenecen a la pantalla
- secretos
- demás estado no editable desde Ajustes

## 17.4.2 UI general
`ManagementSettingsComponent` usa Signal Forms.

Incluye:
- negocio
- redes/web
- frases de ticket
- plantillas email del ticket
- fiscalidad
- opciones
- IVA / RE / márgenes

Se corrigió además un caso de compatibilidad:
- al inicializar IVA estándar 4/10/21 se conserva el RE existente de `AppData.reList`;
- solo se usa el RE estándar si no había asociación persistida.

---

# 6. Integraciones y secretos

## AppData público
`AppData` NO contiene secretos.

Contiene, entre otros:
- `ventaOnline`
- `urlApi`
- configuración pública SMTP
- configuración pública TicketBAI
- opciones generales

## Secrets
`InstallationSecretsData`:
- `secretApi`
- `backupApiKey`
- `emailSmtpPass`
- `ticketBaiToken`

Persistencia:
- Electron `safeStorage`
- nunca volver a `app_data.json`

## Semántica de actualización
Para secretos editables:
- `null` = conservar el existente
- string no vacío = reemplazar
- desactivar una integración limpia su secreto correspondiente

En particular:
- tienda online off → `secretApi = ''`
- SMTP off → `emailSmtpPass = null`
- TicketBAI off → `ticketBaiToken = null`
- `backupApiKey: null` → conservar
- `backupApiKey: "..."` → sustituir

## Revelación controlada
Secretos revelables:
- `secretApi`
- `backupApiKey`
- `ticketBaiToken`

NO revelable:
- `emailSmtpPass`

Flujo:
- API backend acepta solo allowlist runtime
- `assertTrustedSender` en IPC
- solo devuelve el secreto solicitado
- nunca todos a la vez
- resultado solo vive en el componente/formulario
- nunca se mete en `AppDataService`, localStorage, signals globales ni logs

UI:
- ojo interior `matSuffix`: alterna `password/text` sobre el valor actualmente escrito
- ojo rojo exterior: carga el secreto persistido
- ojo rojo requiere confirmación con `DialogService.confirm`
- al cargar el secreto se mantiene inicialmente oculto
- después desaparece el ojo rojo durante la vida de ese componente
- al salir/reentrar el campo vuelve vacío y se exige nueva confirmación
- SMTP solo tiene ojo interior, nunca ojo rojo

---

# 7. Logo

Ajustes permite:
- mostrar logo actual desde `osumi://assets/logo`
- seleccionar uno nuevo
- previsualizar
- cancelar selección
- guardar sustitución

No hay opción de eliminar logo.

Tras guardar:
- se refresca la URL con `?v=<timestamp>` para evitar caché de Chromium.

Almacenamiento:
- logo operacional `assets/logo.webp`
- validación/transformación en backend
- máximo 5 MB
- máximo 4096 px
- JPG/PNG/WebP
- conversión a WebP
- escritura atómica

---

# 8. Impresora de tickets

## Arquitectura
La impresora NO pertenece a `AppData` ni a `InstallationCommand`.

Es una preferencia local de la máquina:
- `PrintingSettings.ticketPrinterDeviceName`

Contratos ya existentes:
- `getPrinters()`
- `getSettings()`
- `setTicketPrinterDeviceName()`

Cada impresora expone:
- `deviceName`
- `displayName`
- `description`

El backend valida que el `deviceName` seleccionado exista.

## Ajustes
Se añadió una sección “Impresora de tickets”:
- listado de impresoras disponibles
- selección persistida
- “Sin impresora seleccionada” → `null`
- botón actualizar lista
- si la impresora persistida no está disponible, se muestra como `— no disponible`
- no se borra silenciosamente la selección
- si falla solo el guardado de impresora, los demás ajustes siguen guardados y se muestra aviso

Servicio renderer:
`DesktopPrintingService`.

## Nueva instalación
También se añadió selector de impresora al paso final.

No forma parte del Signal Form ni de `InstallationCommand`.

Flujo final:
1. instalación principal correcta
2. intentar guardar impresora local
3. refrescar estado de aplicación
4. si impresora falla → aviso
5. entrar igualmente en `/ventas`

Una impresora desaparecida nunca convierte una instalación ya terminada en “fallida”.

---

# 9. Empleados — infraestructura existente

## Carga
Los empleados se cargan al arranque y se mantienen en memoria en `EmpleadosService`.

El servicio renderer expone:
- `empleados` signal readonly
- `loaded`
- `empleadoDefecto`
- `load()`
- `reload()`
- `clear()`
- `authenticate()`
- `findById()`
- `findByPublicId()`

La pantalla de Empleados deberá trabajar sobre esta lista en memoria; no consultar la base de datos al filtrar o seleccionar.

## Autenticación
Backend:
- scrypt actual
- bcrypt legacy soportado
- si bcrypt es válido, se migra transparentemente a scrypt
- credenciales nunca se exponen al renderer

Existe `DISABLED_LEGACY_PASSWORD_HASH` como mecanismo interno de compatibilidad para empleados legacy que originalmente no tenían contraseña.

## Contrato público
`EmpleadoInterface`:
- `id`
- `publicId`
- `nombre`
- `hasPassword`
- `color`
- `admin`
- `permisos`

---

# 10. Empleados — 17.5.1a ya implementado

Se implementó un CRUD backend base y está subido a `main`.

## Contratos públicos creados
- `CrearEmpleadoCommand`
- `ActualizarEmpleadoCommand`

Actualmente incluyen:
- `nombre`
- `hasPassword`
- `password`
- `color`
- `permisos`

IMPORTANTE:
esta primera versión se implementó antes de cerrar la definición funcional y todavía permite empleados sin contraseña. En el siguiente bloque debe adaptarse a la política definitiva: en el nuevo TPV todos los empleados tendrán contraseña.

## Contratos internos
- `CrearEmpleadoRecordCommand`
- `ActualizarEmpleadoRecordCommand`

## EmpleadoRepository
Ahora tiene:
- `findAll()`
- `findById()`
- `existsActiveByName()`
- `countActiveAdmins()`
- `create()`
- `update()`
- `deactivate()`
- `findAuthenticationById()`
- `upgradeLegacyPassword()`

## EmpleadosService backend
Ahora tiene:
- `getAll()`
- `create()`
- `update()`
- `deactivate()`
- `authenticate()`

Validaciones actuales:
- nombre 1–100
- color `#RRGGBB`, normalizado a hexadecimal en mayúsculas sin `#` para persistencia
- permisos enteros 1–25, sin duplicados y ordenados
- nombres activos únicos case-insensitive
- nuevos empleados CRUD se crean `admin = false`
- no se permite eliminar el último administrador activo
- borrado lógico

## TypeOrmEmpleadoRepository
Implementa:
- alta transaccional
- actualización transaccional
- sustitución transaccional de permisos
- baja lógica con `activo=0` + `deleted_at`
- elimina filas de `empleado_permiso` del empleado desactivado
- conserva `admin` en update
- crea empleados CRUD normales con `admin=0`

No se hizo migración de schema; las tablas actuales ya soportan el comportamiento.

## Tests
Se ampliaron tests de `EmpleadosService` y todo pasó:
- creación con contraseña
- creación sin contraseña (caso que será eliminado/adaptado)
- duplicados
- update conservando contraseña
- activación/cambio/eliminación de contraseña
- normalización de color y permisos
- protección del último admin
- empleado inexistente
- autenticación scrypt
- bcrypt legacy + migración

Usuario confirmó tests verdes y push realizado.

---

# 11. Empleados — comportamiento funcional definitivo

El usuario ha explicado el comportamiento del TPV antiguo y ha aportado capturas como referencia visual.

## Diseño general
La pantalla se divide en dos áreas.

### Columna lateral izquierda
- buscador por nombre
- listado de empleados
- cada empleado usa su color como fondo
- lista basada en los empleados ya cargados en memoria al arrancar
- botón “Añadir empleado” en la parte inferior

### Área principal
Estado inicial:
- mensaje tipo “Elige un empleado de la lista.”

Al seleccionar un empleado o crear uno:
- aparecen dos pestañas:
  - Datos
  - Permisos

La nueva pantalla debe conservar este concepto y adaptarlo al diseño actual de Gestión, sin necesidad de copiar píxel a píxel el TPV antiguo.

---

# 12. Pestaña Datos

Campos:
- nombre
- contraseña
- confirmar contraseña
- color

## Política definitiva de contraseña
En el nuevo TPV:
- todos los empleados deben tener contraseña;
- se elimina el antiguo checkbox “Empleado con contraseña”;
- un empleado nuevo siempre requiere contraseña y confirmación;
- no se podrá crear un empleado sin contraseña;
- no se podrá retirar la contraseña a un empleado existente.

## Edición
Al seleccionar un empleado existente:
- contraseña vacía
- confirmación vacía
- dejar ambas vacías = conservar contraseña actual
- introducir contraseña nueva + confirmación coincidente = sustituirla
- nunca se muestra la contraseña persistida ni ningún hash

## Empleados legacy sin contraseña
Al importar desde el TPV antiguo:
- si un empleado no tiene contraseña, se le asigna automáticamente:
  `123456`
- la importación continúa normalmente
- al finalizar se muestra un warning indicando que se han encontrado/importado empleados que no tenían contraseña y que se les ha asignado la contraseña por defecto `123456`

Este comportamiento sustituye la estrategia anterior de dejarlos con contraseña no disponible.

---

# 13. Pestaña Permisos

## Comportamiento normal
- listado agrupado de permisos
- checkbox por permiso
- marcar checkbox = conceder permiso
- desmarcar = retirar permiso
- cada permiso tendrá tooltip explicando su función

Se mantendrá la agrupación conceptual del TPV antiguo.

## Administradores
La pestaña `Permisos` permanece completamente accesible.

Al entrar en ella para un empleado administrador:
- se muestra en la parte superior un mensaje destacado:
  **Usuario administrador**
- se muestra el listado completo de permisos
- todos los permisos aparecen marcados
- todos los checkboxes aparecen deshabilitados
- cada permiso conserva su tooltip explicativo
- el administrador sigue teniendo bypass real de permisos mediante `hasPerm/hasAnyPerm`

Representación conceptual:

```text
DATOS | PERMISOS
        ---------

        [ Usuario administrador ]

Ventas
[X] Modificar importes, descuentos o descuentos directos.

...
```

No se oculta ni se deshabilita la pestaña completa; solo los controles de permisos.

---

# 14. Permisos de acceso a Empleados

Se mantienen los permisos definidos:

- 20 Crear empleados
- 21 Modificar datos de un empleado
- 22 Borrar empleado
- 23 Modificar permisos de un empleado
- 24 Consultar estadísticas de empleados

Comportamiento:
- botón “Añadir empleado” → requiere 20
- editar Datos → requiere 21
- botón Eliminar → requiere 22
- editar checks de Permisos → requiere 23
- estadísticas → 24, pero no se implementarán hasta que el usuario explique qué necesita

Admin tiene bypass.

---

# 15. Autogestión del empleado autenticado

El empleado que tiene abierta la sesión de Gestión:
- puede editar sus propios datos si tiene permiso 21;
- puede modificar sus propios permisos si tiene permiso 23;
- NO puede borrarse a sí mismo.

Después de guardar cambios sobre sí mismo:
1. se actualiza inmediatamente el empleado dentro del signal en memoria;
2. se comprueba si mantiene acceso al apartado Empleados mediante cualquiera de 20–24;
3. si ya no tiene ninguno:
   - se abandona la pantalla Empleados;
   - se navega a `/gestion`.

No es necesario cerrar automáticamente la sesión temporal: el guard utiliza el empleado actualizado desde `EmpleadosService`.

---

# 16. Catálogo legacy de permisos

## Ventas
1. Modificar importes, descuentos o descuentos directos.

## Marcas
2. Crear nuevas marcas.
3. Modificar datos de una marca.
4. Borrar una marca.
5. Consultar estadísticas de una marca.

## Proveedores
6. Crear nuevos proveedores.
7. Modificar datos de un proveedor.
8. Borrar un proveedor.
9. Consultar estadísticas de un proveedor.

## Artículos
10. Crear nuevos artículos.
11. Modificar datos de un artículo.
12. Borrar un artículo.
13. Consultar estadísticas de un artículo.
14. Modificar observaciones de un artículo.

## Clientes
15. Crear nuevos clientes.
16. Modificar datos de un cliente.
17. Borrar un cliente.

## Gestión
18. Modificar ajustes generales.
19. Modificar tipos de pago.

## Empleados
20. Crear empleados.
21. Modificar datos de un empleado.
22. Borrar un empleado.
23. Modificar permisos de un empleado.
24. Consultar estadísticas de empleados.

## Copias
25. Copias de seguridad.

Para la nueva UI se creará un catálogo compartido que incluya:
- id
- grupo
- nombre visible
- descripción/tooltip

---

# 17. Plan definitivo para terminar Empleados

## 17.5.1b — política de contraseña + bridge CRUD
Primero corregir el backend provisional de 17.5.1a:

- eliminar soporte funcional para crear empleados sin contraseña;
- eliminar soporte funcional para retirar contraseña;
- alta siempre exige contraseña;
- update:
  - `password = null` → conservar existente;
  - string no vacío → sustituir;
- adaptar contratos si `hasPassword` deja de ser necesario en comandos CRUD;
- adaptar tests;
- mantener `EmpleadoInterface.hasPassword` mientras siga siendo útil para compatibilidad/importación, si procede.

Después:
- ampliar `EmpleadosApi` con create/update/deactivate;
- añadir channels IPC;
- ampliar `register-empleados-ipc`;
- ampliar preload;
- ampliar `EmpleadosService` renderer;
- create/update/deactivate deben actualizar el signal en memoria.

No diseñar la pantalla hasta cerrar este bloque.

## 17.5.1c — adaptación de importación legacy sin contraseña
- detectar empleados legacy sin contraseña durante importación;
- asignar automáticamente `123456`;
- generar hash scrypt según el mecanismo actual de importación;
- no dejar `password_unavailable` para estos empleados importados;
- registrar warning de importación;
- mostrar warning al terminar indicando la contraseña temporal/default asignada.

Revisar la infraestructura real de importación antes de proponer código.

## 17.5.2 — estructura de pantalla
- sustituir placeholder `/gestion/empleados`;
- layout dos columnas;
- buscador sobre signal en memoria;
- listado coloreado;
- selección de empleado;
- estado inicial;
- botón Añadir condicionado por permiso 20;
- responsive;
- mantener estética actual de Gestión inspirándose en la estructura del TPV antiguo.

## 17.5.3 — pestaña Datos
- Signal Forms;
- nombre;
- contraseña;
- confirmar contraseña;
- color;
- sin checkbox “Empleado con contraseña”;
- alta: contraseña obligatoria;
- edición: vacía conserva contraseña;
- nueva contraseña requiere confirmación coincidente;
- controles habilitados/deshabilitados según permiso 21;
- guardar/cancelar.

## 17.5.4 — catálogo + pestaña Permisos
- catálogo compartido permisos 1–25;
- grupos equivalentes al TPV antiguo;
- checkbox por permiso;
- tooltip con descripción;
- edición solo con permiso 23;
- admin:
  - mensaje “Usuario administrador”;
  - pestaña accesible;
  - todos los checks marcados;
  - todos los checks deshabilitados;
  - tooltips siguen disponibles.

## 17.5.5 — borrado + autogestión
- botón eliminar solo con 22;
- nunca permitir autoborrado;
- mantener protección del último administrador;
- confirmación;
- baja lógica;
- actualizar lista en memoria;
- si se modifica el propio empleado y pierde todos 20–24:
  - navegar a `/gestion`.

## 17.5.6 — regresión
Cubrir:
- alta
- edición
- cambio de contraseña
- conservación de contraseña
- búsqueda
- selección
- colores
- permisos
- tooltips
- administrador
- combinaciones parciales 20–24
- autogestión
- autoborrado bloqueado
- baja lógica
- último administrador
- importación legacy con contraseña `123456`
- warning final de importación
- actualización de memoria
- reentrada mediante guard
- batería completa de tests/build/lint

No implementar estadísticas de empleado hasta que el usuario explique qué comportamiento desea.

---

# 18. Importación legacy — consideración nueva

Además de los datos ya migrados, el importador debe garantizar que ningún empleado llegue al nuevo TPV sin contraseña utilizable.

Regla definitiva:
- empleado legacy con contraseña → importar/migrar con el mecanismo ya existente;
- empleado legacy sin contraseña → asignar `123456`;
- al final de la importación → warning explícito.

Debe conservarse la compatibilidad con los usuarios actuales del TPV antiguo, pero el resultado final en el nuevo cliente debe cumplir la regla “todos los empleados tienen contraseña”.

---

# 19. Deuda técnica pequeña pendiente

`ConfigurationUpdateCommand.integrations` sigue opcional por compatibilidad temporal de 17.4.3.

Ahora que Ajustes definitivo siempre lo envía, se puede limpiar en un commit pequeño:
- hacerlo obligatorio;
- simplificar validator;
- simplificar `ConfigurationService`;
- eliminar ramas `integrations === undefined`.

No mezclar esta limpieza con decisiones funcionales de Empleados salvo que convenga como commit separado.

---

# 20. TicketBAI / SDK

SDK:
- `@osumi/ticketbaiws`
- versión publicada 1.0.1
- ESM only
- documentación por dominios
- tests OK

Las inconsistencias de documentación de Berein ya fueron reportadas.

Bloque TicketBAI 12C.9:
- pausado
- no reabrir hasta respuesta o actualización de Berein.

---

# 21. Exportación legacy `.otpv`

El exportador de la API antigua incluye:
- dump MariaDB completo
- `app_data.json`
- logo
- fotos artículos
- marcas
- proveedores
- iconos tipos de pago
- PDFs pedidos
- plugin SMTP
- plugin TicketBAI

Si plugin no existe → configuración `null`.

Secretos de origen:
- `secretApi` y `backupApiKey`: antiguo `app_data.json`
- TicketBAI token: antiguo `Config.json`
- SMTP password: antiguo plugin config

En el cliente nuevo se migran a safeStorage.

---

# 22. Regla de dirección de desarrollo

Especialmente para módulos heredados del TPV antiguo:

1. el usuario explica primero el comportamiento actual/antiguo y qué quiere conservar;
2. se plantean dudas;
3. se acuerda el comportamiento;
4. se define el plan;
5. solo entonces se implementa.

No inferir funcionalidades adicionales por similitud con el código antiguo.
