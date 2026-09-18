# Osumi TPV Client — Documento de continuidad
**Versión 2.70 — 18 de septiembre de 2026**

## 1. Forma de trabajo — reglas obligatorias

Este proyecto se desarrolla de forma jerárquica: secciones principales → bloques → sub-bloques.

Reglas de trabajo acordadas:

- Repositorio principal: `osumionline/Osumi-TPV-Client`, rama `main`.
- El usuario desarrolla localmente, prueba los cambios y realiza commit/push.
- **Cada respuesta de desarrollo debe contener una sola unidad pequeña y autocontenida.**
- Es preferible dividir un bloque si con ello se reduce el riesgo.
- Antes de proponer código que dependa del estado actual, revisar `main` en GitHub.
- No asumir que existe una ruta, clase, contrato, helper o archivo: verificarlo primero.
- Si se pide crear un archivo nuevo, proporcionar siempre **el contenido completo**.
- Si se modifica un archivo existente con un cambio parcial:
  - indicar exactamente el bloque a localizar;
  - decir qué sustituir o dónde añadir;
  - incluir contexto suficiente para evitar ambigüedad.
- No proponer archivos o tests “para más adelante” si pertenecen a la unidad actual: o se hacen en ese bloque o no se plantean todavía.
- El usuario prueba cada unidad y confirma antes de avanzar.
- **Antes de cada nuevo bloque de desarrollo**, incluir:
  1. una lista breve de lo ya terminado, punto actual y lo pendiente;
  2. un solo párrafo corto explicando exactamente qué se hará en ese punto.
- **No abrir ni diseñar un apartado funcional nuevo hasta que el usuario explique primero qué quiere y cómo funcionaba en el TPV antiguo.**
- El usuario dirige el producto y la migración. No inventar funcionalidades por analogía.
- Todo método público nuevo debe llevar JSDoc. Si se toca una clase/interfaz y hay métodos públicos sin JSDoc, completarlos también.
- Angular moderno:
  - standalone;
  - zoneless;
  - signals;
  - `input()/output()`;
  - `inject()`;
  - `computed()`;
  - `@if/@for`;
  - Signal Forms.
- Evitar APIs Angular legacy. `viewChild()` signal es válido.
- Servicios propios Angular con `@Service()`.
- Tests Electron con Vitest imports; frontend admite globals.
- Batería completa habitual:
  ```bash
  npm test
  npm run build
  npm run test:electron
  npm run build:electron
  npm run lint
  ```
- Para pequeños cambios exclusivamente renderer se ha usado a veces:
  ```bash
  npm test
  npm run build
  npm run lint
  ```
- No crear migraciones antes de la primera versión estable salvo necesidad expresa.
- `DATABASE_SCHEMA_VERSION = 1`.

---

## 2. Entorno y estructura

### Repositorios
- Nuevo cliente: `https://github.com/osumionline/Osumi-TPV-Client`
- TPV antiguo UI: `https://github.com/osumionline/Osumi-TPV`
- TPV API antigua: `https://github.com/osumionline/TPV-API`
- SDK TicketBAI: `https://github.com/osumionline/ticketbaiws`

### Estado técnico
- Angular **22.1.7**
- Angular Material **22.1.7**
- Electron + TypeScript
- SQLite / TypeORM
- Secrets operacionales con Electron `safeStorage`

### Aliases renderer
- `@env/*`
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

### Redistribución de contratos / IPC
Las carpetas Electron se reorganizaron por dominio.

Ejemplos actuales:
- Empleados:
  - `electron/contracts/configuration/empleados/*`
  - `electron/ipc/configuration/register-empleados-ipc.ts`
- Printing:
  - `electron/contracts/configuration/printing/*`
  - `electron/ipc/configuration/register-printing-ipc.ts`
- Marcas/proveedores bajo `compras/...`
- Categorías bajo `articulos/categorias/...`
- Reservas bajo `ventas/reservas/...`

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
  - 17.4 Ajustes funcionalmente terminado ✅
    - 17.4.1 actualización segura de AppData ✅
    - 17.4.2 UI de ajustes generales ✅
    - 17.4.3 integraciones / secretos / logo / impresora ✅
    - limpieza técnica opcional de `integrations` todavía pendiente, no iniciar automáticamente
  - 17.5 Empleados — EN CURSO
    - 17.5.1a CRUD backend ✅
    - 17.5.1b política definitiva de contraseña + bridge CRUD ✅
    - 17.5.1c importación legacy sin contraseña ✅
    - 17.5.2 estructura de pantalla ✅
    - 17.5.3 pestaña Datos ✅
    - 17.5.4 catálogo + pestaña Permisos ✅
    - **siguiente bloque: 17.5.5 borrado + autogestión**
    - 17.5.6 regresión final pendiente
  - 17.6 Tipos de pago — no empezar sin explicación del usuario
  - demás apartados de Gestión — no abrir sin dirección del usuario
- 18 Caja — pendiente; no iniciar sin dirección del usuario
- 19 enforcement global de roles/permisos — pendiente
- TicketBAI 12C.9 pausado hasta respuesta/actualización de Berein.

Punto de continuidad actual en `main`:
- último commit relevante:  
  `cf6d77826e50e030c8e4036629d6b8178d549ca8` — **“Terminado Gestión 17.5.4c”**

---

# 4. Gestión — sesión y permisos

## Sesión temporal
`GestionSessionService` mantiene:
- `empleadoId`
- `authenticatedAt`
- `expiresAt`

Duración fija: **10 minutos desde login**.

Reglas:
- no se renueva por actividad;
- no existe timer que expulse mientras la página está abierta;
- se valida al entrar/reentrar en páginas protegidas;
- “Cambiar empleado” limpia la sesión inmediatamente.

El empleado efectivo se resuelve desde `EmpleadosService` usando el id; la sesión no mantiene una copia completa.

## Guard
`gestionPermissionGuard`:
1. exige sesión activa;
2. obtiene `empleadoId`;
3. resuelve el empleado desde `EmpleadosService`;
4. si ya no existe, hace logout;
5. comprueba permisos requeridos;
6. si no tiene acceso, redirige a `/gestion`.

## Permisos de Gestión
- 18 Ajustes
- 19 Tipos de pago
- 20 Crear empleados
- 21 Modificar datos de empleados
- 22 Borrar empleados
- 23 Modificar permisos de empleados
- 24 Consultar estadísticas de empleados
- 25 Copias de seguridad

Constantes compartidas:
`electron/contracts/configuration/empleados/gestion-permissions.constants.ts`

```ts
export const GESTION_PERMISSIONS = {
  SETTINGS: 18,
  PAYMENT_TYPES: 19,
  EMPLOYEES_CREATE: 20,
  EMPLOYEES_UPDATE: 21,
  EMPLOYEES_DELETE: 22,
  EMPLOYEES_PERMISSIONS: 23,
  EMPLOYEES_STATISTICS: 24,
  BACKUPS: 25,
} as const;

export const GESTION_EMPLOYEES_PERMISSIONS: readonly number[] = [
  GESTION_PERMISSIONS.EMPLOYEES_CREATE,
  GESTION_PERMISSIONS.EMPLOYEES_UPDATE,
  GESTION_PERMISSIONS.EMPLOYEES_DELETE,
  GESTION_PERMISSIONS.EMPLOYEES_PERMISSIONS,
  GESTION_PERMISSIONS.EMPLOYEES_STATISTICS,
];
```

Admin tiene bypass mediante `hasPerm()` / `hasAnyPerm()`.

---

# 5. Ajustes — estado actual

## AppData público
`AppData` no contiene secretos.

Contiene configuración pública de:
- negocio;
- tienda online;
- SMTP;
- TicketBAI;
- fiscalidad;
- opciones generales.

## Secrets
`InstallationSecretsData`:
- `secretApi`
- `backupApiKey`
- `emailSmtpPass`
- `ticketBaiToken`

Persistencia:
- Electron `safeStorage`
- nunca volver a `app_data.json`

Semántica:
- `null` = conservar el existente;
- string no vacío = sustituir;
- desactivar una integración limpia el secreto correspondiente.

## Revelación controlada
Revelables:
- `secretApi`
- `backupApiKey`
- `ticketBaiToken`

No revelable:
- `emailSmtpPass`

La revelación:
- usa allowlist;
- valida sender IPC;
- devuelve un solo secreto;
- requiere confirmación en UI;
- no mete secretos en AppData, localStorage, signals globales ni logs.

## Logo
- `osumi://assets/logo`
- reemplazo y previsualización
- backend valida JPG/PNG/WebP
- máx. 5 MB
- máx. 4096 px
- conversión WebP
- escritura atómica
- cache bust `?v=<timestamp>`

## Impresora
Preferencia local:
`PrintingSettings.ticketPrinterDeviceName`

No pertenece a AppData ni a `InstallationCommand`.

Está implementada:
- en Ajustes;
- en Nueva instalación.

La desaparición de la impresora no invalida instalación ni otros ajustes.

---

# 6. Empleados — infraestructura definitiva

## Contrato público
`electron/contracts/configuration/empleados/empleado.interface.ts`

Campos:
- `id`
- `publicId`
- `nombre`
- `hasPassword`
- `color`
- `admin`
- `permisos`

`hasPassword` sigue siendo información pública de estado; nunca se expone contraseña ni hash.

## Comandos CRUD
`CrearEmpleadoCommand`:
- `nombre`
- `password` obligatorio
- `color`
- `permisos`

`ActualizarEmpleadoCommand`:
- `nombre`
- `password: string | null`
- `color`
- `permisos`

Semántica:
- alta: contraseña obligatoria;
- update:
  - `password = null` → conservar;
  - string no vacío → sustituir;
- no existe operación de quitar contraseña.

## Backend
`EmpleadosService` backend:
- `getAll()`
- `create()`
- `update()`
- `deactivate()`
- `authenticate()`

Política:
- todos los empleados nuevos tienen contraseña;
- scrypt como algoritmo actual;
- bcrypt legacy aceptado en login;
- login bcrypt correcto migra transparentemente a scrypt;
- nombres activos únicos case-insensitive;
- color validado `#RRGGBB`;
- permisos enteros 1–25, normalizados, sin duplicados;
- altas CRUD normales con `admin = false`;
- baja lógica;
- no se puede eliminar el último administrador activo.

## Renderer
`EmpleadosService` renderer expone:
- `empleados`
- `loaded`
- `empleadoDefecto`
- `load()`
- `reload()`
- `clear()`
- `authenticate()`
- `create()`
- `update()`
- `deactivate()`
- `findById()`
- `findByPublicId()`

`create()` / `update()` hacen upsert inmediato del empleado en memoria.  
`deactivate()` lo elimina del signal en memoria.

La pantalla de Empleados trabaja sobre esta lista; no consulta DB al filtrar/seleccionar.

---

# 7. Empleados — importación legacy sin contraseña

Regla definitiva:
- empleado legacy con bcrypt válido → se preserva como `bcrypt_legacy`;
- empleado legacy sin contraseña utilizable → se asigna contraseña en claro **`123456`** durante importación y se hashea con scrypt;
- la importación continúa normalmente;
- se contabiliza `defaultedEmployeePasswords`;
- el warning final es específico y avisa de la contraseña asignada.

Los empleados activos legacy también reciben permiso sintético **25** para mantener compatibilidad con Copias de seguridad:
- solo activos;
- no duplicar;
- no contar como fila de origen.

`AutenticarEmpleadoResult` conserva `password_unavailable` por compatibilidad con bases ya importadas por versiones anteriores; no eliminarlo casualmente.

Commits relevantes:
- `d7c0ae32d6a448aa44634fd96aad99cdce43a8f4` — hash de contraseña por defecto
- `8807361325473084ca8b262122fcd0fc354afc5d` — warning final específico

---

# 8. Empleados — estructura de pantalla terminada

Ruta/página:
`src/app/modules/gestion/pages/management-employees/`

## Columna izquierda
- buscador por nombre;
- listado de empleados desde memoria;
- orden alfabético español;
- cada empleado usa su color;
- indicador de administrador;
- botón “Nuevo empleado” en la parte inferior;
- botón visible solo con permiso 20 o admin.

## Área principal
Estado inicial:
- “Elige un empleado de la lista”.

Al seleccionar o crear:
- cabecera con avatar/color;
- pestaña `DATOS`;
- pestaña `PERMISOS` cuando el empleado autenticado puede gestionar permisos.

Responsive ya implementado.

Commits:
- `77eb6114a967c72d669b7b18c4cf0f9ca0c71d09` — 17.5.2a
- `495b7fd3ae2a2db0714d2d7c230837c9496f2ba9` — 17.5.2b

---

# 9. Empleados — pestaña Datos terminada

Archivos principales:
- `src/app/model/empleados/empleado-data-form.model.ts`
- `src/app/model/empleados/empleado-data-form.initial-value.ts`
- `src/app/model/empleados/empleado-data-form.schema.ts`

Campos:
- nombre
- contraseña
- confirmar contraseña
- color

## Validación
Nombre:
- `required()` real de Signal Forms para que Angular Material muestre el `*`;
- trim no vacío;
- máximo 100 caracteres.

Contraseña:
- alta → obligatoria;
- edición → vacía conserva;
- si una de contraseña/confirmación se rellena, la otra es obligatoria;
- ambas deben coincidir.

Color:
- `#RRGGBB`.

## Signal Forms
Importante:
- `form()` necesita injection context en tests aislados.
- `value.set()` programático no marca `dirty`; usar `markAsDirty()` en tests cuando se quiere simularlo explícitamente.
- `FieldState.reset(value)` limpia valor + `dirty/touched`.

## Permiso 21
Datos editables:
- alta: mediante permiso 20;
- edición: permiso 21;
- admin bypass.

Signal Forms gestiona `readonly()` / `disabled()` desde el schema; no usar `[readonly]` o `[disabled]` manualmente en nodos con `[formField]`.

Nombre / contraseñas:
- `readonly`

Color:
- `disabled`

## Guardar / Cancelar
Guardar:
- alta → `EmpleadosService.create()`;
- edición → `EmpleadosService.update()`;
- contraseña vacía en edición → `null`;
- tras guardar se selecciona el empleado retornado y se resetea el form.

Cancelar:
- alta → abandona modo creación;
- edición → restaura snapshot actual persistido;
- limpia también permisos.

Commits:
- `c2576517a67b6007bc8ffb62fd389fe1459159a8` — 17.5.3a
- `19ab5cd80543dd79d16db9ba9a83127adbf328da` — 17.5.3b final
- `95f5ce8183fc90ad89ca65975643b2fc4b0d6135` — 17.5.3c

---

# 10. Empleados — detalle visual de formularios

`src/styles/forms.scss` aplica globalmente:

```scss
mat-form-field {
  background-color: var(--color-white);
}
```

Eso pintaba también la zona reservada para hints/errores.

La excepción específica de Empleados es:

```scss
.employee-form {
  mat-form-field {
    background-color: transparent;
  }

  .mat-mdc-text-field-wrapper {
    background-color: var(--color-white);
  }
}
```

Resultado:
- cuerpo visual del campo blanco;
- subscript/hint transparente;
- se integra con el fondo del panel.

Es un ajuste localizado solo a `.employee-form`.

---

# 11. Empleados — catálogo de permisos terminado

Archivo:
`src/app/constants/empleado-permissions.constants.ts`

Define:
- `EmpleadoPermissionDefinition`
- `EmpleadoPermissionGroup`
- `EMPLEADO_PERMISSION_GROUPS`

Los permisos 1–24 conservan nombres y descripciones del TPV antiguo.  
El permiso 25 es nuevo para Copias de seguridad.

Grupos:
- Ventas
- Marcas
- Proveedores
- Artículos
- Clientes
- Gestión
- Empleados
- Copias de seguridad

Catálogo:

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
18. Modificar ajustes generales de la aplicación.  
19. Modificar tipos de pago.

## Empleados
20. Crear nuevos empleados.  
21. Modificar datos de un empleado.  
22. Borrar un empleado.  
23. Modificar permisos de un empleado.  
24. Consultar estadísticas de un empleado.

## Copias de seguridad
25. Gestionar copias de seguridad.

El catálogo tiene tests que comprueban:
- ids 1–25 exactamente una vez;
- nombre/descripción no vacíos;
- 23 en Empleados;
- 25 en Copias.

Commit:
`bafe7c11492cd6af88e2ef8b4ce22f0d9bdca325`

---

# 12. Empleados — pestaña Permisos terminada

## Visibilidad
La pestaña `PERMISOS` aparece si el empleado autenticado tiene permiso 23 o es admin.

## Empleado normal
- grupos del catálogo;
- checkbox por permiso;
- tooltip con descripción;
- estado cargado desde `empleado.permisos`.

## Empleado administrador seleccionado
- pestaña visible;
- banner **“Usuario administrador”**;
- los 25 permisos aparecen marcados;
- todos los checkbox deshabilitados;
- tooltips siguen funcionando;
- no se escriben filas artificiales 1–25 en DB;
- el bypass real sigue en `hasPerm()/hasAnyPerm()`.

## Nuevo empleado
- empieza sin permisos;
- si quien crea tiene 23, puede asignarlos antes de guardar;
- si no tiene 23, se crea con `permisos: []`.

Commit UI lectura:
`8b540bfaae4beae1ce97b27ce081d9119e8d1be6`

---

# 13. Empleados — separación estricta de permisos 21 y 23

Esta es una regla importante de seguridad.

## Permiso 21
Permite modificar:
- nombre
- contraseña
- color

No permite modificar permisos.

## Permiso 23
Permite modificar:
- permisos del empleado

No permite modificar nombre, contraseña ni color.

La lógica de guardado no confía solo en controles deshabilitados.

En edición:
- sin 21 → se reenvían nombre/color originales y `password: null`;
- sin 23 → se reenvían permisos originales;
- con 21 y no 23 → puede guardar Datos y conserva permisos;
- con 23 y no 21 → puede guardar Permisos y conserva Datos;
- con ambos → puede guardar ambos;
- sin cambios autorizados reales → no se llama a `update()`.

Se usa:
- `canEditEmpleadoPermissions`
- `empleadoPermissionsDirty`
- `hasEmpleadoDataChanges()`

`empleadoPermissionsDirty` compara listas normalizadas:
- sin duplicados;
- orden ascendente.

Administradores seleccionados:
- nunca permiten edición de sus checkboxes.

Esto está cubierto por tests de fronteras 21/23.

---

# 14. Empleados — feedback de guardado

Añadido al final de 17.5.4c para evitar que un guardado rápido resulte ambiguo.

Se reutiliza el patrón ya existente en Artículos:
- **no se usa `MatSnackBar`**;
- mensaje inline en el pie junto a Cancelar/Guardar;
- texto:
  **“Empleado guardado correctamente”**
- `role="status"`
- `aria-live="polite"`
- color verde;
- desaparece automáticamente a los **4 segundos**.

Estado:
- `saveSuccessful`
- `saveFeedbackTimeoutId`

Helpers privados:
- `showSaveFeedback()`
- `clearSaveFeedback()`

Se limpia al:
- cambiar de empleado;
- iniciar un alta;
- cancelar;
- iniciar un nuevo guardado.

Commit final actual:
`cf6d77826e50e030c8e4036629d6b8178d549ca8`

---

# 15. Empleados — commits relevantes

Secuencia útil para reconstruir contexto:

- `8d7fc3a59c132591876405a1dd6e02a664b468ab` — 17.5.1b corregido
- `d7c0ae32d6a448aa44634fd96aad99cdce43a8f4` — 17.5.1c.1
- `8807361325473084ca8b262122fcd0fc354afc5d` — 17.5.1c.2
- `77eb6114a967c72d669b7b18c4cf0f9ca0c71d09` — 17.5.2a
- `495b7fd3ae2a2db0714d2d7c230837c9496f2ba9` — 17.5.2b
- `c2576517a67b6007bc8ffb62fd389fe1459159a8` — 17.5.3a
- `19ab5cd80543dd79d16db9ba9a83127adbf328da` — 17.5.3b final
- `95f5ce8183fc90ad89ca65975643b2fc4b0d6135` — 17.5.3c
- `bafe7c11492cd6af88e2ef8b4ce22f0d9bdca325` — 17.5.4a
- `8b540bfaae4beae1ce97b27ce081d9119e8d1be6` — 17.5.4b
- `40294dae1a6887fcab1cfc0e70ace7bfa7fd8797` — 17.5.4c base
- `cf6d77826e50e030c8e4036629d6b8178d549ca8` — 17.5.4c final con feedback de guardado

---

# 16. Siguiente bloque exacto — 17.5.5

**No empezar otro apartado de Gestión. El siguiente trabajo es todavía Empleados.**

## 17.5.5 — borrado + autogestión

Requisitos ya definidos:

### Eliminar
- botón de eliminar en la zona inferior izquierda;
- visible/habilitado solo con permiso 22 o admin;
- **nunca permitir que el empleado autenticado se elimine a sí mismo**;
- solicitar confirmación;
- usar `EmpleadosService.deactivate()`;
- baja lógica backend ya implementada;
- actualizar lista en memoria;
- protección backend del último administrador ya existe.

### Autogestión
El empleado autenticado puede:
- editar sus propios Datos si tiene 21;
- editar sus propios Permisos si tiene 23.

Después de guardar cambios sobre sí mismo:
1. `EmpleadosService.update()` actualiza inmediatamente el empleado del signal;
2. comprobar si conserva algún permiso de `GESTION_EMPLOYEES_PERMISSIONS` (20–24);
3. si pierde todos 20–24:
   - navegar a `/gestion`;
   - **no hace falta cerrar la sesión temporal**.

Motivo:
el guard y el resto de UI resolverán el empleado actualizado desde `EmpleadosService`.

### No implementar todavía
- estadísticas de empleado;
- cualquier comportamiento nuevo del permiso 24.

El usuario explicará ese apartado cuando corresponda.

---

# 17. 17.5.6 — regresión pendiente

Después de 17.5.5 revisar, como mínimo:

- alta;
- edición;
- cambio de contraseña;
- conservación de contraseña;
- contraseña obligatoria;
- búsqueda;
- selección;
- colores;
- Guardar/Cancelar;
- feedback de guardado;
- permisos;
- tooltips;
- administrador;
- 21 sin 23;
- 23 sin 21;
- combinaciones 20–24;
- autogestión;
- pérdida de acceso 20–24;
- autoborrado bloqueado;
- baja lógica;
- último administrador;
- importación legacy `123456`;
- warning final de importación;
- permiso sintético 25 legacy;
- actualización de memoria;
- reentrada mediante guard;
- batería completa de tests/build/lint.

---

# 18. Ajustes — pequeña deuda técnica deliberadamente pendiente

`ConfigurationUpdateCommand.integrations` sigue opcional por compatibilidad temporal de 17.4.3.

Como la UI definitiva ya lo envía siempre, se podría hacer en un commit separado:
- hacerlo obligatorio;
- simplificar validator;
- simplificar `ConfigurationService`;
- eliminar ramas `integrations === undefined`.

No mezclar esta limpieza con Empleados ni iniciarla sin que el usuario lo decida.

---

# 19. TicketBAI / SDK

SDK:
- paquete `@osumi/ticketbaiws`
- versión publicada: **1.0.1**
- ESM only
- tests OK
- README general + documentación detallada por dominios en `docs/`

Las inconsistencias de documentación de Berein ya fueron reportadas.

Bloque TicketBAI 12C.9:
- pausado;
- no reabrir hasta respuesta o actualización de Berein.

---

# 20. Exportación legacy `.otpv`

El exportador de la API antigua incluye:
- dump MariaDB completo;
- `app_data.json`;
- logo;
- fotos de artículos;
- marcas;
- proveedores;
- iconos de tipos de pago;
- PDFs de pedidos;
- configuración plugin SMTP;
- configuración plugin TicketBAI.

Si un plugin no existe → `null`.

Secretos de origen:
- `secretApi` y `backupApiKey`: antiguo `app_data.json`;
- TicketBAI token: antiguo `Config.json`;
- SMTP password: antiguo plugin config.

En el cliente nuevo se migran a `safeStorage`.

La impresora no se exporta: es configuración local de máquina.

---

# 21. Regla de dirección de desarrollo

Especialmente para módulos heredados del TPV antiguo:

1. el usuario explica primero comportamiento antiguo y objetivo nuevo;
2. se aclaran dudas;
3. se acuerda comportamiento;
4. se define plan;
5. solo entonces se implementa.

No extrapolar funcionalidades por similitud.

En el momento de este documento:
- el comportamiento funcional de **Empleados** está suficientemente definido para completar 17.5.5 y 17.5.6;
- **no** hace falta volver a preguntar por la lógica de Empleados ya acordada;
- sí hay que esperar explicación del usuario antes de abrir nuevas áreas posteriores.
